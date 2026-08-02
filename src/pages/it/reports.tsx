import { useTranslate } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { nocobaseClient } from "@nocobase/portal-sdk/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  CHART_COLORS,
  EmptyState,
  KpiCard,
  PageHeader,
  SectionCard,
  aggregate,
  money,
  tt,
  toneFor,
  TONE_HEX,
  type AggRow,
  type AssetRecord,
  type LicenseRecord,
  type RequestRecord,
} from "./lib";

const listQ = <T,>(resource: string, query: Record<string, unknown>) =>
  nocobaseClient.action<{ data?: T[]; meta?: { count?: number } }>(resource, "list", {
    query: { pageSize: 200, ...query },
    unwrap: "none",
  });

export function ReportsPage() {
  const translate = useTranslate();

  const assetsQ = useQuery({ queryKey: ["it-reports", "assets"], queryFn: () => listQ<AssetRecord>("it_assets", {}) });
  const assetsByCatQ = useQuery({ queryKey: ["it-reports", "assetsByCat"], queryFn: () => aggregate("it_assets", "category") });
  const licensesQ = useQuery({ queryKey: ["it-reports", "licenses"], queryFn: () => listQ<LicenseRecord>("it_licenses", {}) });
  const requestsQ = useQuery({ queryKey: ["it-reports", "requests"], queryFn: () => listQ<RequestRecord>("it_requests", {}) });
  const reqByTypeQ = useQuery({ queryKey: ["it-reports", "reqByType"], queryFn: () => aggregate("it_requests", "requestType") });
  const reqByStatusQ = useQuery({ queryKey: ["it-reports", "reqByStatus"], queryFn: () => aggregate("it_requests", "status") });

  const assets = assetsQ.data?.data ?? [];
  const licenses = licensesQ.data?.data ?? [];
  const requests = requestsQ.data?.data ?? [];

  /* -------------------------- Asset inventory -------------------------- */
  const assetCountByCat = (assetsByCatQ.data ?? []).map((r: AggRow) => ({
    name: String(r.k ?? "—"),
    count: Number(r.n),
  }));
  const assetValueByCat = new Map<string, number>();
  for (const a of assets) {
    const key = a.category ?? "—";
    assetValueByCat.set(key, (assetValueByCat.get(key) ?? 0) + (a.purchaseCost ?? 0));
  }
  const assetRows = assetCountByCat
    .map((r) => ({ name: r.name, count: r.count, value: assetValueByCat.get(r.name) ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const assetTotalValue = assets.reduce((s, a) => s + (a.purchaseCost ?? 0), 0);

  /* -------------------------- License spend -------------------------- */
  const spendByVendor = new Map<string, number>();
  for (const l of licenses) {
    const key = l.vendor ?? "—";
    spendByVendor.set(key, (spendByVendor.get(key) ?? 0) + (l.annualCost ?? 0));
  }
  const vendorRows = Array.from(spendByVendor.entries())
    .map(([name, spend]) => ({ name, spend }))
    .sort((a, b) => b.spend - a.spend);
  const totalSpend = vendorRows.reduce((s, r) => s + r.spend, 0);

  /* -------------------------- Request throughput -------------------------- */
  const reqByType = (reqByTypeQ.data ?? []).map((r: AggRow) => ({ name: String(r.k ?? "—"), value: Number(r.n) }));
  const reqByStatus = (reqByStatusQ.data ?? []).map((r: AggRow) => ({ name: String(r.k ?? "—"), value: Number(r.n) }));
  const totalRequests = requests.length;
  const fulfilled = requests.filter((r) => ["Fulfilled", "Resolved"].includes(String(r.status))).length;
  const rejected = requests.filter((r) => ["Rejected", "Cancelled"].includes(String(r.status))).length;
  const open = requests.filter((r) => ["New", "Approved", "In progress"].includes(String(r.status))).length;

  const loadingInventory = assetsQ.isLoading || assetsByCatQ.isLoading;
  const loadingLicenses = licensesQ.isLoading;
  const loadingRequests = requestsQ.isLoading || reqByTypeQ.isLoading || reqByStatusQ.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.reports.title", "Reports")}
        description={tt(translate, "it.reports.description", "Asset inventory, license spend, and request throughput.")}
      />

      {/* Section A: Asset inventory */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <SectionCard title={tt(translate, "it.reports.inventory.title", "Asset inventory")} className="lg:col-span-1">
          {loadingInventory ? (
            <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
          ) : assetRows.length === 0 ? (
            <EmptyState label={tt(translate, "it.reports.inventory.empty", "No assets recorded yet.")} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{tt(translate, "it.field.category", "Category")}</TableHead>
                    <TableHead className="text-right">{tt(translate, "it.reports.inventory.count", "Count")}</TableHead>
                    <TableHead className="text-right">{tt(translate, "it.reports.inventory.value", "Value")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetRows.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="text-sm">{r.name}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{r.count}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{money(r.value)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium hover:bg-transparent">
                    <TableCell className="text-sm">{tt(translate, "it.reports.total", "Total")}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{assets.length}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{money(assetTotalValue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>

        <SectionCard title={tt(translate, "it.reports.inventory.chartTitle", "Assets by category")} className="lg:col-span-2">
          {loadingInventory ? (
            <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
          ) : assetRows.length === 0 ? (
            <EmptyState label={tt(translate, "it.reports.inventory.empty", "No assets recorded yet.")} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={assetRows} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {assetRows.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Section B: License spend */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <SectionCard title={tt(translate, "it.reports.licenses.title", "License spend")} className="lg:col-span-1">
          {loadingLicenses ? (
            <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
          ) : vendorRows.length === 0 ? (
            <EmptyState label={tt(translate, "it.reports.licenses.empty", "No licenses recorded yet.")} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{tt(translate, "it.field.vendor", "Vendor")}</TableHead>
                    <TableHead className="text-right">{tt(translate, "it.reports.licenses.annualCost", "Annual cost")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorRows.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="text-sm">{r.name}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{money(r.spend)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium hover:bg-transparent">
                    <TableCell className="text-sm">{tt(translate, "it.reports.total", "Total")}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{money(totalSpend)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>

        <SectionCard title={tt(translate, "it.reports.licenses.chartTitle", "Annual spend by vendor")} className="lg:col-span-2">
          {loadingLicenses ? (
            <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
          ) : vendorRows.length === 0 ? (
            <EmptyState label={tt(translate, "it.reports.licenses.empty", "No licenses recorded yet.")} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={vendorRows} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} formatter={(v) => money(Number(v))} />
                <Bar dataKey="spend" radius={[4, 4, 0, 0]}>
                  {vendorRows.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Section C: Request throughput */}
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={tt(translate, "it.reports.requests.total", "Total requests")} value={totalRequests} loading={loadingRequests} />
          <KpiCard label={tt(translate, "it.reports.requests.fulfilled", "Fulfilled")} value={fulfilled} tone="success" loading={loadingRequests} />
          <KpiCard label={tt(translate, "it.reports.requests.rejected", "Rejected")} value={rejected} tone="danger" loading={loadingRequests} />
          <KpiCard label={tt(translate, "it.reports.requests.open", "Open")} value={open} tone="warning" loading={loadingRequests} />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SectionCard title={tt(translate, "it.reports.requests.byType", "Requests by type")}>
            {loadingRequests ? (
              <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
            ) : reqByType.length === 0 ? (
              <EmptyState label={tt(translate, "it.reports.requests.empty", "No requests recorded yet.")} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={reqByType} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke="var(--border)" horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {reqByType.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          <SectionCard title={tt(translate, "it.reports.requests.byStatus", "Requests by status")}>
            {loadingRequests ? (
              <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
            ) : reqByStatus.length === 0 ? (
              <EmptyState label={tt(translate, "it.reports.requests.empty", "No requests recorded yet.")} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={reqByStatus} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke="var(--border)" horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {reqByStatus.map((entry) => (
                      <Cell key={entry.name} fill={TONE_HEX[toneFor(entry.name)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
