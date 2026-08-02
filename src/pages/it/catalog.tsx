import { useList, useTranslate } from "@refinedev/core";
import {
  AppWindow,
  ClipboardList,
  Download,
  KeyRound,
  Laptop,
  Lock,
  Monitor,
  MonitorSpeaker,
  Pencil,
  Plus,
  ShieldCheck,
  Smartphone,
  UserMinus,
  UserPlus,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Outlet, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  EmptyState,
  PageHeader,
  ValuePill,
  tt,
  type RequestTypeRecord,
} from "./lib";
import { useOpenContextualChild } from "./route-surfaces";

const ICONS: Record<string, LucideIcon> = {
  Laptop,
  Monitor,
  Smartphone,
  AppWindow,
  Download,
  ShieldCheck,
  KeyRound,
  Lock,
  Wifi,
  MonitorSpeaker,
  UserPlus,
  UserMinus,
};

const CATEGORY_ORDER = [
  "Hardware",
  "Software",
  "Access",
  "Network",
  "Facilities",
] as const;

export function ServiceCatalog() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const openChild = useOpenContextualChild();

  const { result, query } = useList<RequestTypeRecord>({
    resource: "it_request_types",
    pagination: { mode: "server", currentPage: 1, pageSize: 100 },
    sorters: [{ field: "category", order: "asc" }],
    queryOptions: { retry: false },
  });

  const rows = result.data;

  const groups = useMemo(() => {
    const byCat = new Map<string, RequestTypeRecord[]>();
    for (const r of rows) {
      const key = r.category ?? "Other";
      const arr = byCat.get(key) ?? [];
      arr.push(r);
      byCat.set(key, arr);
    }
    const ordered: Array<[string, RequestTypeRecord[]]> = [];
    for (const c of CATEGORY_ORDER) {
      if (byCat.has(c)) {
        ordered.push([c, byCat.get(c)!]);
        byCat.delete(c);
      }
    }
    for (const [c, arr] of byCat) ordered.push([c, arr]);
    return ordered;
  }, [rows]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.catalog.title", "Service catalog")}
        description={tt(
          translate,
          "it.catalog.description",
          "Browse the services IT offers and raise a request in a couple of clicks."
        )}
        actions={
          <Button type="button" onClick={() => openChild("create")}>
            <Plus />
            {tt(translate, "it.catalog.create.title", "New service")}
          </Button>
        }
      />

      {query.isLoading ? (
        <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
      ) : rows.length === 0 ? (
        <EmptyState
          label={tt(translate, "it.catalog.empty", "No services are published yet.")}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([category, items]) => (
            <section key={category} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {tt(
                  translate,
                  `it.value.${category.toLowerCase().replace(/ /g, "_")}`,
                  category
                )}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const Icon = ICONS[item.icon ?? ""] ?? ClipboardList;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex flex-col gap-3 rounded-xl border bg-card p-5",
                        item.active === false && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 [&_svg]:size-5">
                          <Icon />
                        </span>
                        <div className="flex items-center gap-1.5">
                          {item.defaultPriority ? (
                            <ValuePill translate={translate} value={item.defaultPriority} />
                          ) : null}
                          {item.active === false ? (
                            <ValuePill translate={translate} value={tt(translate, "it.catalog.draft", "Draft")} tone="slate" />
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openChild(`${item.id}/edit`)}
                          >
                            <Pencil />
                          </Button>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{item.name}</div>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {item.slaHours != null ? (
                          <span className="rounded-full border px-2 py-0.5">
                            {tt(translate, "it.catalog.sla", "SLA {{h}}h", {
                              h: item.slaHours,
                            })}
                          </span>
                        ) : null}
                        {item.requiresApproval ? (
                          <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                            {tt(
                              translate,
                              "it.catalog.requiresApproval",
                              "Requires approval"
                            )}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-auto pt-1">
                        <Button
                          type="button"
                          size="sm"
                          className={cn("w-full")}
                          onClick={() =>
                            navigate(`/requests/new?type=${item.id}`)
                          }
                        >
                          {tt(
                            translate,
                            "it.catalog.request",
                            "Request this service"
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      <Outlet />
    </div>
  );
}
