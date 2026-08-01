import { useTranslate, useWarnAboutChange } from "@refinedev/core";
import {
  createRouteSurfaceNavigationState,
  resolveRouteSurfaceCloseTo,
  useRouteSurfaceClose,
} from "@nocobase/portal-sdk/routing";
import { nocobaseClient } from "@nocobase/portal-sdk/client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useResolvedPath,
} from "react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Plus,
  ShieldCheck,
  Sparkles,
  Wrench,
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

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  RouteDialog,
  RouteDrawer,
  useRefineUnsavedChangesGuard,
} from "@/extensions/nocobase-route-surfaces";

type ItConsolePageName = "dashboard" | ItConsoleListPage;
export type ItConsoleListPage =
  | "assets"
  | "requests"
  | "licenses"
  | "repairs";

type RecordRow = Record<string, unknown> & { id: number };
type Summary = { label: string; value: number };
type FieldType = "text" | "date" | "number" | "textarea";
type TranslatableLabel = { key: string; fallback: string };

const colors = ["#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#a78bfa"];

const pageConfig = {
  assets: {
    title: { key: "it.assets.title", fallback: "Asset register" },
    resource: "it_assets",
    action: { key: "it.assets.actions.add", fallback: "Add asset" },
    section: { key: "it.navigation.assets", fallback: "assets" },
    icon: Boxes,
  },
  requests: {
    title: { key: "it.requests.title", fallback: "Request queue" },
    resource: "it_requests",
    action: { key: "it.requests.actions.new", fallback: "New request" },
    section: { key: "it.navigation.requests", fallback: "requests" },
    icon: ClipboardList,
  },
  licenses: {
    title: { key: "it.licenses.title", fallback: "License inventory" },
    resource: "it_licenses",
    action: { key: "it.licenses.actions.add", fallback: "Add license" },
    section: { key: "it.navigation.licenses", fallback: "licenses" },
    icon: ShieldCheck,
  },
  repairs: {
    title: { key: "it.repairs.title", fallback: "Repair desk" },
    resource: "it_repairs",
    action: { key: "it.repairs.actions.log", fallback: "Log repair" },
    section: { key: "it.navigation.repairs", fallback: "repairs" },
    icon: Wrench,
  },
} as const;

const fieldConfig: Record<
  ItConsoleListPage,
  Array<[string, TranslatableLabel, FieldType]>
> = {
  assets: [
    ["name", { key: "it.fields.assetName", fallback: "Asset name" }, "text"],
    ["assetTag", { key: "it.fields.assetTag", fallback: "Asset tag" }, "text"],
    ["category", { key: "it.fields.type", fallback: "Type" }, "text"],
    ["brand", { key: "it.fields.brand", fallback: "Brand" }, "text"],
    ["model", { key: "it.fields.model", fallback: "Model" }, "text"],
    ["status", { key: "it.fields.status", fallback: "Status" }, "text"],
    ["location", { key: "it.fields.location", fallback: "Location" }, "text"],
    ["warrantyExpiry", { key: "it.fields.warrantyExpiry", fallback: "Warranty expiry" }, "date"],
  ],
  requests: [
    ["subject", { key: "it.fields.subject", fallback: "Subject" }, "text"],
    ["requestType", { key: "it.fields.requestType", fallback: "Request type" }, "text"],
    ["priority", { key: "it.fields.priority", fallback: "Priority" }, "text"],
    ["status", { key: "it.fields.status", fallback: "Status" }, "text"],
    ["category", { key: "it.fields.category", fallback: "Category" }, "text"],
    ["description", { key: "it.fields.description", fallback: "Description" }, "textarea"],
  ],
  licenses: [
    ["name", { key: "it.fields.product", fallback: "Product" }, "text"],
    ["vendor", { key: "it.fields.vendor", fallback: "Vendor" }, "text"],
    ["licenseType", { key: "it.fields.licenseType", fallback: "License type" }, "text"],
    ["seatsTotal", { key: "it.fields.seatsTotal", fallback: "Seats total" }, "number"],
    ["seatsUsed", { key: "it.fields.seatsUsed", fallback: "Seats used" }, "number"],
    ["renewalDate", { key: "it.fields.renewalDate", fallback: "Renewal date" }, "date"],
    ["status", { key: "it.fields.status", fallback: "Status" }, "text"],
  ],
  repairs: [
    ["issue", { key: "it.fields.issue", fallback: "Issue" }, "textarea"],
    ["status", { key: "it.fields.status", fallback: "Status" }, "text"],
    ["vendor", { key: "it.fields.vendor", fallback: "Vendor" }, "text"],
    ["cost", { key: "it.fields.cost", fallback: "Cost" }, "number"],
    ["startedAt", { key: "it.fields.started", fallback: "Started" }, "date"],
    ["completedAt", { key: "it.fields.completed", fallback: "Completed" }, "date"],
    ["notes", { key: "it.fields.serviceNotes", fallback: "Service notes" }, "textarea"],
  ],
};

const columnsByPage: Record<ItConsoleListPage, string[]> = {
  assets: [
    "assetTag",
    "name",
    "category",
    "brand",
    "location",
    "warrantyExpiry",
    "status",
  ],
  requests: [
    "subject",
    "requestType",
    "priority",
    "status",
    "requester",
    "assignee",
  ],
  licenses: [
    "name",
    "vendor",
    "licenseType",
    "seatsTotal",
    "seatsUsed",
    "renewalDate",
    "status",
  ],
  repairs: [
    "issue",
    "asset",
    "vendor",
    "startedAt",
    "completedAt",
    "cost",
    "status",
  ],
};

const columnLabels: Record<string, TranslatableLabel> = {
  assetTag: { key: "it.columns.tag", fallback: "Tag" },
  name: { key: "it.columns.assetOrProduct", fallback: "Asset / product" },
  category: { key: "it.columns.type", fallback: "Type" },
  brand: { key: "it.fields.brand", fallback: "Brand" },
  location: { key: "it.fields.location", fallback: "Location" },
  warrantyExpiry: { key: "it.columns.warranty", fallback: "Warranty" },
  status: { key: "it.fields.status", fallback: "Status" },
  subject: { key: "it.columns.request", fallback: "Request" },
  requestType: { key: "it.columns.type", fallback: "Type" },
  priority: { key: "it.fields.priority", fallback: "Priority" },
  requester: { key: "it.fields.requester", fallback: "Requester" },
  assignee: { key: "it.fields.assignee", fallback: "Assignee" },
  vendor: { key: "it.fields.vendor", fallback: "Vendor" },
  licenseType: { key: "it.columns.license", fallback: "License" },
  seatsTotal: { key: "it.columns.seats", fallback: "Seats" },
  seatsUsed: { key: "it.columns.used", fallback: "Used" },
  renewalDate: { key: "it.columns.renewal", fallback: "Renewal" },
  issue: { key: "it.fields.issue", fallback: "Issue" },
  asset: { key: "it.columns.asset", fallback: "Asset" },
  startedAt: { key: "it.columns.opened", fallback: "Opened" },
  completedAt: { key: "it.fields.completed", fallback: "Completed" },
  cost: { key: "it.fields.cost", fallback: "Cost" },
};

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

const businessValueLabels: Record<string, TranslatableLabel> = {
  active: { key: "it.values.active", fallback: "Active" },
  available: { key: "it.values.available", fallback: "Available" },
  completed: { key: "it.values.completed", fallback: "Completed" },
  resolved: { key: "it.values.resolved", fallback: "Resolved" },
  closed: { key: "it.values.closed", fallback: "Closed" },
  "in stock": { key: "it.values.inStock", fallback: "In stock" },
  critical: { key: "it.values.critical", fallback: "Critical" },
  overdue: { key: "it.values.overdue", fallback: "Overdue" },
  retired: { key: "it.values.retired", fallback: "Retired" },
  cancelled: { key: "it.values.cancelled", fallback: "Cancelled" },
  blocked: { key: "it.values.blocked", fallback: "Blocked" },
  repair: { key: "it.values.repair", fallback: "Repair" },
  pending: { key: "it.values.pending", fallback: "Pending" },
  open: { key: "it.values.open", fallback: "Open" },
  assigned: { key: "it.values.assigned", fallback: "Assigned" },
  expiring: { key: "it.values.expiring", fallback: "Expiring" },
  "in progress": { key: "it.values.inProgress", fallback: "In progress" },
  high: { key: "it.values.high", fallback: "High" },
  medium: { key: "it.values.medium", fallback: "Medium" },
  low: { key: "it.values.low", fallback: "Low" },
  "access & identity": { key: "it.values.accessIdentity", fallback: "Access & identity" },
  "network & connectivity": { key: "it.values.networkConnectivity", fallback: "Network & connectivity" },
  hardware: { key: "it.values.hardware", fallback: "Hardware" },
  "software & licensing": { key: "it.values.softwareLicensing", fallback: "Software & licensing" },
  "general it support": { key: "it.values.generalSupport", fallback: "General IT support" },
  "service request": { key: "it.values.serviceRequest", fallback: "Service request" },
  incident: { key: "it.values.incident", fallback: "Incident" },
  "in use": { key: "it.values.inUse", fallback: "In use" },
  "under repair": { key: "it.values.underRepair", fallback: "Under repair" },
  maintenance: { key: "it.values.maintenance", fallback: "Maintenance" },
  inactive: { key: "it.values.inactive", fallback: "Inactive" },
  expired: { key: "it.values.expired", fallback: "Expired" },
  "expiring soon": { key: "it.values.expiringSoon", fallback: "Expiring soon" },
  scheduled: { key: "it.values.scheduled", fallback: "Scheduled" },
  approved: { key: "it.values.approved", fallback: "Approved" },
  rejected: { key: "it.values.rejected", fallback: "Rejected" },
  draft: { key: "it.values.draft", fallback: "Draft" },
};

function translateBusinessValue(
  value: unknown,
  translate: ReturnType<typeof useTranslate>
) {
  const normalized = String(value ?? "").toLowerCase();
  const label = businessValueLabels[normalized];
  return label
    ? translate(label.key, { ns: "starter" }, label.fallback)
    : String(value ?? "");
}

function statusTone(value: unknown) {
  const normal = String(value ?? "").toLowerCase();
  if (/(active|available|completed|resolved|closed|in stock)/.test(normal)) {
    return "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30";
  }
  if (/(critical|overdue|retired|cancelled|blocked)/.test(normal)) {
    return "bg-rose-400/15 text-rose-300 ring-rose-400/30";
  }
  if (/(repair|pending|open|assigned|expiring|in progress)/.test(normal)) {
    return "bg-amber-400/15 text-amber-300 ring-amber-400/30";
  }
  return "bg-sky-400/15 text-sky-300 ring-sky-400/30";
}

function Chip({ value }: { value: unknown }) {
  const translate = useTranslate();
  const displayValue = value
    ? translateBusinessValue(value, translate)
    : translate(
        "it.common.unspecified",
        { ns: "starter" },
        "Unspecified"
      );

  return (
    <span
      className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ring-1 ${statusTone(value)}`}
    >
      {displayValue}
    </span>
  );
}

async function list(
  resource: string,
  options: Record<string, string | number> = {}
) {
  return nocobaseClient.action<{
    data?: RecordRow[];
    meta?: { count?: number };
  }>(resource, "list", {
    query: { pageSize: 100, ...options },
    unwrap: "none",
  });
}

async function grouped(resource: string): Promise<Summary[]> {
  const payload = await nocobaseClient.action<{ data?: Summary[] }>(
    resource,
    "query",
    {
      method: "POST",
      body: {
        measures: [
          { field: ["id"], aggregation: "count", alias: "value" },
        ],
        dimensions: [{ field: ["status"], alias: "label" }],
        orders: [
          { field: ["status"], alias: "label", order: "asc" },
        ],
      },
      unwrap: "none",
    }
  );
  return payload.data ?? [];
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "text-sky-300",
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Boxes;
  tone?: string;
}) {
  return (
    <Card className="ops-panel rounded-md">
      <CardContent className="flex items-center gap-3 p-3">
        <div className={`rounded-md bg-background/70 p-2 ${tone}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </div>
          <div className="font-mono text-2xl leading-6 font-semibold">
            {value}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {detail}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const translate = useTranslate();
  const [assets, setAssets] = useState<Summary[]>([]);
  const [requests, setRequests] = useState<Summary[]>([]);
  const [warranties, setWarranties] = useState<RecordRow[]>([]);
  const [totals, setTotals] = useState({ assets: 0, requests: 0, repairs: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      grouped("it_assets"),
      grouped("it_requests"),
      list("it_assets", { sort: "warrantyExpiry" }),
      list("it_assets"),
      list("it_requests"),
      list("it_repairs"),
    ])
      .then(
        ([
          assetGroups,
          requestGroups,
          warrantyList,
          assetList,
          requestList,
          repairList,
        ]) => {
          setAssets(assetGroups);
          setRequests(requestGroups);
          setWarranties(
            (warrantyList.data ?? [])
              .filter((item) => item.warrantyExpiry)
              .slice(0, 5)
          );
          setTotals({
            assets: assetList.meta?.count ?? assetList.data?.length ?? 0,
            requests: requestList.meta?.count ?? requestList.data?.length ?? 0,
            repairs: repairList.meta?.count ?? repairList.data?.length ?? 0,
          });
        }
      )
      .catch((reason) =>
        setError(
          getErrorMessage(
            reason,
            translate(
              "it.common.unknownError",
              { ns: "starter" },
              "Unknown error"
            )
          )
        )
      )
      .finally(() => setLoading(false));
  }, [translate]);

  const openRequests = requests
    .filter((item) => !/(completed|resolved|closed|cancelled)/i.test(item.label))
    .reduce((total, item) => total + Number(item.value), 0);
  const localizedAssets = assets.map((item) => ({
    ...item,
    label: translateBusinessValue(item.label, translate),
  }));
  const localizedRequests = requests.map((item) => ({
    ...item,
    label: translateBusinessValue(item.label, translate),
  }));

  return (
    <div className="ops-grid min-h-full space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-sky-300 uppercase">
            {translate(
              "it.dashboard.eyebrow",
              { ns: "starter" },
              "IT operations / live control plane"
            )}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {translate(
              "it.dashboard.title",
              { ns: "starter" },
              "Operational dashboard"
            )}
          </h1>
        </div>
        <div
          className={`rounded-sm border px-2 py-1 text-[11px] ${
            loading
              ? "border-sky-400/25 bg-sky-400/10 text-sky-300"
              : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
          }`}
        >
          <span
            className={`mr-1.5 inline-block size-1.5 rounded-full ${
              loading ? "bg-sky-300" : "bg-emerald-300"
            }`}
          />
          {loading
            ? translate(
                "it.dashboard.loading",
                { ns: "starter" },
                "Loading system data..."
              )
            : translate(
                "it.dashboard.online",
                { ns: "starter" },
                "System data online"
              )}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
          {translate(
            "it.dashboard.loadError",
            { ns: "starter", error },
            "Could not load dashboard: {{error}}"
          )}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label={translate(
            "it.dashboard.metrics.assets.label",
            { ns: "starter" },
            "Managed assets"
          )}
          value={totals.assets}
          detail={translate(
            "it.dashboard.metrics.assets.detail",
            { ns: "starter" },
            "Registered hardware"
          )}
          icon={Boxes}
        />
        <Metric
          label={translate(
            "it.dashboard.metrics.requests.label",
            { ns: "starter" },
            "Open requests"
          )}
          value={openRequests}
          detail={translate(
            "it.dashboard.metrics.requests.detail",
            { ns: "starter", count: totals.requests },
            "{{count}} total submitted"
          )}
          icon={ClipboardList}
          tone="text-amber-300"
        />
        <Metric
          label={translate(
            "it.dashboard.metrics.repairs.label",
            { ns: "starter" },
            "Repair activity"
          )}
          value={totals.repairs}
          detail={translate(
            "it.dashboard.metrics.repairs.detail",
            { ns: "starter" },
            "Maintenance records"
          )}
          icon={Wrench}
          tone="text-violet-300"
        />
        <Metric
          label={translate(
            "it.dashboard.metrics.warranty.label",
            { ns: "starter" },
            "Warranty watch"
          )}
          value={warranties.length}
          detail={translate(
            "it.dashboard.metrics.warranty.detail",
            { ns: "starter" },
            "Next renewal dates"
          )}
          icon={AlertTriangle}
          tone="text-rose-300"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.9fr]">
        <ChartPanel
          title={translate(
            "it.dashboard.charts.assetsByStatus",
            { ns: "starter" },
            "Assets by status"
          )}
        >
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={localizedAssets}
                dataKey="value"
                nameKey="label"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={4}
              >
                {localizedAssets.map((entry, index) => (
                  <Cell
                    key={entry.label}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#182235",
                  border: "1px solid #334155",
                  borderRadius: 4,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <Legend items={localizedAssets} />
        </ChartPanel>

        <ChartPanel
          title={translate(
            "it.dashboard.charts.requestsByStatus",
            { ns: "starter" },
            "Open requests by status"
          )}
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={localizedRequests} margin={{ left: -18, right: 4 }}>
              <CartesianGrid
                stroke="#334155"
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#182235",
                  border: "1px solid #334155",
                  borderRadius: 4,
                }}
              />
              <Bar
                dataKey="value"
                radius={[3, 3, 0, 0]}
                fill="#38bdf8"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title={translate(
            "it.dashboard.metrics.warranty.label",
            { ns: "starter" },
            "Warranty watch"
          )}
        >
          <div className="space-y-2">
            {warranties.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between border-b border-border/70 pb-2 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium">{String(asset.name)}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {String(asset.assetTag)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-amber-300">
                    {String(asset.warrantyExpiry)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {translate(
                      "it.dashboard.warrantyExpiry",
                      { ns: "starter" },
                      "warranty expiry"
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!warranties.length ? (
              <Empty
                label={
                  loading
                    ? translate(
                        "it.dashboard.loadingWarranty",
                        { ns: "starter" },
                        "Loading warranty data..."
                      )
                    : translate(
                        "it.dashboard.emptyWarranty",
                        { ns: "starter" },
                        "No warranty dates recorded"
                      )
                }
              />
            ) : null}
          </div>
        </ChartPanel>
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="ops-panel rounded-md">
      <CardContent className="p-3">
        <div className="mb-2 border-b border-border/70 pb-2 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
          {title}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Legend({ items }: { items: Summary[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: colors[index % colors.length] }}
          />
          {item.label}
          <span className="ml-auto font-mono text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-xs text-muted-foreground">{label}</div>
  );
}

function useOpenContextualChild() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (to: string) =>
      navigate(to, {
        state: createRouteSurfaceNavigationState(location),
      }),
    [location, navigate]
  );
}

function useContextualCloseTo() {
  const location = useLocation();
  const parent = useResolvedPath("..");
  const closeTo = useRef(resolveRouteSurfaceCloseTo(location.state, parent));
  return closeTo.current;
}

function ListPage({ page }: { page: ItConsoleListPage }) {
  const translate = useTranslate();
  const config = pageConfig[page];
  const Icon = config.icon;
  const columns = columnsByPage[page];
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const openChild = useOpenContextualChild();

  const reload = useCallback(() => {
    setError("");
    setLoading(true);
    return list(config.resource, { sort: "-createdAt" })
      .then((result) => setRows(result.data ?? []))
      .catch((reason) =>
        setError(
          getErrorMessage(
            reason,
            translate(
              "it.common.unknownError",
              { ns: "starter" },
              "Unknown error"
            )
          )
        )
      )
      .finally(() => setLoading(false));
  }, [config.resource, translate]);

  useEffect(() => {
    void reload();
  }, [location.key, reload]);

  return (
    <div className="ops-grid min-h-full p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-sky-300 uppercase">
            {translate(
              "it.list.eyebrow",
              {
                ns: "starter",
                section: translate(
                  config.section.key,
                  { ns: "starter" },
                  config.section.fallback
                ),
              },
              "IT operations / {{section}}"
            )}
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Icon className="size-5 text-sky-300" />
            {translate(
              config.title.key,
              { ns: "starter" },
              config.title.fallback
            )}
          </h1>
        </div>
        <Button size="sm" onClick={() => openChild("create")}>
          <Plus />
          {translate(
            config.action.key,
            { ns: "starter" },
            config.action.fallback
          )}
        </Button>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
          {translate(
            "it.list.loadError",
            {
              ns: "starter",
              section: translate(
                config.section.key,
                { ns: "starter" },
                config.section.fallback
              ),
              error,
            },
            "Could not load {{section}}: {{error}}"
          )}
        </div>
      ) : null}

      <Card className="ops-panel overflow-hidden rounded-md">
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/20 px-3 py-2">
          <span className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
            {translate(
              "it.list.recordCount",
              { ns: "starter", count: rows.length },
              "{{count}} records"
            )}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {translate(
              "it.list.liveCollection",
              { ns: "starter", resource: config.resource },
              "LIVE COLLECTION: {{resource}}"
            )}
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => {
                  const label = columnLabels[column];
                  return (
                    <TableHead
                      key={column}
                      className="h-8 whitespace-nowrap text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase"
                    >
                      {label
                        ? translate(
                            label.key,
                            { ns: "starter" },
                            label.fallback
                          )
                        : column}
                    </TableHead>
                  );
                })}
                {page === "assets" ? <TableHead className="h-8" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-border/60 hover:bg-sky-400/5"
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column}
                      className="h-10 whitespace-nowrap py-1.5 text-xs"
                    >
                      {column === "status" || column === "priority" ? (
                        <Chip value={row[column]} />
                      ) : column === "requestType" || column === "category" ? (
                        translateBusinessValue(row[column], translate)
                      ) : (
                        relationLabel(row[column])
                      )}
                    </TableCell>
                  ))}
                  {page === "assets" ? (
                    <TableCell className="py-1 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => openChild(`${row.id}/history`)}
                      >
                        {translate(
                          "it.assets.actions.history",
                          { ns: "starter" },
                          "History"
                        )}
                        <ArrowUpRight />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>
                    <Empty
                      label={
                        loading
                          ? translate(
                              "it.list.loading",
                              { ns: "starter" },
                              "Loading records..."
                            )
                          : translate(
                              "it.list.empty",
                              {
                                ns: "starter",
                                section: translate(
                                  config.section.key,
                                  { ns: "starter" },
                                  config.section.fallback
                                ),
                              },
                              "No {{section}} records yet"
                            )
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function relationLabel(value: unknown) {
  if (value && typeof value === "object") {
    const relation = value as Record<string, unknown>;
    return String(relation.nickname ?? relation.name ?? "-");
  }
  return value === null || value === undefined || value === ""
    ? "-"
    : String(value);
}

function analyzeRequest(problem: string) {
  const text = problem.toLowerCase();
  const isAccess =
    /(password|login|sign in|account|access|permission|mfa|vpn|密码|登录|账户|帐号|账号|权限|访问|多因素|双重认证)/.test(text);
  const isHardware =
    /(laptop|computer|monitor|keyboard|mouse|headset|phone|printer|screen|battery|charger|笔记本|电脑|显示器|键盘|鼠标|耳机|手机|电话|打印机|屏幕|电池|充电器)/.test(
      text
    );
  const isSoftware =
    /(software|application|app|install|license|outlook|teams|browser|excel|word|软件|应用|安装|许可证|许可|浏览器)/.test(
      text
    );
  const isNetwork =
    /(wifi|wi-fi|network|internet|connection|vpn|slow|无线网|网络|互联网|连接|网速|卡顿)/.test(
      text
    );
  const priority =
    /(urgent|critical|down|outage|cannot work|can't work|blocked|security|紧急|严重|宕机|中断|无法工作|不能工作|阻塞|安全)/.test(
      text
    )
    ? "High"
    : /(soon|important|slow|intermittent|尽快|重要|缓慢|很慢|间歇)/.test(text)
      ? "Medium"
      : "Low";
  const category = isAccess
    ? "Access & identity"
    : isNetwork
      ? "Network & connectivity"
      : isHardware
        ? "Hardware"
        : isSoftware
          ? "Software & licensing"
          : "General IT support";
  const requestType =
    /(new|need|request|install|replacement|replace|upgrade|新建|需要|申请|安装|更换|替换|升级)/.test(
      text
    )
    ? "Service request"
    : "Incident";
  const resolution = isAccess
    ? {
        key: "it.requests.ai.resolution.access",
        fallback:
          "Confirm the affected account and access level, then reset credentials or review the requested permission.",
      }
    : isNetwork
      ? {
          key: "it.requests.ai.resolution.network",
          fallback:
            "Check the device connection and VPN status first, then collect network diagnostics if the issue continues.",
        }
      : isHardware
        ? {
            key: "it.requests.ai.resolution.hardware",
            fallback:
              "Run a basic hardware check and arrange a replacement or repair if the fault is confirmed.",
          }
        : isSoftware
          ? {
              key: "it.requests.ai.resolution.software",
              fallback:
                "Verify the affected application, license entitlement, and current version before applying a fix.",
            }
          : {
              key: "it.requests.ai.resolution.general",
              fallback:
                "Review the reported symptoms, confirm the affected service, and route the request to the appropriate IT queue.",
            };

  return { requestType, priority, category, resolution };
}

export function ItCreateRoute({ page }: { page: ItConsoleListPage }) {
  const translate = useTranslate();
  const config = pageConfig[page];
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();

  return (
    <>
      <RouteDialog
        title={translate(
          config.action.key,
          { ns: "starter" },
          config.action.fallback
        )}
        description={translate(
          "it.create.description",
          { ns: "starter", resource: config.resource },
          "Create directly in the existing {{resource}} collection."
        )}
        closeLabel={translate(
          "buttons.close",
          { ns: "starter" },
          "Close"
        )}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-xl"
      >
        <CreateForm page={page} />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function CreateForm({ page }: { page: ItConsoleListPage }) {
  const translate = useTranslate();
  const config = pageConfig[page];
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requestValues, setRequestValues] = useState<Record<string, string>>(
    {}
  );
  const [problem, setProblem] = useState("");
  const [suggestedResolution, setSuggestedResolution] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const fillWithAi = () => {
    if (!problem.trim()) {
      setError(
        translate(
          "it.requests.ai.validation.describeFirst",
          { ns: "starter" },
          "Describe the problem first so AI assist can classify it."
        )
      );
      return;
    }
    setAnalyzing(true);
    setError("");
    window.setTimeout(() => {
      const result = analyzeRequest(problem);
      setRequestValues((values) => ({
        ...values,
        requestType: result.requestType,
        priority: result.priority,
        category: result.category,
        description: values.description || problem,
      }));
      setSuggestedResolution(
        translate(
          result.resolution.key,
          { ns: "starter" },
          result.resolution.fallback
        )
      );
      setWarnWhen(true);
      setAnalyzing(false);
    }, 350);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values: Record<string, unknown> =
      page === "requests"
        ? { ...requestValues }
        : Object.fromEntries(new FormData(event.currentTarget));

    for (const [key, value] of Object.entries(values)) {
      if (value === "") delete values[key];
    }
    for (const key of ["seatsTotal", "seatsUsed", "cost"]) {
      if (typeof values[key] === "string") values[key] = Number(values[key]);
    }

    setSaving(true);
    setError("");
    try {
      await nocobaseClient.action(config.resource, "create", {
        method: "POST",
        body: values,
      });
      setWarnWhen(false);
      await close({ skipBeforeClose: true });
    } catch (reason) {
      setError(
        getErrorMessage(
          reason,
          translate(
            "it.common.unknownError",
            { ns: "starter" },
            "Unknown error"
          )
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      onChange={() => setWarnWhen(true)}
      className="grid min-h-0 gap-3 overflow-y-auto p-5 sm:grid-cols-2"
    >
      {page === "requests" ? (
        <section className="ops-panel relative overflow-hidden rounded-md border border-sky-400/35 bg-sky-400/[0.07] p-3 sm:col-span-2">
          <div className="absolute inset-y-0 left-0 w-0.5 bg-sky-300" />
          <div className="mb-2 flex items-center gap-2 text-sky-200">
            <span className="grid size-6 place-items-center rounded-sm bg-sky-400/15">
              <Sparkles className="size-3.5" />
            </span>
            <div>
              <div className="text-xs font-bold tracking-[0.12em] uppercase">
                {translate(
                  "it.requests.ai.title",
                  { ns: "starter" },
                  "AI assist"
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {translate(
                  "it.requests.ai.description",
                  { ns: "starter" },
                  "Describe the problem in plain language. AI assist will structure the request for you."
                )}
              </p>
            </div>
          </div>
          <Textarea
            aria-label={translate(
              "it.requests.ai.problemLabel",
              { ns: "starter" },
              "Describe your IT problem"
            )}
            value={problem}
            onChange={(event) => setProblem(event.target.value)}
            placeholder={translate(
              "it.requests.ai.problemPlaceholder",
              { ns: "starter" },
              "Example: I cannot connect to VPN after resetting my password and need access before today's client call."
            )}
            className="min-h-20 border-sky-400/20 bg-background/60 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-medium tracking-wide text-sky-200/80 uppercase">
              {translate(
                "it.requests.ai.privacy",
                { ns: "starter" },
                "Local analysis · no data leaves this form"
              )}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={fillWithAi}
              disabled={analyzing}
            >
              <Sparkles />
              {analyzing
                ? translate(
                    "it.requests.ai.analyzing",
                    { ns: "starter" },
                    "Analyzing..."
                  )
                : translate(
                    "it.requests.ai.fill",
                    { ns: "starter" },
                    "Fill with AI"
                  )}
            </Button>
          </div>
          {suggestedResolution ? (
            <div className="mt-3 border-t border-sky-400/20 pt-2">
              <div className="text-[10px] font-bold tracking-[0.12em] text-sky-200 uppercase">
                {translate(
                  "it.requests.ai.suggestedResolution",
                  { ns: "starter" },
                  "Suggested resolution"
                )}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {suggestedResolution}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {fieldConfig[page].map(([name, label, type]) => (
        <label
          key={name}
          className={`grid gap-1 text-xs font-medium ${
            type === "textarea" ? "sm:col-span-2" : ""
          }`}
        >
          <span>
            {translate(label.key, { ns: "starter" }, label.fallback)}
          </span>
          {type === "textarea" ? (
            <Textarea
              name={name}
              value={page === "requests" ? requestValues[name] ?? "" : undefined}
              onChange={
                page === "requests"
                  ? (event) =>
                      setRequestValues((values) => ({
                        ...values,
                        [name]: event.target.value,
                      }))
                  : undefined
              }
              className="min-h-20"
            />
          ) : (
            <Input
              name={name}
              type={type}
              value={page === "requests" ? requestValues[name] ?? "" : undefined}
              onChange={
                page === "requests"
                  ? (event) =>
                      setRequestValues((values) => ({
                        ...values,
                        [name]: event.target.value,
                      }))
                  : undefined
              }
              required={name === "name" || name === "subject" || name === "issue"}
            />
          )}
        </label>
      ))}

      {error ? (
        <div className="text-xs text-rose-300 sm:col-span-2">{error}</div>
      ) : null}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={() => void close()}>
          {translate(
            "buttons.cancel",
            { ns: "starter" },
            "Cancel"
          )}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving
            ? translate(
                "it.create.saving",
                { ns: "starter" },
                "Saving..."
              )
            : translate(
                config.action.key,
                { ns: "starter" },
                config.action.fallback
              )}
        </Button>
      </div>
    </form>
  );
}

export function AssetHistoryRoute() {
  const translate = useTranslate();
  const { assetId } = useParams<{ assetId: string }>();
  const closeTo = useContextualCloseTo();
  const [asset, setAsset] = useState<RecordRow | null>(null);
  const [repairs, setRepairs] = useState<RecordRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = Number(assetId);
    if (!Number.isFinite(id)) {
      setError(
        translate(
          "it.assets.history.invalidId",
          { ns: "starter" },
          "Invalid asset ID."
        )
      );
      setLoading(false);
      return;
    }

    setAsset(null);
    setRepairs([]);
    setError("");
    setLoading(true);
    Promise.all([
      nocobaseClient.action<RecordRow>("it_assets", "get", {
        query: { filterByTk: id },
      }),
      nocobaseClient.request<{ data?: RecordRow[] }>(
        `it_assets/${id}/repairs:list`,
        { query: { pageSize: 50 }, unwrap: "none" }
      ),
    ])
      .then(([current, repairData]) => {
        setAsset(current);
        setRepairs(repairData.data ?? []);
      })
      .catch((reason) =>
        setError(
          getErrorMessage(
            reason,
            translate(
              "it.common.unknownError",
              { ns: "starter" },
              "Unknown error"
            )
          )
        )
      )
      .finally(() => setLoading(false));
  }, [assetId, translate]);

  return (
    <RouteDrawer
      title={
        asset
          ? String(asset.name)
          : translate(
              "it.assets.history.title",
              { ns: "starter" },
              "Asset history"
            )
      }
      description={
        asset
          ? `${String(asset.assetTag ?? "")} · ${String(asset.model ?? "")}`
          : error ||
            translate(
              "it.assets.history.loading",
              { ns: "starter" },
              "Loading repair history..."
            )
      }
      closeLabel={translate(
        "buttons.close",
        { ns: "starter" },
        "Close"
      )}
      closeTo={closeTo}
      className="bg-popover"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {error ? (
          <div className="mb-4 rounded-md border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
            {translate(
              "it.assets.history.loadError",
              { ns: "starter", error },
              "Could not load asset history: {{error}}"
            )}
          </div>
        ) : null}
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
          <HistoryFact
            label={translate(
              "it.fields.status",
              { ns: "starter" },
              "Status"
            )}
            value={asset?.status}
            translateValue
          />
          <HistoryFact
            label={translate(
              "it.columns.warranty",
              { ns: "starter" },
              "Warranty"
            )}
            value={asset?.warrantyExpiry}
          />
          <HistoryFact
            label={translate(
              "it.fields.location",
              { ns: "starter" },
              "Location"
            )}
            value={asset?.location}
          />
          <HistoryFact
            label={translate(
              "it.fields.serial",
              { ns: "starter" },
              "Serial"
            )}
            value={asset?.serialNumber}
          />
        </div>
        <div className="mb-2 text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
          {translate(
            "it.assets.history.heading",
            { ns: "starter" },
            "Repair & maintenance history"
          )}
        </div>
        <div className="space-y-3">
          {repairs.map((repair) => (
            <div
              key={repair.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex justify-between gap-2">
                <span className="text-sm font-medium">
                  {String(repair.issue)}
                </span>
                <Chip value={repair.status} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>
                  {String(
                    repair.vendor ||
                      translate(
                        "it.common.internalIt",
                        { ns: "starter" },
                        "Internal IT"
                      )
                  )}
                </span>
                <span>
                  {translate(
                    "it.assets.history.dateRange",
                    {
                      ns: "starter",
                      start: String(repair.startedAt || "-"),
                      end: String(
                        repair.completedAt ||
                          translate(
                            "it.assets.history.openEnd",
                            { ns: "starter" },
                            "open"
                          )
                      ),
                    },
                    "{{start}} to {{end}}"
                  )}
                </span>
              </div>
              {repair.notes ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {String(repair.notes)}
                </p>
              ) : null}
            </div>
          ))}
          {!repairs.length && !error ? (
            <Empty
              label={
                loading
                  ? translate(
                      "it.assets.history.loading",
                      { ns: "starter" },
                      "Loading repair history..."
                    )
                  : translate(
                      "it.assets.history.empty",
                      { ns: "starter" },
                      "No repair records for this asset"
                    )
              }
            />
          ) : null}
        </div>
      </div>
    </RouteDrawer>
  );
}

function HistoryFact({
  label,
  value,
  translateValue = false,
}: {
  label: string;
  value: unknown;
  translateValue?: boolean;
}) {
  const translate = useTranslate();
  return (
    <div className="rounded-sm border border-border bg-muted/25 p-2">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 truncate font-medium">
        {value && translateValue
          ? translateBusinessValue(value, translate)
          : String(value || "-")}
      </div>
    </div>
  );
}

export function ItConsolePage({ page }: { page: ItConsolePageName }) {
  return page === "dashboard" ? <Dashboard /> : <ListPage page={page} />;
}
