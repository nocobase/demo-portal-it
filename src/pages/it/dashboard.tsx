import { useTranslate } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  Boxes,
  ClipboardList,
  Wrench,
  ShieldCheck,
  Activity,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CHART_COLORS,
  EmptyState,
  KpiCard,
  PageHeader,
  SectionCard,
  ValuePill,
  aggregate,
  formatDate,
  money,
  personName,
  tt,
  toneFor,
  TONE_HEX,
  daysUntil,
  type AggRow,
  type AssetRecord,
  type LicenseRecord,
  type RepairRecord,
  type RequestRecord,
} from "./lib";
import { nocobaseClient } from "@nocobase/portal-sdk/client";

const listQ = <T,>(resource: string, query: Record<string, unknown>) =>
  nocobaseClient
    .action<{ data?: T[]; meta?: { count?: number } }>(resource, "list", {
      query: { pageSize: 200, ...query },
      unwrap: "none",
    });

export function DashboardPage() {
  const translate = useTranslate();
  const navigate = useNavigate();

  const assetsQ = useQuery({ queryKey: ["it-dash", "assets"], queryFn: () => listQ<AssetRecord>("it_assets", {}) });
  const licensesQ = useQuery({ queryKey: ["it-dash", "licenses"], queryFn: () => listQ<LicenseRecord>("it_licenses", {}) });
  const requestsQ = useQuery({ queryKey: ["it-dash", "requests"], queryFn: () => listQ<RequestRecord>("it_requests", { "appends[]": ["assignee", "requester"], sort: "-createdAt" }) });
  const repairsQ = useQuery({ queryKey: ["it-dash", "repairs"], queryFn: () => listQ<RepairRecord>("it_repairs", { "appends[]": ["asset"] }) });
  const byStatusQ = useQuery({ queryKey: ["it-dash", "assetsByStatus"], queryFn: () => aggregate("it_assets", "status") });
  const byCatQ = useQuery({ queryKey: ["it-dash", "assetsByCat"], queryFn: () => aggregate("it_assets", "category") });
  const reqByStatusQ = useQuery({ queryKey: ["it-dash", "reqByStatus"], queryFn: () => aggregate("it_requests", "status") });

  const assets = assetsQ.data?.data ?? [];
  const licenses = licensesQ.data?.data ?? [];
  const requests = requestsQ.data?.data ?? [];
  const repairs = repairsQ.data?.data ?? [];

  const assetValue = assets.reduce((s, a) => s + (a.purchaseCost ?? 0), 0);
  const assignable = assets.filter((a) => a.status !== "Retired").length;
  const inUse = assets.filter((a) => a.status === "In use").length;
  const utilization = assignable > 0 ? Math.round((inUse / assignable) * 100) : 0;

  const seatsTotal = licenses.reduce((s, l) => s + (l.seatsTotal ?? 0), 0);
  const seatsUsed = licenses.reduce((s, l) => s + (l.seatsUsed ?? 0), 0);
  const compliant = licenses.filter((l) => (l.seatsUsed ?? 0) <= (l.seatsTotal ?? 0) && (daysUntil(l.renewalDate) ?? 1) >= 0).length;
  const compliancePct = licenses.length > 0 ? Math.round((compliant / licenses.length) * 100) : 100;

  const openRequests = requests.filter((r) => ["New", "Approved", "In progress"].includes(String(r.status)));
  const repairsBacklog = repairs.filter((r) => r.status !== "Done");

  const pieData = (byStatusQ.data ?? []).map((r: AggRow) => ({ name: String(r.k ?? "—"), value: Number(r.n) }));
  const catData = (byCatQ.data ?? []).map((r: AggRow) => ({ name: String(r.k ?? "—"), value: Number(r.n) })).sort((a, b) => b.value - a.value);
  const reqData = (reqByStatusQ.data ?? []).map((r: AggRow) => ({ name: String(r.k ?? "—"), value: Number(r.n) }));

  const licenseAlerts = licenses
    .filter((l) => (l.seatsUsed ?? 0) > (l.seatsTotal ?? 0) || (daysUntil(l.renewalDate) ?? 999) < 60)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.dashboard.title", "Operations dashboard")}
        description={tt(translate, "it.dashboard.description", "Fleet value, utilization, license compliance, and the request and repair backlog at a glance.")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label={tt(translate, "it.dashboard.kpi.assetValue", "Asset value")} value={money(assetValue)} hint={tt(translate, "it.dashboard.kpi.assetValueHint", "{{n}} devices", { n: assets.length })} icon={<Boxes />} loading={assetsQ.isLoading} />
        <KpiCard label={tt(translate, "it.dashboard.kpi.utilization", "Utilization")} value={`${utilization}%`} hint={tt(translate, "it.dashboard.kpi.utilizationHint", "{{used}} of {{total}} in use", { used: inUse, total: assignable })} icon={<Activity />} loading={assetsQ.isLoading} />
        <KpiCard label={tt(translate, "it.dashboard.kpi.compliance", "License compliance")} value={`${compliancePct}%`} hint={tt(translate, "it.dashboard.kpi.complianceHint", "{{used}}/{{total}} seats used", { used: seatsUsed, total: seatsTotal })} icon={<ShieldCheck />} tone={compliancePct < 80 ? "warning" : "success"} loading={licensesQ.isLoading} />
        <KpiCard label={tt(translate, "it.dashboard.kpi.openRequests", "Open requests")} value={openRequests.length} hint={tt(translate, "it.dashboard.kpi.openRequestsHint", "{{n}} total", { n: requests.length })} icon={<ClipboardList />} tone={openRequests.length > 10 ? "warning" : undefined} loading={requestsQ.isLoading} />
        <KpiCard label={tt(translate, "it.dashboard.kpi.repairs", "Repairs backlog")} value={repairsBacklog.length} hint={tt(translate, "it.dashboard.kpi.repairsHint", "open + in progress")} icon={<Wrench />} tone={repairsBacklog.length > 6 ? "danger" : undefined} loading={repairsQ.isLoading} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <SectionCard title={tt(translate, "it.dashboard.charts.assetsByStatus", "Assets by status")}>
          {pieData.length === 0 ? (
            <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3} strokeWidth={0}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={TONE_HEX[toneFor(entry.name)]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          <ul className="mt-2 space-y-1.5">
            {pieData.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: TONE_HEX[toneFor(entry.name)] }} />
                  {tt(translate, `it.value.${entry.name.toLowerCase().replace(/ /g, "_")}`, entry.name)}
                </span>
                <span className="font-medium tabular-nums">{entry.value}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={tt(translate, "it.dashboard.charts.assetsByCategory", "Assets by category")} className="lg:col-span-2">
          {catData.length === 0 ? (
            <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={catData} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {catData.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <SectionCard title={tt(translate, "it.dashboard.charts.requestsByStatus", "Requests by status")}>
          {reqData.length === 0 ? (
            <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={reqData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {reqData.map((entry) => (
                    <Cell key={entry.name} fill={TONE_HEX[toneFor(entry.name)]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard
          title={tt(translate, "it.dashboard.licenseAlerts.title", "License alerts")}
          className="lg:col-span-1"
          action={
            <button type="button" onClick={() => navigate("/licenses")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              {tt(translate, "it.common.viewAll", "View all")}
              <ArrowRight className="size-3.5" />
            </button>
          }
        >
          {licenseAlerts.length === 0 ? (
            <EmptyState label={tt(translate, "it.dashboard.licenseAlerts.empty", "All licenses compliant.")} />
          ) : (
            <ul className="divide-y">
              {licenseAlerts.map((l) => {
                const over = (l.seatsUsed ?? 0) > (l.seatsTotal ?? 0);
                return (
                  <li key={l.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {over
                          ? tt(translate, "it.dashboard.licenseAlerts.over", "{{used}}/{{total}} seats — over-allocated", { used: l.seatsUsed ?? 0, total: l.seatsTotal ?? 0 })
                          : tt(translate, "it.dashboard.licenseAlerts.renews", "renews {{d}}", { d: formatDate(l.renewalDate) })}
                      </p>
                    </div>
                    <AlertTriangle className={`size-4 shrink-0 ${over ? "text-red-500" : "text-amber-500"}`} />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={tt(translate, "it.dashboard.openRequests.title", "Latest open requests")}
          action={
            <button type="button" onClick={() => navigate("/requests")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              {tt(translate, "it.common.viewAll", "View all")}
              <ArrowRight className="size-3.5" />
            </button>
          }
        >
          {openRequests.length === 0 ? (
            <EmptyState label={tt(translate, "it.dashboard.openRequests.empty", "No open requests.")} />
          ) : (
            <ul className="divide-y">
              {openRequests.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.subject}</p>
                    <p className="text-xs text-muted-foreground">{personName(r.requester, tt(translate, "it.common.unknown", "Unknown"))}</p>
                  </div>
                  <ValuePill translate={translate} value={r.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
