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
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  EmptyState,
  PageHeader,
  ValuePill,
  tt,
  useDimensionCounts,
  type RequestTypeRecord,
} from "./lib";
import { COLUMN_PAGE_SIZE, ShowMore } from "./pagination";
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

  // The category list comes from a server-side grouped count, so the catalog
  // knows every section without pulling every service. Each section then loads
  // only its own first batch of cards.
  // it_request_types declares no "id" field, so the count measure targets
  // "name". Counting a field the collection does not declare returns ungrouped,
  // count-less rows instead of an error.
  const { counts, total, isLoading } = useDimensionCounts(
    "it_request_types",
    "category",
    [],
    "name"
  );

  const categories = useMemo(() => {
    const remaining = new Set(Object.keys(counts));
    const ordered: string[] = [];
    for (const c of CATEGORY_ORDER) {
      if (remaining.delete(c)) ordered.push(c);
    }
    return [...ordered, ...Array.from(remaining).sort()];
  }, [counts]);

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

      {isLoading ? (
        <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
      ) : total === 0 ? (
        <EmptyState
          label={tt(translate, "it.catalog.empty", "No services are published yet.")}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {categories.map((category) => (
            <CatalogSection
              key={category}
              category={category}
              total={counts[category] ?? 0}
              translate={translate}
              navigate={navigate}
              openChild={openChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One category section. Loads its own capped batch of services and reveals the
 * rest on demand, so a large catalog never arrives in a single response.
 */
function CatalogSection({
  category,
  total,
  translate,
  navigate,
  openChild,
}: {
  category: string;
  total: number;
  translate: ReturnType<typeof useTranslate>;
  navigate: ReturnType<typeof useNavigate>;
  openChild: (path: string) => void;
}) {
  const [limit, setLimit] = useState(COLUMN_PAGE_SIZE);

  const { result } = useList<RequestTypeRecord>({
    resource: "it_request_types",
    pagination: { mode: "server", currentPage: 1, pageSize: limit },
    filters: [
      category === "Other"
        ? { field: "category", operator: "eq", value: null }
        : { field: "category", operator: "eq", value: category },
    ],
    sorters: [{ field: "name", order: "asc" }],
    queryOptions: { retry: false },
  });

  const items = result.data;

  return (
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
              <ShowMore
                loaded={items.length}
                total={total}
                onClick={() => setLimit((current) => current + COLUMN_PAGE_SIZE)}
              />
            </section>
  );
}
