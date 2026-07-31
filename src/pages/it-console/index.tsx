import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { nocobaseClient } from "@/lib/nocobase/client";

type Page = "dashboard" | "assets" | "requests" | "licenses" | "repairs";
type RecordRow = Record<string, unknown> & { id: number };
type Summary = { label: string; value: number };

const colors = ["#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#a78bfa"];
const pageConfig = {
  assets: { title: "Asset register", resource: "it_assets", action: "Add asset", icon: Boxes },
  requests: { title: "Request queue", resource: "it_requests", action: "New request", icon: ClipboardList },
  licenses: { title: "License inventory", resource: "it_licenses", action: "Add license", icon: ShieldCheck },
  repairs: { title: "Repair desk", resource: "it_repairs", action: "Log repair", icon: Wrench },
} as const;

const fieldConfig: Record<Exclude<Page, "dashboard">, Array<[string, string, "text" | "date" | "number" | "textarea"]>> = {
  assets: [["name", "Asset name", "text"], ["assetTag", "Asset tag", "text"], ["category", "Type", "text"], ["brand", "Brand", "text"], ["model", "Model", "text"], ["status", "Status", "text"], ["location", "Location", "text"], ["warrantyExpiry", "Warranty expiry", "date"]],
  requests: [["subject", "Subject", "text"], ["requestType", "Request type", "text"], ["priority", "Priority", "text"], ["status", "Status", "text"], ["category", "Category", "text"], ["description", "Description", "textarea"]],
  licenses: [["name", "Product", "text"], ["vendor", "Vendor", "text"], ["licenseType", "License type", "text"], ["seatsTotal", "Seats total", "number"], ["seatsUsed", "Seats used", "number"], ["renewalDate", "Renewal date", "date"], ["status", "Status", "text"]],
  repairs: [["issue", "Issue", "textarea"], ["status", "Status", "text"], ["vendor", "Vendor", "text"], ["cost", "Cost", "number"], ["startedAt", "Started", "date"], ["completedAt", "Completed", "date"], ["notes", "Service notes", "textarea"]],
};

const statusTone = (value: unknown) => {
  const normal = String(value ?? "").toLowerCase();
  if (/(active|available|completed|resolved|closed|in stock)/.test(normal)) return "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30";
  if (/(critical|overdue|retired|cancelled|blocked)/.test(normal)) return "bg-rose-400/15 text-rose-300 ring-rose-400/30";
  if (/(repair|pending|open|assigned|expiring|in progress)/.test(normal)) return "bg-amber-400/15 text-amber-300 ring-amber-400/30";
  return "bg-sky-400/15 text-sky-300 ring-sky-400/30";
};

function Chip({ value }: { value: unknown }) {
  return <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ring-1 ${statusTone(value)}`}>{String(value || "Unspecified")}</span>;
}

async function list(resource: string, options: Record<string, unknown> = {}) {
  return nocobaseClient.action<{ data?: RecordRow[]; meta?: { count?: number } }>(resource, "list", { query: { pageSize: 100, ...(options as Record<string, string | number>) }, unwrap: "none" });
}

async function grouped(resource: string): Promise<Summary[]> {
  const payload = await nocobaseClient.action<{ data?: Summary[] }>(resource, "query", {
    method: "POST",
    body: { measures: [{ field: ["id"], aggregation: "count", alias: "value" }], dimensions: [{ field: ["status"], alias: "label" }], orders: [{ field: ["status"], alias: "label", order: "asc" }] },
    unwrap: "none",
  });
  return payload.data ?? [];
}

function Metric({ label, value, detail, icon: Icon, tone = "text-sky-300" }: { label: string; value: number; detail: string; icon: typeof Boxes; tone?: string }) {
  return <Card className="ops-panel rounded-md"><CardContent className="flex items-center gap-3 p-3"><div className={`rounded-md bg-background/70 p-2 ${tone}`}><Icon className="size-4" /></div><div><div className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{label}</div><div className="font-mono text-2xl font-semibold leading-6">{value}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{detail}</div></div></CardContent></Card>;
}

function Dashboard() {
  const [assets, setAssets] = useState<Summary[]>([]);
  const [requests, setRequests] = useState<Summary[]>([]);
  const [warranties, setWarranties] = useState<RecordRow[]>([]);
  const [totals, setTotals] = useState({ assets: 0, requests: 0, repairs: 0 });
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([grouped("it_assets"), grouped("it_requests"), list("it_assets", { sort: "warrantyExpiry" }), list("it_assets"), list("it_requests"), list("it_repairs")]).then(([assetGroups, requestGroups, warrantyList, assetList, requestList, repairList]) => { setAssets(assetGroups); setRequests(requestGroups); setWarranties((warrantyList.data ?? []).filter((item) => item.warrantyExpiry).slice(0, 5)); setTotals({ assets: assetList.meta?.count ?? assetList.data?.length ?? 0, requests: requestList.meta?.count ?? requestList.data?.length ?? 0, repairs: repairList.meta?.count ?? repairList.data?.length ?? 0 }); }).catch((cause) => setError(cause.message)); }, []);
  const open = requests.filter((item) => !/(completed|resolved|closed|cancelled)/i.test(item.label)).reduce((total, item) => total + Number(item.value), 0);
  return <div className="ops-grid min-h-full space-y-4 p-4 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[0.18em] text-sky-300 uppercase">IT operations / live control plane</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Operational dashboard</h1></div><div className="rounded-sm border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-300" />System data online</div></div>{error && <div className="rounded-md border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">Could not load dashboard: {error}</div>}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Managed assets" value={totals.assets} detail="Registered hardware" icon={Boxes} /><Metric label="Open requests" value={open} detail={`${totals.requests} total submitted`} icon={ClipboardList} tone="text-amber-300" /><Metric label="Repair activity" value={totals.repairs} detail="Maintenance records" icon={Wrench} tone="text-violet-300" /><Metric label="Warranty watch" value={warranties.length} detail="Next renewal dates" icon={AlertTriangle} tone="text-rose-300" /></div><div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.9fr]"><ChartPanel title="Assets by status"><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={assets} dataKey="value" nameKey="label" innerRadius={52} outerRadius={78} paddingAngle={4}>{assets.map((entry, index) => <Cell key={entry.label} fill={colors[index % colors.length]} />)}</Pie><Tooltip contentStyle={{ background: "#182235", border: "1px solid #334155", borderRadius: 4 }} /></PieChart></ResponsiveContainer><Legend items={assets} /></ChartPanel><ChartPanel title="Open requests by status"><ResponsiveContainer width="100%" height={230}><BarChart data={requests} margin={{ left: -18, right: 4 }}><CartesianGrid stroke="#334155" vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: "#182235", border: "1px solid #334155", borderRadius: 4 }} /><Bar dataKey="value" radius={[3, 3, 0, 0]} fill="#38bdf8" /></BarChart></ResponsiveContainer></ChartPanel><ChartPanel title="Warranty watch"><div className="space-y-2">{warranties.map((asset) => <div key={asset.id} className="flex items-center justify-between border-b border-border/70 pb-2 last:border-0"><div><div className="text-sm font-medium">{String(asset.name)}</div><div className="font-mono text-[10px] text-muted-foreground">{String(asset.assetTag)}</div></div><div className="text-right"><div className="text-xs text-amber-300">{String(asset.warrantyExpiry)}</div><div className="text-[10px] text-muted-foreground">warranty expiry</div></div></div>)}{!warranties.length && <Empty label="No warranty dates recorded" />}</div></ChartPanel></div></div>;
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) { return <Card className="ops-panel rounded-md"><CardContent className="p-3"><div className="mb-2 border-b border-border/70 pb-2 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">{title}</div>{children}</CardContent></Card>; }
function Legend({ items }: { items: Summary[] }) { return <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-muted-foreground">{items.map((item, index) => <div key={item.label} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{item.label} <span className="ml-auto font-mono text-foreground">{item.value}</span></div>)}</div>; }
function Empty({ label }: { label: string }) { return <div className="py-8 text-center text-xs text-muted-foreground">{label}</div>; }

function ListPage({ page }: { page: Exclude<Page, "dashboard"> }) {
  const config = pageConfig[page];
  const Icon = config.icon;
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const assetId = new URLSearchParams(location.search).get("assetId");
  const reload = () => list(config.resource, { sort: "-createdAt" }).then((result) => setRows(result.data ?? [])).catch((cause) => setError(cause.message));
  useEffect(() => { reload(); }, [config.resource]);
  const columns = page === "assets" ? ["assetTag", "name", "category", "brand", "location", "warrantyExpiry", "status"] : page === "requests" ? ["subject", "requestType", "priority", "status", "requester", "assignee"] : page === "licenses" ? ["name", "vendor", "licenseType", "seatsTotal", "seatsUsed", "renewalDate", "status"] : ["issue", "asset", "vendor", "startedAt", "completedAt", "cost", "status"];
  const labels: Record<string, string> = { assetTag: "Tag", name: "Asset / product", category: "Type", brand: "Brand", location: "Location", warrantyExpiry: "Warranty", status: "Status", subject: "Request", requestType: "Type", priority: "Priority", requester: "Requester", assignee: "Assignee", vendor: "Vendor", licenseType: "License", seatsTotal: "Seats", seatsUsed: "Used", renewalDate: "Renewal", issue: "Issue", asset: "Asset", startedAt: "Opened", completedAt: "Completed", cost: "Cost" };
  return <div className="ops-grid min-h-full p-4 sm:p-6"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[0.18em] text-sky-300 uppercase">IT operations / {page}</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Icon className="size-5 text-sky-300" />{config.title}</h1></div><Button size="sm" onClick={() => setCreateOpen(true)}><Plus />{config.action}</Button></div>{error && <div className="mb-3 rounded-md border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">Could not load {page}: {error}</div>}<Card className="ops-panel overflow-hidden rounded-md"><div className="flex items-center justify-between border-b border-border/70 bg-muted/20 px-3 py-2"><span className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{rows.length} records</span><span className="font-mono text-[10px] text-muted-foreground">LIVE COLLECTION: {config.resource}</span></div><div className="overflow-x-auto"><Table><TableHeader><TableRow className="hover:bg-transparent">{columns.map((column) => <TableHead key={column} className="h-8 whitespace-nowrap text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">{labels[column] ?? column}</TableHead>)}{page === "assets" && <TableHead className="h-8" />}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id} className="border-border/60 hover:bg-sky-400/5">{columns.map((column) => <TableCell key={column} className="h-10 whitespace-nowrap py-1.5 text-xs">{column === "status" || column === "priority" ? <Chip value={row[column]} /> : relationLabel(row[column])}</TableCell>)}{page === "assets" && <TableCell className="py-1 text-right"><Button size="xs" variant="ghost" onClick={() => navigate(`/assets?assetId=${row.id}`)}>History <ArrowUpRight /></Button></TableCell>}</TableRow>)}{!rows.length && <TableRow><TableCell colSpan={columns.length + 1}><Empty label={`No ${page} records yet`} /></TableCell></TableRow>}</TableBody></Table></div></Card><CreateDialog page={page} open={isCreateOpen} onOpenChange={setCreateOpen} onCreated={reload} /><AssetHistory assetId={assetId ? Number(assetId) : null} onClose={() => navigate("/assets")} /></div>;
}

function relationLabel(value: unknown) { if (value && typeof value === "object") return String((value as Record<string, unknown>).nickname ?? (value as Record<string, unknown>).name ?? "-"); return value === null || value === undefined || value === "" ? "-" : String(value); }

function analyzeRequest(problem: string) {
  const text = problem.toLowerCase();
  const isAccess = /(password|login|sign in|account|access|permission|mfa|vpn)/.test(text);
  const isHardware = /(laptop|computer|monitor|keyboard|mouse|headset|phone|printer|screen|battery|charger)/.test(text);
  const isSoftware = /(software|application|app|install|license|outlook|teams|browser|excel|word)/.test(text);
  const isNetwork = /(wifi|wi-fi|network|internet|connection|vpn|slow)/.test(text);
  const priority = /(urgent|critical|down|outage|cannot work|can't work|blocked|security)/.test(text) ? "High" : /(soon|important|slow|intermittent)/.test(text) ? "Medium" : "Low";
  const category = isAccess ? "Access & identity" : isNetwork ? "Network & connectivity" : isHardware ? "Hardware" : isSoftware ? "Software & licensing" : "General IT support";
  const requestType = /(new|need|request|install|replacement|replace|upgrade)/.test(text) ? "Service request" : "Incident";
  const resolution = isAccess
    ? "Confirm the affected account and access level, then reset credentials or review the requested permission."
    : isNetwork
      ? "Check the device connection and VPN status first, then collect network diagnostics if the issue continues."
      : isHardware
        ? "Run a basic hardware check and arrange a replacement or repair if the fault is confirmed."
        : isSoftware
          ? "Verify the affected application, license entitlement, and current version before applying a fix."
          : "Review the reported symptoms, confirm the affected service, and route the request to the appropriate IT queue.";
  return { requestType, priority, category, resolution };
}

function CreateDialog({ page, open, onOpenChange, onCreated }: { page: Exclude<Page, "dashboard">; open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requestValues, setRequestValues] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState("");
  const [suggestedResolution, setSuggestedResolution] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const config = pageConfig[page];
  const close = (nextOpen: boolean) => { if (!nextOpen) { setRequestValues({}); setProblem(""); setSuggestedResolution(""); setError(""); } onOpenChange(nextOpen); };
  const fillWithAi = () => { if (!problem.trim()) { setError("Describe the problem first so AI assist can classify it."); return; } setAnalyzing(true); setError(""); window.setTimeout(() => { const result = analyzeRequest(problem); setRequestValues((values) => ({ ...values, requestType: result.requestType, priority: result.priority, category: result.category, description: values.description || problem })); setSuggestedResolution(result.resolution); setAnalyzing(false); }, 350); };
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values: Record<string, unknown> = page === "requests" ? { ...requestValues } : Object.fromEntries(new FormData(event.currentTarget)); for (const [key, value] of Object.entries(values)) if (value === "") delete values[key]; ["seatsTotal", "seatsUsed", "cost"].forEach((key) => { if (typeof values[key] === "string") values[key] = Number(values[key]); }); setSaving(true); setError(""); try { await nocobaseClient.action(config.resource, "create", { method: "POST", body: values }); close(false); onCreated(); } catch (cause) { setError((cause as Error).message); } finally { setSaving(false); } };
  return <Dialog open={open} onOpenChange={close}><DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto border-border bg-popover p-4 sm:max-w-xl"><DialogHeader><DialogTitle>{config.action}</DialogTitle><DialogDescription>Create directly in the existing {config.resource} collection.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">{page === "requests" && <section className="ops-panel relative overflow-hidden rounded-md border border-sky-400/35 bg-sky-400/[0.07] p-3 sm:col-span-2"><div className="absolute inset-y-0 left-0 w-0.5 bg-sky-300" /><div className="mb-2 flex items-center gap-2 text-sky-200"><span className="grid size-6 place-items-center rounded-sm bg-sky-400/15"><Sparkles className="size-3.5" /></span><div><div className="text-xs font-bold tracking-[0.12em] uppercase">AI assist</div><p className="text-[11px] text-muted-foreground">Describe the problem in plain English. AI assist will structure the request for you.</p></div></div><Textarea aria-label="Describe your IT problem" value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="Example: I cannot connect to VPN after resetting my password and need access before today's client call." className="min-h-20 border-sky-400/20 bg-background/60 text-sm" /><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-medium tracking-wide text-sky-200/80 uppercase">Local analysis · no data leaves this form</span><Button type="button" size="sm" onClick={fillWithAi} disabled={analyzing}><Sparkles />{analyzing ? "Analyzing..." : "Fill with AI"}</Button></div>{suggestedResolution && <div className="mt-3 border-t border-sky-400/20 pt-2"><div className="text-[10px] font-bold tracking-[0.12em] text-sky-200 uppercase">Suggested resolution</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{suggestedResolution}</p></div>}</section>}{fieldConfig[page].map(([name, label, type]) => <label key={name} className={`grid gap-1 text-xs font-medium ${type === "textarea" ? "sm:col-span-2" : ""}`}><span>{label}</span>{type === "textarea" ? <Textarea name={name} value={page === "requests" ? requestValues[name] ?? "" : undefined} onChange={page === "requests" ? (event) => setRequestValues((values) => ({ ...values, [name]: event.target.value })) : undefined} className="min-h-20" /> : <Input name={name} type={type} value={page === "requests" ? requestValues[name] ?? "" : undefined} onChange={page === "requests" ? (event) => setRequestValues((values) => ({ ...values, [name]: event.target.value })) : undefined} required={name === "name" || name === "subject" || name === "issue"} />}</label>)}{error && <div className="sm:col-span-2 text-xs text-rose-300">{error}</div>}<div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : config.action}</Button></div></form></DialogContent></Dialog>;
}

function AssetHistory({ assetId, onClose }: { assetId: number | null; onClose: () => void }) {
  const [asset, setAsset] = useState<RecordRow | null>(null);
  const [repairs, setRepairs] = useState<RecordRow[]>([]);
  useEffect(() => { if (!assetId) return; Promise.all([nocobaseClient.action<RecordRow>("it_assets", "get", { query: { filterByTk: assetId } }), nocobaseClient.request<{ data?: RecordRow[] }>(`it_assets/${assetId}/repairs:list`, { query: { pageSize: 50 }, unwrap: "none" })]).then(([current, repairData]) => { setAsset(current); setRepairs(repairData.data ?? []); }).catch(() => { setAsset(null); setRepairs([]); }); }, [assetId]);
  return <Drawer open={Boolean(assetId)} onOpenChange={(open) => !open && onClose()} swipeDirection="right"><DrawerContent className="bg-popover"><DrawerHeader className="border-b border-border"><div className="flex items-start justify-between gap-3"><div><DrawerTitle>{asset ? String(asset.name) : "Asset history"}</DrawerTitle><DrawerDescription>{asset ? `${String(asset.assetTag ?? "")} · ${String(asset.model ?? "")}` : "Loading repair history..."}</DrawerDescription></div><DrawerClose render={<Button size="icon-sm" variant="ghost" />}><X /></DrawerClose></div></DrawerHeader><div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="mb-4 grid grid-cols-2 gap-2 text-xs"><HistoryFact label="Status" value={asset?.status} /><HistoryFact label="Warranty" value={asset?.warrantyExpiry} /><HistoryFact label="Location" value={asset?.location} /><HistoryFact label="Serial" value={asset?.serialNumber} /></div><div className="mb-2 text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Repair & maintenance history</div><div className="space-y-3">{repairs.map((repair) => <div key={repair.id} className="rounded-md border border-border bg-muted/20 p-3"><div className="flex justify-between gap-2"><span className="text-sm font-medium">{String(repair.issue)}</span><Chip value={repair.status} /></div><div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{String(repair.vendor || "Internal IT")}</span><span>{String(repair.startedAt || "-")} to {String(repair.completedAt || "open")}</span></div>{Boolean(repair.notes) && <p className="mt-2 text-xs text-muted-foreground">{String(repair.notes)}</p>}</div>)}{!repairs.length && <Empty label="No repair records for this asset" />}</div></div></DrawerContent></Drawer>;
}
function HistoryFact({ label, value }: { label: string; value: unknown }) { return <div className="rounded-sm border border-border bg-muted/25 p-2"><div className="text-[10px] text-muted-foreground uppercase">{label}</div><div className="mt-0.5 truncate font-medium">{String(value || "-")}</div></div>; }

export function ItConsolePage({ page }: { page: Page }) { return page === "dashboard" ? <Dashboard /> : <ListPage page={page} />; }
