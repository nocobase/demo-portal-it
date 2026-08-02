import { useList, useTranslate } from "@refinedev/core";
import { Boxes, Plus, Search } from "lucide-react";
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
  ASSET_STATUSES,
  EmptyState,
  KpiCard,
  PageHeader,
  ValuePill,
  formatDate,
  money,
  personName,
  tt,
  type AssetRecord,
} from "../lib";
import { useOpenContextualChild } from "../route-surfaces";

export function AssetList() {
  const translate = useTranslate();
  const openChild = useOpenContextualChild();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { result, query } = useList<AssetRecord>({
    resource: "it_assets",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    sorters: [{ field: "createdAt", order: "desc" }],
    meta: { appends: ["assignee"] },
    queryOptions: { retry: false },
  });

  const rows = result.data;

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status ?? "—"] = (c[r.status ?? "—"] ?? 0) + 1;
    return c;
  }, [rows]);

  const totalValue = useMemo(
    () => rows.reduce((s, r) => s + (r.purchaseCost ?? 0), 0),
    [rows]
  );

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [r.name, r.assetTag, r.brand, r.model, r.serialNumber, r.location, personName(r.assignee, "")]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

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
        <KpiCard label={tt(translate, "it.assets.kpi.total", "Total assets")} value={rows.length} icon={<Boxes />} loading={query.isLoading} />
        <KpiCard label={tt(translate, "it.assets.kpi.inUse", "In use")} value={counts["In use"] ?? 0} tone="success" loading={query.isLoading} />
        <KpiCard label={tt(translate, "it.assets.kpi.available", "Available")} value={(counts["Available"] ?? 0) + (counts["In stock"] ?? 0)} loading={query.isLoading} />
        <KpiCard label={tt(translate, "it.assets.kpi.value", "Fleet value")} value={money(totalValue)} hint={tt(translate, "it.assets.kpi.valueHint", "Total purchase cost")} loading={query.isLoading} />
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
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={tt(translate, "it.common.all", "All")} count={rows.length} />
          {ASSET_STATUSES.map((s) => (
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
              {filtered.map((r) => (
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
              {filtered.length === 0 ? (
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
