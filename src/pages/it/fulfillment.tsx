import {
  useCreate,
  useInvalidate,
  useList,
  useShow,
  useTranslate,
  useUpdate,
  useWarnAboutChange,
  type HttpError,
} from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useNavigate, useOutlet, useParams } from "react-router";
import { Outlet } from "react-router";

import { LoadingState } from "@/components/app-shell/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RouteDialog,
  RouteDrawer,
  useRefineUnsavedChangesGuard,
} from "@/extensions/nocobase-route-surfaces";
import { useRouteSurfaceClose } from "@nocobase/portal-sdk/routing";
import { cn } from "@/lib/utils";

import {
  FULFILLMENT_STAGES,
  Field,
  KpiCard,
  PageHeader,
  ValuePill,
  formatDate,
  personName,
  tt,
  useDimensionCounts,
  type FulfillmentJobRecord,
  type RequestRecord,
  type UserRef,
} from "./lib";
import { ShowMore, useColumnLimits } from "./pagination";
import { useContextualCloseTo, useOpenContextualChild } from "./route-surfaces";

type Stage = (typeof FULFILLMENT_STAGES)[number];

// What a dragged card carries. The board no longer holds every job in memory,
// so the payload has to describe the record well enough to move it.
type DragPayload = {
  id: FulfillmentJobRecord["id"];
  status?: string | null;
  requestId?: FulfillmentJobRecord["requestId"];
};

const COLUMN_STYLES: Record<Stage, string> = {
  Queued: "border-t-blue-400",
  "In progress": "border-t-amber-400",
  Blocked: "border-t-red-400",
  Done: "border-t-emerald-400",
};

export function FulfillmentBoard() {
  const translate = useTranslate();
  const openChild = useOpenContextualChild();
  const update = useUpdate();
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  const { limitFor, showMore } = useColumnLimits(FULFILLMENT_STAGES);
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();

  // Column counts come from the aggregate endpoint, so the KPIs cover every
  // job while each column only loads its first batch of cards.
  const { counts, isLoading: countsLoading } = useDimensionCounts(
    "it_fulfillment_jobs",
    "status"
  );

  const refresh = () => {
    void invalidate({ resource: "it_fulfillment_jobs", invalidates: ["list"] });
    void invalidate({ resource: "it_requests", invalidates: ["list"] });
    void queryClient.invalidateQueries({
      queryKey: ["it-agg", "it_fulfillment_jobs"],
    });
  };

  const moveJob = (job: DragPayload, to: Stage) => {
    if (job.status === to) return;
    update.mutate(
      { resource: "it_fulfillment_jobs", id: job.id, values: { status: to } },
      {
        onSuccess: () => {
          if (to === "Done" && job.requestId) {
            update.mutate(
              {
                resource: "it_requests",
                id: job.requestId,
                values: { status: "Fulfilled" },
              },
              { onSuccess: refresh }
            );
          } else {
            refresh();
          }
        },
      }
    );
  };

  const handleDrop = (event: DragEvent, stage: Stage) => {
    event.preventDefault();
    setDragOver(null);
    const raw = event.dataTransfer.getData("text/job");
    if (!raw) return;
    try {
      moveJob(JSON.parse(raw) as DragPayload, stage);
    } catch {
      // A drop from outside the board; nothing to move.
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.fulfillment.title", "Fulfillment")}
        description={tt(
          translate,
          "it.fulfillment.description",
          "Drag fulfilment jobs across the board. Completing a job marks its request fulfilled."
        )}
        actions={
          <Button type="button" onClick={() => openChild("create")}>
            <Plus />
            {tt(translate, "it.fulfillment.actions.new", "New job")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={tt(translate, "it.value.queued", "Queued")}
          value={counts["Queued"] ?? 0}
          loading={countsLoading}
        />
        <KpiCard
          label={tt(translate, "it.value.in_progress", "In progress")}
          value={counts["In progress"] ?? 0}
          tone="warning"
          loading={countsLoading}
        />
        <KpiCard
          label={tt(translate, "it.value.blocked", "Blocked")}
          value={counts["Blocked"] ?? 0}
          tone="danger"
          loading={countsLoading}
        />
        <KpiCard
          label={tt(translate, "it.value.done", "Done")}
          value={counts["Done"] ?? 0}
          tone="success"
          loading={countsLoading}
        />
      </div>

      <div className="grid flex-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {FULFILLMENT_STAGES.map((stage) => (
          <FulfillmentColumn
            key={stage}
            stage={stage}
            limit={limitFor(stage)}
            onShowMore={() => showMore(stage)}
            dragOver={dragOver === stage}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(stage);
            }}
            onDragLeave={() =>
              setDragOver((current) => (current === stage ? null : current))
            }
            onDrop={(event) => handleDrop(event, stage)}
            translate={translate}
            onOpen={openChild}
          />
        ))}
      </div>
      <Outlet />
    </div>
  );
}

/**
 * One board column. Each column runs its own query filtered to its stage and
 * capped at `limit`, so opening the board costs four small requests instead of
 * one that drags in every job.
 */
function FulfillmentColumn({
  stage,
  limit,
  onShowMore,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  translate,
  onOpen,
}: {
  stage: Stage;
  limit: number;
  onShowMore: () => void;
  dragOver: boolean;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent) => void;
  translate: ReturnType<typeof useTranslate>;
  onOpen: (path: string) => void;
}) {
  const { result, query } = useList<FulfillmentJobRecord>({
    resource: "it_fulfillment_jobs",
    pagination: { mode: "server", currentPage: 1, pageSize: limit },
    filters: [{ field: "status", operator: "eq", value: stage }],
    sorters: [{ field: "dueDate", order: "asc" }],
    meta: { appends: ["request", "assignee"] },
    queryOptions: { retry: false },
  });

  const jobs = result.data;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex min-h-48 flex-col gap-3 rounded-xl border border-t-2 bg-muted/40 p-3 transition-colors",
        COLUMN_STYLES[stage],
        dragOver && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <ValuePill translate={translate} value={stage} />
        <span className="text-xs font-medium text-muted-foreground">
          {query.isLoading ? "—" : result.total}
        </span>
      </div>
      {jobs.map((job) => (
        <BoardCard
          key={job.id}
          job={job}
          translate={translate}
          onOpen={() => onOpen(String(job.id))}
        />
      ))}
      {!query.isLoading && jobs.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          {tt(translate, "it.fulfillment.emptyColumn", "Drop jobs here")}
        </p>
      ) : null}
      <ShowMore loaded={jobs.length} total={result.total} onClick={onShowMore} />
    </div>
  );
}

function BoardCard({
  job,
  translate,
  onOpen,
}: {
  job: FulfillmentJobRecord;
  translate: ReturnType<typeof useTranslate>;
  onOpen: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event) =>
        event.dataTransfer.setData(
          "text/job",
          JSON.stringify({
            id: job.id,
            status: job.status,
            requestId: job.requestId,
          })
        )
      }
      onClick={onOpen}
      className="cursor-pointer space-y-2 rounded-lg border bg-card p-3 text-left shadow-xs transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <p className="line-clamp-2 text-sm font-medium">{job.title}</p>
      {job.request?.subject ? (
        <p className="truncate text-xs text-muted-foreground">
          {job.request.subject}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {job.priority ? (
          <ValuePill translate={translate} value={job.priority} className="h-5" />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{personName(job.assignee)}</span>
        {job.dueDate ? (
          <span className="shrink-0">{formatDate(job.dueDate)}</span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fields (shared by create + edit)                                   */
/* ------------------------------------------------------------------ */

type Values = Record<string, string>;

function FulfillmentFields({
  values,
  set,
  showRequest = true,
}: {
  values: Values;
  set: (k: string, v: string) => void;
  showRequest?: boolean;
}) {
  const translate = useTranslate();
  const { result: users } = useList<UserRef>({
    resource: "users",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const { result: requests } = useList<RequestRecord>({
    resource: "it_requests",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    sorters: [{ field: "createdAt", order: "desc" }],
    queryOptions: { retry: false, enabled: showRequest },
  });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-medium sm:col-span-2">
        <span>{tt(translate, "it.field.title", "Title")}</span>
        <Input value={values.title ?? ""} onChange={(e) => set("title", e.target.value)} required />
      </label>
      {showRequest ? (
        <label className="grid gap-1 text-xs font-medium sm:col-span-2">
          <span>{tt(translate, "it.field.request", "Related request")}</span>
          <Select value={values.requestId ?? ""} onValueChange={(v) => set("requestId", v ?? "")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder={tt(translate, "it.common.none", "None")}>
                {values.requestId
                  ? requests.data.find((r) => String(r.id) === String(values.requestId))?.subject
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {requests.data.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      ) : null}
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.status", "Status")}</span>
        <Select value={values.status ?? ""} onValueChange={(v) => set("status", v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
          </SelectTrigger>
          <SelectContent>
            {FULFILLMENT_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {tt(translate, `it.value.${s.toLowerCase().replace(/ /g, "_")}`, s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.priority", "Priority")}</span>
        <Select value={values.priority ?? ""} onValueChange={(v) => set("priority", v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
          </SelectTrigger>
          <SelectContent>
            {["Low", "Medium", "High", "Critical"].map((p) => (
              <SelectItem key={p} value={p}>
                {tt(translate, `it.value.${p.toLowerCase()}`, p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.dueDate", "Due date")}</span>
        <Input type="date" value={values.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value)} />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.assignee", "Assignee")}</span>
        <Select value={values.assigneeId ?? ""} onValueChange={(v) => set("assigneeId", v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={tt(translate, "it.common.unassigned", "Unassigned")}>
              {values.assigneeId
                ? personName(users.data.find((u) => String(u.id) === String(values.assigneeId)))
                : undefined}
            </SelectValue>
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
        <span>{tt(translate, "it.field.instructions", "Instructions")}</span>
        <Textarea
          value={values.instructions ?? ""}
          onChange={(e) => set("instructions", e.target.value)}
          className="min-h-20"
        />
      </label>
    </div>
  );
}

function normalizeJob(values: Values) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === "") continue;
    if (k === "requestId" || k === "assigneeId") out[k] = Number(v);
    else out[k] = v;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

export function FulfillmentCreate() {
  const translate = useTranslate();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.fulfillment.create.title", "New fulfilment job")}
        description={tt(translate, "it.fulfillment.create.description", "Create a job independent of a request, or attach it to one.")}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <FulfillmentCreateForm />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function FulfillmentCreateForm() {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const [values, setValues] = useState<Values>({ status: "Queued" });
  const [error, setError] = useState("");
  const create = useCreate<FulfillmentJobRecord, HttpError>();
  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    setWarnWhen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    create.mutate(
      { resource: "it_fulfillment_jobs", values: normalizeJob(values) },
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
      <FulfillmentFields values={values} set={set} />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void close()}>
          {tt(translate, "buttons.cancel", "Cancel")}
        </Button>
        <Button type="submit" disabled={create.mutation.isPending}>
          {tt(translate, "it.fulfillment.create.submit", "Create job")}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Show (also mounted as a nested child under a request's detail)     */
/* ------------------------------------------------------------------ */

export function FulfillmentShow() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { jobId, id } = useParams<{ jobId?: string; id?: string }>();
  const recordId = jobId ?? id;
  const closeTo = useContextualCloseTo();
  const openChild = useOpenContextualChild();
  const nested = useOutlet();
  const { result: record, query } = useShow<FulfillmentJobRecord>({
    resource: "it_fulfillment_jobs",
    id: recordId,
    meta: { appends: ["request", "assignee"] },
  });

  return (
    <RouteDrawer
      title={
        query.isLoading && !record ? (
          <Skeleton className="h-6 w-56" />
        ) : (
          <span className="flex items-center gap-2">
            <span className="truncate">{record?.title ?? tt(translate, "it.fulfillment.title", "Fulfillment")}</span>
            {record ? <ValuePill translate={translate} value={record.status} /> : null}
          </span>
        )
      }
      description={record?.request?.subject ?? ""}
      closeLabel={tt(translate, "buttons.close", "Close")}
      closeTo={closeTo}
      nested={nested}
      actions={
        record ? (
          <Button type="button" variant="outline" size="sm" onClick={() => openChild("edit")}>
            <Pencil />
            {tt(translate, "buttons.edit", "Edit")}
          </Button>
        ) : null
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {query.isLoading ? (
          <LoadingState className="min-h-64" />
        ) : query.isError || !record ? (
          <Alert variant="destructive">
            <AlertDescription>
              {tt(translate, "it.fulfillment.show.loadError", "This job may no longer exist.")}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2">
              <Field label={tt(translate, "it.field.priority", "Priority")}>
                {record.priority ? <ValuePill translate={translate} value={record.priority} /> : "—"}
              </Field>
              <Field label={tt(translate, "it.field.dueDate", "Due date")}>{formatDate(record.dueDate)}</Field>
              <Field label={tt(translate, "it.field.assignee", "Assignee")}>{personName(record.assignee)}</Field>
              <Field label={tt(translate, "it.field.request", "Related request")}>
                {record.request ? (
                  <button
                    type="button"
                    className="text-primary underline-offset-2 hover:underline"
                    onClick={() => navigate(`/requests/${record.requestId}`)}
                  >
                    {record.request.subject}
                  </button>
                ) : (
                  "—"
                )}
              </Field>
            </section>
            {record.instructions ? (
              <>
                <Separator />
                <Field label={tt(translate, "it.field.instructions", "Instructions")}>
                  <span className="whitespace-pre-wrap font-normal">{record.instructions}</span>
                </Field>
              </>
            ) : null}
          </div>
        )}
      </div>
    </RouteDrawer>
  );
}

/* ------------------------------------------------------------------ */
/* Edit                                                                */
/* ------------------------------------------------------------------ */

export function FulfillmentEdit() {
  const translate = useTranslate();
  const { jobId, id } = useParams<{ jobId?: string; id?: string }>();
  const recordId = jobId ?? id;
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  const { result: record } = useShow<FulfillmentJobRecord>({ resource: "it_fulfillment_jobs", id: recordId });
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.fulfillment.edit.title", "Edit fulfilment job")}
        description={record?.title ?? ""}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <FulfillmentEditForm id={recordId} />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function FulfillmentEditForm({ id }: { id?: string }) {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const { result: record } = useShow<FulfillmentJobRecord>({ resource: "it_fulfillment_jobs", id });
  const [values, setValues] = useState<Values | null>(null);
  const [error, setError] = useState("");
  const update = useUpdate<FulfillmentJobRecord, HttpError>();

  const current: Values =
    values ??
    (record
      ? {
          title: record.title ?? "",
          status: record.status ?? "",
          priority: record.priority ?? "",
          dueDate: record.dueDate ?? "",
          assigneeId: record.assigneeId != null ? String(record.assigneeId) : "",
          instructions: record.instructions ?? "",
        }
      : {});

  const set = (k: string, v: string) => {
    setValues({ ...current, [k]: v });
    setWarnWhen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setError("");
    update.mutate(
      { resource: "it_fulfillment_jobs", id: record.id, values: normalizeJob(current) },
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
      <FulfillmentFields values={current} set={set} showRequest={false} />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void close()}>
          {tt(translate, "buttons.cancel", "Cancel")}
        </Button>
        <Button type="submit" disabled={update.mutation.isPending}>
          {tt(translate, "buttons.save", "Save")}
        </Button>
      </div>
    </form>
  );
}
