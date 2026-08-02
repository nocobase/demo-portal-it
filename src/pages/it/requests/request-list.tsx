import { useList, useTranslate, type CrudFilters } from "@refinedev/core";
import { CheckCircle2, ClipboardList, Loader2, Plus, Search, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Outlet } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  EmptyState,
  KpiCard,
  PageHeader,
  REQUEST_STATUSES,
  ValuePill,
  formatDate,
  personName,
  tt,
  useDimensionCounts,
  type RequestRecord,
} from "../lib";
import {
  ListPagination,
  useDebouncedValue,
  useListPagination,
} from "../pagination";
import { useOpenContextualChild } from "../route-surfaces";

export function RequestList() {
  const translate = useTranslate();
  const openChild = useOpenContextualChild();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const searchTerm = useDebouncedValue(search.trim());
  const pagination = useListPagination(`${statusFilter}|${searchTerm}`);

  // The search box narrows the list on the server so it applies across every
  // page, not just the rows that happen to be loaded.
  const searchFilters = useMemo<CrudFilters>(
    () =>
      searchTerm
        ? [
            {
              operator: "or",
              value: [
                { field: "subject", operator: "contains", value: searchTerm },
                { field: "category", operator: "contains", value: searchTerm },
                {
                  field: "requestTypeRef.name",
                  operator: "contains",
                  value: searchTerm,
                },
                {
                  field: "requester.nickname",
                  operator: "contains",
                  value: searchTerm,
                },
              ],
            },
          ]
        : [],
    [searchTerm]
  );

  const filters = useMemo<CrudFilters>(
    () =>
      statusFilter === "all"
        ? searchFilters
        : [
            ...searchFilters,
            { field: "status", operator: "eq", value: statusFilter },
          ],
    [searchFilters, statusFilter]
  );

  const { result, query } = useList<RequestRecord>({
    resource: "it_requests",
    pagination: {
      mode: "server",
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
    },
    filters,
    sorters: [{ field: "createdAt", order: "desc" }],
    meta: { appends: ["requester", "assignee", "requestTypeRef", "asset"] },
    queryOptions: { retry: false },
  });

  const rows = result.data;
  const total = result.total;

  // Counts come from the aggregate endpoint rather than the loaded rows, so
  // the KPIs and chips describe the whole collection, not the current page.
  // The status filter is deliberately left out: selecting one status should
  // not zero out the other chips.
  const { counts, total: matchingTotal, isLoading: countsLoading } =
    useDimensionCounts("it_requests", "status", searchFilters);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.requests.title", "Requests")}
        description={tt(
          translate,
          "it.requests.description",
          "Every service request and incident, from submission through approval to fulfilment."
        )}
        actions={
          <Button type="button" onClick={() => openChild("new")}>
            <Plus />
            {tt(translate, "it.requests.create.title", "New request")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={tt(translate, "it.requests.kpi.awaiting", "Awaiting approval")}
          value={counts["New"] ?? 0}
          icon={<ClipboardList />}
          tone="warning"
          loading={countsLoading}
        />
        <KpiCard
          label={tt(translate, "it.requests.kpi.approved", "Approved")}
          value={counts["Approved"] ?? 0}
          icon={<ThumbsUp />}
          loading={countsLoading}
        />
        <KpiCard
          label={tt(translate, "it.requests.kpi.inProgress", "In progress")}
          value={counts["In progress"] ?? 0}
          icon={<Loader2 />}
          loading={countsLoading}
        />
        <KpiCard
          label={tt(translate, "it.requests.kpi.fulfilled", "Fulfilled")}
          value={counts["Fulfilled"] ?? 0}
          icon={<CheckCircle2 />}
          tone="success"
          loading={countsLoading}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tt(
              translate,
              "it.requests.searchPlaceholder",
              "Search subject, service, requester..."
            )}
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label={tt(translate, "it.common.all", "All")}
            count={matchingTotal}
          />
          {REQUEST_STATUSES.map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={tt(translate, `it.value.${s.toLowerCase().replace(/ /g, "_")}`, s)}
              count={counts[s] ?? 0}
            />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{tt(translate, "it.field.subject", "Subject")}</TableHead>
                <TableHead>{tt(translate, "it.field.catalogService", "Catalog service")}</TableHead>
                <TableHead>{tt(translate, "it.field.requester", "Requester")}</TableHead>
                <TableHead>{tt(translate, "it.field.priority", "Priority")}</TableHead>
                <TableHead>{tt(translate, "it.field.slaDueAt", "SLA due")}</TableHead>
                <TableHead>{tt(translate, "it.field.status", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => openChild(String(r.id))}
                >
                  <TableCell>
                    <div className="font-medium">{r.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.requestType
                        ? tt(
                            translate,
                            `it.value.${r.requestType.toLowerCase().replace(/ /g, "_")}`,
                            r.requestType
                          )
                        : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.requestTypeRef?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.requester ? (
                      personName(r.requester)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.priority ? (
                      <ValuePill translate={translate} value={r.priority} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(r.slaDueAt)}
                  </TableCell>
                  <TableCell>
                    <ValuePill translate={translate} value={r.status} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      label={
                        query.isLoading
                          ? tt(translate, "it.common.loading", "Loading...")
                          : tt(translate, "it.requests.empty", "No requests match your filters.")
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

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
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent"
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "opacity-90" : "opacity-60")}>
        {count}
      </span>
    </button>
  );
}
