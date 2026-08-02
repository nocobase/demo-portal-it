import { useList, useTranslate, type CrudFilters } from "@refinedev/core";
import { Boxes, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

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
  ASSET_STATUSES,
  EmptyState,
  KpiCard,
  PageHeader,
  ValuePill,
  formatDate,
  money,
  personName,
  tt,
  useStatusValues,
  useSumOf,
  type AssetRecord,
} from "../lib";
import {
  ListPagination,
  useDebouncedValue,
  useListPagination,
} from "../pagination";
import { useOpenContextualChild } from "../route-surfaces";

export function AssetList() {
  const translate = useTranslate();
  const openChild = useOpenContextualChild();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const searchTerm = useDebouncedValue(search.trim());
  const pagination = useListPagination(`${statusFilter}|${searchTerm}`);

  // Searching happens on the server so it spans the whole register rather than
  // only the rows on the current page.
  const searchFilters = useMemo<CrudFilters>(
    () =>
      searchTerm
        ? [
            {
              operator: "or",
              value: [
                { field: "name", operator: "contains", value: searchTerm },
                { field: "assetTag", operator: "contains", value: searchTerm },
                { field: "brand", operator: "contains", value: searchTerm },
                { field: "model", operator: "contains", value: searchTerm },
                {
                  field: "serialNumber",
                  operator: "contains",
                  value: searchTerm,
                },
                { field: "location", operator: "contains", value: searchTerm },
                {
                  field: "assignee.nickname",
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

  const { result, query } = useList<AssetRecord>({
    resource: "it_assets",
    pagination: {
      mode: "server",
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
    },
    filters,
    sorters: [{ field: "createdAt", order: "desc" }],
    meta: { appends: ["assignee"] },
    queryOptions: { retry: false },
  });

  const rows = result.data;
  const total = result.total;

  // KPIs and chip counts are aggregated server-side so they stay accurate for
  // the whole register while the table only loads one page. The status filter
  // is excluded so picking one status does not zero out the other chips.
  const {
    values: statuses,
    counts,
    total: matchingTotal,
    isLoading: countsLoading,
  } = useStatusValues("it_assets", "status", ASSET_STATUSES, searchFilters);
  const { value: totalValue, isLoading: valueLoading } = useSumOf(
    "it_assets",
    "purchaseCost",
    searchFilters
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.assets.title", "Assets")}
        description={tt(translate, "it.assets.description", "The single register of every device the IT team owns, assigns, and retires.")}
        actions={
          <Button type="button" onClick={() => openChild("create")}>
            <Plus />
            {tt(translate, "it.assets.create.title", "Register asset")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={tt(translate, "it.assets.kpi.total", "Total assets")} value={matchingTotal} icon={<Boxes />} loading={countsLoading} />
        <KpiCard label={tt(translate, "it.assets.kpi.inUse", "In use")} value={counts["In use"] ?? 0} tone="success" loading={countsLoading} />
        <KpiCard label={tt(translate, "it.assets.kpi.available", "Available")} value={(counts["Available"] ?? 0) + (counts["In stock"] ?? 0)} loading={countsLoading} />
        <KpiCard label={tt(translate, "it.assets.kpi.value", "Fleet value")} value={money(totalValue)} hint={tt(translate, "it.assets.kpi.valueHint", "Total purchase cost")} loading={valueLoading} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tt(translate, "it.assets.searchPlaceholder", "Search tag, model, serial, owner...")}
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={tt(translate, "it.common.all", "All")} count={matchingTotal} />
          {statuses.map((s) => (
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
                <TableHead>{tt(translate, "it.field.assetTag", "Tag")}</TableHead>
                <TableHead>{tt(translate, "it.field.name", "Asset")}</TableHead>
                <TableHead>{tt(translate, "it.field.category", "Category")}</TableHead>
                <TableHead>{tt(translate, "it.field.assignee", "Assigned to")}</TableHead>
                <TableHead>{tt(translate, "it.field.location", "Location")}</TableHead>
                <TableHead>{tt(translate, "it.field.warrantyExpiry", "Warranty")}</TableHead>
                <TableHead>{tt(translate, "it.field.status", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => openChild(String(r.id))}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.assetTag ?? "—"}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{[r.brand, r.model].filter(Boolean).join(" ")}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.category ? tt(translate, `it.value.${r.category.toLowerCase()}`, r.category) : "—"}</TableCell>
                  <TableCell className="text-sm">{r.assignee ? personName(r.assignee) : <span className="text-muted-foreground">{tt(translate, "it.common.unassigned", "Unassigned")}</span>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.location ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.warrantyExpiry)}</TableCell>
                  <TableCell><ValuePill translate={translate} value={r.status} /></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState label={query.isLoading ? tt(translate, "it.common.loading", "Loading...") : tt(translate, "it.assets.empty", "No assets match your filters.")} />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <ListPagination {...pagination} total={total} />
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
