import { useList, useTranslate } from "@refinedev/core";
import { AlertTriangle, KeyRound, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Outlet } from "react-router";

import { Button } from "@/components/ui/button";
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
  Meter,
  PageHeader,
  StatusPill,
  ValuePill,
  daysUntil,
  formatDate,
  money,
  tt,
  type LicenseRecord,
  type Tone,
} from "../lib";
import { useOpenContextualChild } from "../route-surfaces";

type Classification = "compliant" | "overAllocated" | "expiringSoon" | "expired";

function classify(r: LicenseRecord): Classification {
  const seatsUsed = r.seatsUsed ?? 0;
  const seatsTotal = r.seatsTotal ?? 0;
  const d = daysUntil(r.renewalDate);
  if (d != null && d < 0) return "expired";
  if (seatsUsed > seatsTotal) return "overAllocated";
  if (d != null && d >= 0 && d <= 60) return "expiringSoon";
  return "compliant";
}

export function LicenseList() {
  const translate = useTranslate();
  const openChild = useOpenContextualChild();
  const [filter, setFilter] = useState<"all" | Classification>("all");

  const { result, query } = useList<LicenseRecord>({
    resource: "it_licenses",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    sorters: [{ field: "renewalDate", order: "asc" }],
    meta: { appends: ["owner"] },
    queryOptions: { retry: false },
  });

  const rows = result.data;

  const classified = useMemo(
    () => rows.map((r) => ({ r, c: classify(r) })),
    [rows]
  );

  const counts = useMemo(() => {
    const c: Record<Classification, number> = {
      compliant: 0,
      overAllocated: 0,
      expiringSoon: 0,
      expired: 0,
    };
    for (const { c: cls } of classified) c[cls] += 1;
    return c;
  }, [classified]);

  const seatsUsedTotal = useMemo(() => rows.reduce((s, r) => s + (r.seatsUsed ?? 0), 0), [rows]);
  const seatsCapacityTotal = useMemo(() => rows.reduce((s, r) => s + (r.seatsTotal ?? 0), 0), [rows]);
  const annualSpend = useMemo(() => rows.reduce((s, r) => s + (r.annualCost ?? 0), 0), [rows]);

  const compliantCount = useMemo(
    () =>
      rows.filter((r) => {
        const seatsUsed = r.seatsUsed ?? 0;
        const seatsTotal = r.seatsTotal ?? 0;
        const d = daysUntil(r.renewalDate);
        const seatsOk = seatsUsed <= seatsTotal;
        const notPast = d == null || d >= 0;
        return seatsOk && notPast;
      }).length,
    [rows]
  );
  const compliancePct = rows.length > 0 ? Math.round((compliantCount / rows.length) * 100) : 0;

  const filtered = filter === "all" ? classified : classified.filter(({ c }) => c === filter);

  const alertCount = counts.overAllocated + counts.expiringSoon;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.licenses.title", "Licenses")}
        description={tt(translate, "it.licenses.description", "Every software license the team pays for, its seat usage, and its renewal window.")}
        actions={
          <Button type="button" onClick={() => openChild("create")}>
            <Plus />
            {tt(translate, "it.licenses.create.title", "Add license")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={tt(translate, "it.licenses.kpi.total", "Total licenses")} value={rows.length} icon={<KeyRound />} loading={query.isLoading} />
        <KpiCard
          label={tt(translate, "it.licenses.kpi.seats", "Seats used / total")}
          value={`${seatsUsedTotal} / ${seatsCapacityTotal}`}
          loading={query.isLoading}
        />
        <KpiCard
          label={tt(translate, "it.licenses.kpi.compliance", "Compliance")}
          value={`${compliancePct}%`}
          tone={compliancePct < 100 ? "warning" : "success"}
          loading={query.isLoading}
        />
        <KpiCard
          label={tt(translate, "it.licenses.kpi.spend", "Annual spend")}
          value={money(annualSpend)}
          loading={query.isLoading}
        />
      </div>

      {alertCount > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            {tt(
              translate,
              "it.licenses.alert.summary",
              "{{overAllocated}} over-allocated, {{expiringSoon}} expiring soon",
              { overAllocated: counts.overAllocated, expiringSoon: counts.expiringSoon }
            )}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={tt(translate, "it.common.all", "All")} count={rows.length} />
        <FilterChip active={filter === "compliant"} onClick={() => setFilter("compliant")} label={tt(translate, "it.licenses.filter.compliant", "Compliant")} count={counts.compliant} />
        <FilterChip active={filter === "overAllocated"} onClick={() => setFilter("overAllocated")} label={tt(translate, "it.licenses.filter.overAllocated", "Over-allocated")} count={counts.overAllocated} />
        <FilterChip active={filter === "expiringSoon"} onClick={() => setFilter("expiringSoon")} label={tt(translate, "it.licenses.filter.expiringSoon", "Expiring soon")} count={counts.expiringSoon} />
        <FilterChip active={filter === "expired"} onClick={() => setFilter("expired")} label={tt(translate, "it.licenses.filter.expired", "Expired")} count={counts.expired} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{tt(translate, "it.field.product", "Product")}</TableHead>
                <TableHead>{tt(translate, "it.field.vendor", "Vendor")}</TableHead>
                <TableHead>{tt(translate, "it.field.licenseType", "Type")}</TableHead>
                <TableHead>{tt(translate, "it.field.seats", "Seats")}</TableHead>
                <TableHead>{tt(translate, "it.field.renewalDate", "Renewal")}</TableHead>
                <TableHead>{tt(translate, "it.field.annualCost", "Annual cost")}</TableHead>
                <TableHead>{tt(translate, "it.field.status", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ r }) => {
                const seatsUsed = r.seatsUsed ?? 0;
                const seatsTotal = r.seatsTotal ?? 0;
                const over = seatsUsed > seatsTotal;
                const d = daysUntil(r.renewalDate);
                let renewalTone: Tone = "emerald";
                let renewalLabel = formatDate(r.renewalDate);
                if (d != null) {
                  if (d < 0) {
                    renewalTone = "red";
                    renewalLabel = tt(translate, "it.licenses.renewal.expired", "Expired");
                  } else if (d <= 60) {
                    renewalTone = "amber";
                    renewalLabel = tt(translate, "it.licenses.renewal.daysLeft", "{{n}}d left", { n: d });
                  }
                }
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => openChild(`${r.id}/edit`)}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.version ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.vendor ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.licenseType ? tt(translate, `it.value.${r.licenseType.toLowerCase().replace(/ /g, "_")}`, r.licenseType) : "—"}</TableCell>
                    <TableCell className="min-w-32">
                      <Meter value={seatsUsed} max={seatsTotal} tone={over ? "red" : "blue"} />
                      <div className={cn("mt-1 text-xs", over ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                        {seatsUsed}/{seatsTotal} {tt(translate, "it.licenses.seatsUsedSuffix", "used")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">{formatDate(r.renewalDate)}</div>
                      <StatusPill value={renewalLabel} tone={renewalTone} className="mt-1" />
                    </TableCell>
                    <TableCell className="text-sm">{money(r.annualCost)}</TableCell>
                    <TableCell><ValuePill translate={translate} value={r.status} /></TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState label={query.isLoading ? tt(translate, "it.common.loading", "Loading...") : tt(translate, "it.licenses.empty", "No licenses match your filters.")} />
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
