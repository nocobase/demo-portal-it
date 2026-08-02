import { useList, useTranslate, type CrudFilters } from "@refinedev/core";
import { BookOpen, Eye, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Outlet } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  EmptyState,
  PageHeader,
  ValuePill,
  formatDate,
  tt,
  useDimensionCounts,
  type RunbookRecord,
} from "../lib";
import {
  ListPagination,
  useDebouncedValue,
  useListPagination,
} from "../pagination";
import { useOpenContextualChild } from "../route-surfaces";

// Runbooks with no category group under this chip; it doubles as the sentinel
// the server filter turns into an "is null" predicate.
const UNCATEGORIZED = "—";

export function RunbookList() {
  const translate = useTranslate();
  const openChild = useOpenContextualChild();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const searchTerm = useDebouncedValue(search.trim());
  const pagination = useListPagination(`${categoryFilter}|${searchTerm}`);

  const searchFilters = useMemo<CrudFilters>(
    () =>
      searchTerm
        ? [
            {
              operator: "or",
              value: [
                { field: "title", operator: "contains", value: searchTerm },
                { field: "tags", operator: "contains", value: searchTerm },
                { field: "summary", operator: "contains", value: searchTerm },
              ],
            },
          ]
        : [],
    [searchTerm]
  );

  const filters = useMemo<CrudFilters>(() => {
    if (categoryFilter === "all") return searchFilters;
    return [
      ...searchFilters,
      categoryFilter === UNCATEGORIZED
        ? { field: "category", operator: "eq", value: null }
        : { field: "category", operator: "eq", value: categoryFilter },
    ];
  }, [searchFilters, categoryFilter]);

  const { result, query } = useList<RunbookRecord>({
    resource: "it_runbooks",
    pagination: {
      mode: "server",
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
    },
    filters,
    sorters: [{ field: "title", order: "asc" }],
    queryOptions: { retry: false },
  });

  const rows = result.data;
  const total = result.total;

  // Chips come from a server-side grouped count, so every category stays
  // listed even when its runbooks sit on another page.
  // it_runbooks declares no "id" field, so the count measure targets "title".
  const { counts: categories, total: matchingTotal } = useDimensionCounts(
    "it_runbooks",
    "category",
    searchFilters,
    "title"
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.knowledge.title", "Runbooks")}
        description={tt(translate, "it.knowledge.description", "Step-by-step procedures and troubleshooting guides maintained by the IT team.")}
        actions={
          <Button type="button" onClick={() => openChild("create")}>
            <Plus />
            {tt(translate, "it.knowledge.create.title", "New runbook")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tt(translate, "it.knowledge.searchPlaceholder", "Search title, tags, summary...")}
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
            label={tt(translate, "it.common.all", "All")}
            count={matchingTotal}
          />
          {Object.keys(categories)
            .sort()
            .map((c) => (
              <FilterChip
                key={c}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
                label={c === UNCATEGORIZED ? tt(translate, "it.common.uncategorized", "Uncategorized") : c}
                count={categories[c]}
              />
            ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            label={
              query.isLoading
                ? tt(translate, "it.common.loading", "Loading...")
                : tt(translate, "it.knowledge.empty", "No runbooks match your filters.")
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const tags = (r.tags ?? "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => openChild(String(r.id))}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-semibold">{r.title}</h3>
                  <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                </div>
                {r.category ? <ValuePill translate={translate} value={r.category} /> : null}
                {r.summary ? (
                  <p className="line-clamp-3 text-sm text-muted-foreground">{r.summary}</p>
                ) : null}
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="size-3.5" />
                    {tt(translate, "it.knowledge.views", "{{n}} views", { n: r.views ?? 0 })}
                  </span>
                  <span>{formatDate(r.updatedAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ListPagination {...pagination} total={total} />
      <Outlet />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent"
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "opacity-90" : "opacity-60")}>{count}</span>
    </button>
  );
}
