import type { useTranslate } from "@refinedev/core";
import { nocobaseClient } from "@nocobase/portal-sdk/client";

import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/app-shell/breadcrumb";
import { cn } from "@/lib/utils";

export type Translate = ReturnType<typeof useTranslate>;

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export type UserRef = {
  id: number;
  nickname?: string | null;
  username?: string | null;
  email?: string | null;
};

export type AssetRecord = {
  id: number;
  name: string;
  assetTag?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  status?: string | null;
  location?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  purchaseCost?: number | null;
  retiredAt?: string | null;
  notes?: string | null;
  assigneeId?: number | null;
  assignee?: UserRef | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AssignmentRecord = {
  id: number;
  assetId?: number | null;
  asset?: AssetRecord | null;
  memberId?: number | null;
  member?: UserRef | null;
  checkedOutAt?: string | null;
  checkedInAt?: string | null;
  notes?: string | null;
  createdAt?: string;
};

export type LicenseRecord = {
  id: number;
  name: string;
  vendor?: string | null;
  licenseType?: string | null;
  seatsTotal?: number | null;
  seatsUsed?: number | null;
  renewalDate?: string | null;
  annualCost?: number | null;
  status?: string | null;
  version?: string | null;
  ownerId?: number | null;
  owner?: UserRef | null;
  notes?: string | null;
};

export type RepairRecord = {
  id: number;
  issue?: string | null;
  status?: string | null;
  vendor?: string | null;
  cost?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  assetId?: number | null;
  asset?: AssetRecord | null;
};

export type RequestTypeRecord = {
  id: number;
  name: string;
  category?: string | null;
  description?: string | null;
  defaultPriority?: string | null;
  slaHours?: number | null;
  requiresApproval?: boolean | null;
  icon?: string | null;
  active?: boolean | null;
  fulfillmentTeam?: string | null;
};

export type RequestRecord = {
  id: number;
  subject: string;
  requestType?: string | null;
  priority?: string | null;
  status?: string | null;
  category?: string | null;
  description?: string | null;
  resolution?: string | null;
  suggestedFix?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  slaDueAt?: string | null;
  requesterId?: number | null;
  requester?: UserRef | null;
  assigneeId?: number | null;
  assignee?: UserRef | null;
  assetId?: number | null;
  asset?: AssetRecord | null;
  requestTypeRefId?: number | null;
  requestTypeRef?: RequestTypeRecord | null;
  createdAt?: string;
  updatedAt?: string;
};

export type FulfillmentJobRecord = {
  id: number;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  instructions?: string | null;
  dueDate?: string | null;
  requestId?: number | null;
  request?: RequestRecord | null;
  assigneeId?: number | null;
  assignee?: UserRef | null;
};

export type RunbookRecord = {
  id: number;
  title: string;
  category?: string | null;
  summary?: string | null;
  body?: string | null;
  tags?: string | null;
  views?: number | null;
  published?: boolean | null;
  updatedAt?: string;
};

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const ASSET_STATUSES = [
  "In use",
  "Available",
  "Under repair",
  "In stock",
  "Retired",
] as const;

export const REQUEST_STATUSES = [
  "New",
  "Approved",
  "In progress",
  "Fulfilled",
  "Resolved",
  "Rejected",
  "Cancelled",
] as const;

export const REPAIR_STAGES = ["Open", "In progress", "Done"] as const;

export const FULFILLMENT_STAGES = [
  "Queued",
  "In progress",
  "Blocked",
  "Done",
] as const;

export const LICENSE_STATUSES = [
  "Active",
  "Expiring soon",
  "Expired",
  "Over-allocated",
] as const;

/* ------------------------------------------------------------------ */
/* i18n helper                                                         */
/* ------------------------------------------------------------------ */

export const tt = (
  translate: Translate,
  key: string,
  fallback: string,
  opts?: Record<string, unknown>
) => translate(key, { ns: "starter", ...(opts ?? {}) }, fallback);

// Translate any stored business value (status/category/priority) via a
// slugged key, falling back to the raw stored English value.
export const slug = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

export const tValue = (translate: Translate, value: unknown) => {
  const raw = String(value ?? "");
  if (!raw) return "";
  return translate(`it.value.${slug(raw)}`, { ns: "starter" }, raw);
};

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

export const personName = (user?: UserRef | null, fallback = "—") =>
  user?.nickname || user?.username || user?.email || fallback;

export const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const dd = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(dd.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dd);
};

export const money = (value?: number | null) =>
  value == null
    ? "—"
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);

export const daysUntil = (value?: string | null) => {
  if (!value) return null;
  const target = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  return Math.round((target.getTime() - now.getTime()) / 86400000);
};

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */

export type AggRow = Record<string, number | string | null>;

// Grouped aggregate query against a collection.
export const aggregate = (
  resource: string,
  dimension: string,
  filter?: Record<string, unknown>
) =>
  nocobaseClient.action<AggRow[]>(resource, "query", {
    body: {
      measures: [{ field: ["id"], aggregation: "count", alias: "n" }],
      dimensions: [{ field: [dimension], alias: "k" }],
      ...(filter ? { filter } : {}),
    },
  });

export const sumField = (
  resource: string,
  field: string,
  filter?: Record<string, unknown>
) =>
  nocobaseClient
    .action<AggRow[]>(resource, "query", {
      body: {
        measures: [{ field: [field], aggregation: "sum", alias: "s" }],
        ...(filter ? { filter } : {}),
      },
    })
    .then((rows) => Number(rows[0]?.s ?? 0));

export const countWhere = (resource: string, filter?: Record<string, unknown>) =>
  nocobaseClient
    .action<AggRow[]>(resource, "query", {
      body: {
        measures: [{ field: ["id"], aggregation: "count", alias: "n" }],
        ...(filter ? { filter } : {}),
      },
    })
    .then((rows) => Number(rows[0]?.n ?? 0));

/* ------------------------------------------------------------------ */
/* Chart theme (blue-forward, theme-aware)                             */
/* ------------------------------------------------------------------ */

export const CHART_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
];

// Semantic tone -> tailwind classes for pills (light + dark).
export type Tone =
  | "blue"
  | "sky"
  | "emerald"
  | "amber"
  | "orange"
  | "red"
  | "violet"
  | "slate";

export const TONE_CLASS: Record<Tone, string> = {
  blue: "border-blue-300/60 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300",
  sky: "border-sky-300/60 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300",
  emerald:
    "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber:
    "border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
  orange:
    "border-orange-300/60 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300",
  red: "border-red-300/60 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300",
  violet:
    "border-violet-300/60 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300",
  slate: "border-border bg-muted text-muted-foreground",
};

export const TONE_DOT: Record<Tone, string> = {
  blue: "bg-blue-500",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
  slate: "bg-muted-foreground",
};

export const TONE_HEX: Record<Tone, string> = {
  blue: "#2563eb",
  sky: "#0ea5e9",
  emerald: "#10b981",
  amber: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  violet: "#a855f7",
  slate: "#94a3b8",
};

// Map any stored status-ish value to a semantic tone.
export function toneFor(value: unknown): Tone {
  const s = slug(value);
  if (/(in_use|active|available|approved|fulfilled|resolved|done|published|completed|closed|on_track|in_stock)/.test(s))
    return "emerald";
  if (/(under_repair|open|new|queued|pending|expiring_soon|in_progress|assigned|scheduled|due_soon)/.test(s))
    return "amber";
  if (/(retired|rejected|expired|over_allocated|cancelled|blocked|overdue|critical)/.test(s))
    return "red";
  if (/(high|urgent)/.test(s)) return "orange";
  if (/(medium)/.test(s)) return "sky";
  if (/(low|draft|inactive)/.test(s)) return "slate";
  return "blue";
}

/* ------------------------------------------------------------------ */
/* Shared UI atoms                                                     */
/* ------------------------------------------------------------------ */

export function StatusPill({
  value,
  tone,
  className,
  withDot = true,
}: {
  value?: unknown;
  tone?: Tone;
  className?: string;
  withDot?: boolean;
}) {
  const t = tone ?? toneFor(value);
  return (
    <Badge
      variant="outline"
      className={cn("h-6 gap-1.5 whitespace-nowrap shadow-none", TONE_CLASS[t], className)}
    >
      {withDot ? (
        <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[t])} />
      ) : null}
      {String(value ?? "—")}
    </Badge>
  );
}

// StatusPill whose label is translated through it.value.<slug>.
export function ValuePill({
  translate,
  value,
  tone,
  className,
}: {
  translate: Translate;
  value?: unknown;
  tone?: Tone;
  className?: string;
}) {
  const t = tone ?? toneFor(value);
  return (
    <Badge
      variant="outline"
      className={cn("h-6 gap-1.5 whitespace-nowrap shadow-none", TONE_CLASS[t], className)}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[t])} />
      {value ? tValue(translate, value) : "—"}
    </Badge>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb = true,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {breadcrumb ? (
        <div className="flex items-center text-muted-foreground">
          <Breadcrumb />
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.035em]">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "danger" | "success" | "warning";
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon ? (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg [&_svg]:size-4",
              tone === "danger"
                ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                : tone === "success"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : tone === "warning"
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
        {loading ? "—" : value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">{label}</div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}

// Horizontal seat / usage meter.
export function Meter({
  value,
  max,
  tone = "blue",
}: {
  value: number;
  max: number;
  tone?: Tone;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const over = value > max;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", over ? "bg-red-500" : TONE_DOT[tone])}
        style={{ width: `${over ? 100 : pct}%` }}
      />
    </div>
  );
}
