import {
  useCreate,
  useList,
  useOne,
  useTranslate,
  useWarnAboutChange,
  type HttpError,
} from "@refinedev/core";
import { Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RouteDialog,
  useRefineUnsavedChangesGuard,
} from "@/extensions/nocobase-route-surfaces";
import { useRouteSurfaceClose } from "@nocobase/portal-sdk/routing";

import {
  personName,
  tt,
  type RequestRecord,
  type RequestTypeRecord,
  type UserRef,
} from "../lib";
import { useContextualCloseTo } from "../route-surfaces";

const REQUEST_TYPES = ["Service request", "Incident"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const CATEGORIES = [
  "Hardware",
  "Software & licensing",
  "Access & identity",
  "Network & connectivity",
  "General IT support",
];

// Map an it_request_types.category (short form) onto a request category option.
const CATEGORY_FROM_TYPE: Record<string, string> = {
  Hardware: "Hardware",
  Software: "Software & licensing",
  Access: "Access & identity",
  Network: "Network & connectivity",
  Facilities: "General IT support",
};

type Values = Record<string, string>;

/* ------------------------------------------------------------------ */
/* AI assist classifier (ported from it-console)                       */
/* ------------------------------------------------------------------ */

function analyzeRequest(problem: string) {
  const text = problem.toLowerCase();
  const isAccess =
    /(password|login|sign in|account|access|permission|mfa|vpn|密码|登录|账户|帐号|账号|权限|访问|多因素|双重认证)/.test(text);
  const isHardware =
    /(laptop|computer|monitor|keyboard|mouse|headset|phone|printer|screen|battery|charger|笔记本|电脑|显示器|键盘|鼠标|耳机|手机|电话|打印机|屏幕|电池|充电器)/.test(
      text
    );
  const isSoftware =
    /(software|application|app|install|license|outlook|teams|browser|excel|word|软件|应用|安装|许可证|许可|浏览器)/.test(
      text
    );
  const isNetwork =
    /(wifi|wi-fi|network|internet|connection|vpn|slow|无线网|网络|互联网|连接|网速|卡顿)/.test(
      text
    );
  const priority =
    /(urgent|critical|down|outage|cannot work|can't work|blocked|security|紧急|严重|宕机|中断|无法工作|不能工作|阻塞|安全)/.test(
      text
    )
      ? "High"
      : /(soon|important|slow|intermittent|尽快|重要|缓慢|很慢|间歇)/.test(text)
        ? "Medium"
        : "Low";
  const category = isAccess
    ? "Access & identity"
    : isNetwork
      ? "Network & connectivity"
      : isHardware
        ? "Hardware"
        : isSoftware
          ? "Software & licensing"
          : "General IT support";
  const requestType =
    /(new|need|request|install|replacement|replace|upgrade|新建|需要|申请|安装|更换|替换|升级)/.test(
      text
    )
      ? "Service request"
      : "Incident";
  const resolution = isAccess
    ? {
        key: "it.requests.ai.resolution.access",
        fallback:
          "Confirm the affected account and access level, then reset credentials or review the requested permission.",
      }
    : isNetwork
      ? {
          key: "it.requests.ai.resolution.network",
          fallback:
            "Check the device connection and VPN status first, then collect network diagnostics if the issue continues.",
        }
      : isHardware
        ? {
            key: "it.requests.ai.resolution.hardware",
            fallback:
              "Run a basic hardware check and arrange a replacement or repair if the fault is confirmed.",
          }
        : isSoftware
          ? {
              key: "it.requests.ai.resolution.software",
              fallback:
                "Verify the affected application, license entitlement, and current version before applying a fix.",
            }
          : {
              key: "it.requests.ai.resolution.general",
              fallback:
                "Review the reported symptoms, confirm the affected service, and route the request to the appropriate IT queue.",
            };

  return { requestType, priority, category, resolution };
}

/* ------------------------------------------------------------------ */

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function RequestCreate() {
  const translate = useTranslate();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  const [params] = useSearchParams();
  const typeId = params.get("type");
  const { result: typeRecord } = useOne<RequestTypeRecord>({
    resource: "it_request_types",
    id: typeId ?? undefined,
    queryOptions: { enabled: !!typeId, retry: false },
  });
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.requests.create.title", "New request")}
        description={
          typeRecord
            ? tt(translate, "it.requests.create.forService", "Requesting: {{name}}", {
                name: typeRecord.name,
              })
            : tt(
                translate,
                "it.requests.create.description",
                "Raise a service request or report an incident."
              )
        }
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <RequestCreateForm typeRecord={typeRecord} />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function RequestCreateForm({ typeRecord }: { typeRecord?: RequestTypeRecord }) {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();

  const [values, setValues] = useState<Values>({
    requestType: "Service request",
    priority: "Medium",
  });
  const [error, setError] = useState("");
  const [problem, setProblem] = useState("");
  const [suggestedFix, setSuggestedFix] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const create = useCreate<RequestRecord, HttpError>();

  const { result: users } = useList<UserRef>({
    resource: "users",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    queryOptions: { retry: false },
    errorNotification: false,
  });

  // Prefill from the chosen catalog service once it loads.
  useEffect(() => {
    if (!typeRecord || prefilled) return;
    setValues((p) => ({
      ...p,
      category:
        (typeRecord.category
          ? CATEGORY_FROM_TYPE[typeRecord.category] ?? typeRecord.category
          : p.category) ?? "",
      priority: typeRecord.defaultPriority ?? p.priority,
      requestTypeRefId: String(typeRecord.id),
    }));
    setPrefilled(true);
  }, [typeRecord, prefilled]);

  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    setWarnWhen(true);
  };

  const fillWithAi = () => {
    if (!problem.trim()) {
      setError(
        tt(
          translate,
          "it.requests.ai.validation.describeFirst",
          "Describe the problem first so AI assist can classify it."
        )
      );
      return;
    }
    setAnalyzing(true);
    setError("");
    window.setTimeout(() => {
      const result = analyzeRequest(problem);
      setValues((p) => ({
        ...p,
        requestType: result.requestType,
        priority: result.priority,
        category: result.category,
        description: p.description || problem,
      }));
      setSuggestedFix(
        tt(translate, result.resolution.key, result.resolution.fallback)
      );
      setWarnWhen(true);
      setAnalyzing(false);
    }, 350);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const slaHours = typeRecord?.slaHours;
    const slaDueAt =
      slaHours && slaHours > 0
        ? addDaysIso(Math.ceil(slaHours / 24))
        : addDaysIso(3);

    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v === "") continue;
      payload[k] = k === "requestTypeRefId" ? Number(v) : v;
    }
    payload.status = "New";
    payload.slaDueAt = slaDueAt;
    if (suggestedFix) payload.suggestedFix = suggestedFix;

    create.mutate(
      { resource: "it_requests", values: payload },
      {
        onSuccess: () => {
          setWarnWhen(false);
          void close({ skipBeforeClose: true });
        },
        onError: (err) => setError(err?.message ?? "Error"),
      }
    );
  };

  return (
    <form onSubmit={submit} className="grid min-h-0 gap-4 overflow-y-auto p-5">
          {/* AI assist panel */}
          <section className="relative overflow-hidden rounded-xl border border-sky-400/35 bg-sky-50/60 p-3 dark:bg-sky-400/[0.07]">
            <div className="absolute inset-y-0 left-0 w-0.5 bg-sky-400" />
            <div className="mb-2 flex items-center gap-2 text-sky-700 dark:text-sky-200">
              <span className="grid size-6 place-items-center rounded-md bg-sky-400/15">
                <Sparkles className="size-3.5" />
              </span>
              <div>
                <div className="text-xs font-bold tracking-[0.08em] uppercase">
                  {tt(translate, "it.requests.ai.title", "AI assist")}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {tt(
                    translate,
                    "it.requests.ai.description",
                    "Describe the problem in plain language. AI assist will structure the request for you."
                  )}
                </p>
              </div>
            </div>
            <Textarea
              aria-label={tt(
                translate,
                "it.requests.ai.problemLabel",
                "Describe your IT problem"
              )}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder={tt(
                translate,
                "it.requests.ai.problemPlaceholder",
                "Example: I cannot connect to VPN after resetting my password and need access before today's client call."
              )}
              className="min-h-20 border-sky-400/20 bg-background/60 text-sm"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-medium tracking-wide text-sky-700/80 uppercase dark:text-sky-200/80">
                {tt(
                  translate,
                  "it.requests.ai.privacy",
                  "Local analysis · no data leaves this form"
                )}
              </span>
              <Button type="button" size="sm" onClick={fillWithAi} disabled={analyzing}>
                <Sparkles />
                {analyzing
                  ? tt(translate, "it.requests.ai.analyzing", "Analyzing...")
                  : tt(translate, "it.requests.ai.fill", "Fill with AI")}
              </Button>
            </div>
            {suggestedFix ? (
              <div className="mt-3 border-t border-sky-400/20 pt-2">
                <div className="text-[10px] font-bold tracking-[0.08em] text-sky-700 uppercase dark:text-sky-200">
                  {tt(
                    translate,
                    "it.requests.ai.suggestedResolution",
                    "Suggested resolution"
                  )}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {suggestedFix}
                </p>
              </div>
            ) : null}
          </section>

          {/* Fields */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium sm:col-span-2">
              <span>{tt(translate, "it.field.subject", "Subject")}</span>
              <Input
                value={values.subject ?? ""}
                onChange={(e) => set("subject", e.target.value)}
                required
              />
            </label>

            <label className="grid gap-1 text-xs font-medium">
              <span>{tt(translate, "it.field.requestType", "Request type")}</span>
              <Select
                value={values.requestType ?? ""}
                onValueChange={(v) => set("requestType", v ?? "")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {tt(translate, `it.value.${t.toLowerCase().replace(/ /g, "_")}`, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1 text-xs font-medium">
              <span>{tt(translate, "it.field.priority", "Priority")}</span>
              <Select
                value={values.priority ?? ""}
                onValueChange={(v) => set("priority", v ?? "")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {tt(translate, `it.value.${p.toLowerCase()}`, p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1 text-xs font-medium">
              <span>{tt(translate, "it.field.category", "Category")}</span>
              <Select
                value={values.category ?? ""}
                onValueChange={(v) => set("category", v ?? "")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {tt(
                        translate,
                        `it.value.${c.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
                        c
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1 text-xs font-medium">
              <span>{tt(translate, "it.field.requester", "Requester")}</span>
              <Select
                value={values.requesterId ?? ""}
                onValueChange={(v) => set("requesterId", v ?? "")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
                </SelectTrigger>
                <SelectContent>
                  {users.data.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {personName(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1 text-xs font-medium sm:col-span-2">
              <span>{tt(translate, "it.field.description", "Description")}</span>
              <Textarea
                value={values.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                className="min-h-24"
              />
            </label>
          </div>

          {error ? <p className="text-xs text-red-500">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => void close()}>
              {tt(translate, "buttons.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={create.mutation.isPending}>
              {tt(translate, "it.requests.create.submit", "Submit request")}
            </Button>
          </div>
    </form>
  );
}
