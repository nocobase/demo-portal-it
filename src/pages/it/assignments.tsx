import { useList, useTranslate, type CrudFilters } from "@refinedev/core";
import { Boxes, PackageCheck, ClipboardList, Users } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  EmptyState,
  KpiCard,
  PageHeader,
  formatDate,
  personName,
  tt,
  useCountWhere,
  useDimensionCounts,
  type AssignmentRecord,
  type UserRef,
} from "./lib";
import { ListPagination, useListPagination } from "./pagination";

// An assignment is active until it is checked back in. Absence is tested with
// eq/ne against null rather than the "null"/"nnull" operators, which map to
// $null/$notNull and match nothing on a date column in this NocoBase build.
const ACTIVE_FILTERS: CrudFilters = [
  { field: "checkedInAt", operator: "eq", value: null },
];
const HISTORY_FILTERS: CrudFilters = [
  { field: "checkedInAt", operator: "ne", value: null },
];

// The active view pages over employee cards rather than rows: a card has to
// list all of that person's devices to mean anything, so a group is never
// split across a page boundary.
const GROUPS_PER_PAGE = 12;

export function AssignmentsOverview() {
  const translate = useTranslate();
  const [view, setView] = useState<"active" | "history">("active");

  // KPI figures are aggregated server-side, so they cover the whole table no
  // matter which view or page is on screen. Grouping the active rows by member
  // gives both the active count and the number of distinct employees.
  const {
    counts: activeByMember,
    total: activeTotal,
    isLoading: activeCountsLoading,
  } = useDimensionCounts("it_assignments", "memberId", ACTIVE_FILTERS);
  const { value: returnedTotal, isLoading: returnedLoading } = useCountWhere(
    "it_assignments",
    HISTORY_FILTERS
  );

  const distinctActiveMembers = Object.keys(activeByMember).length;
  const avgPerEmployee =
    distinctActiveMembers > 0 ? activeTotal / distinctActiveMembers : 0;

  const activeQuery = useList<AssignmentRecord>({
    resource: "it_assignments",
    pagination: { mode: "server", currentPage: 1, pageSize: 500 },
    filters: ACTIVE_FILTERS,
    sorters: [{ field: "checkedOutAt", order: "desc" }],
    meta: { appends: ["asset", "member"] },
    queryOptions: { retry: false, enabled: view === "active" },
  });

  const historyPagination = useListPagination("history");
  const historyQuery = useList<AssignmentRecord>({
    resource: "it_assignments",
    pagination: {
      mode: "server",
      currentPage: historyPagination.currentPage,
      pageSize: historyPagination.pageSize,
    },
    filters: HISTORY_FILTERS,
    sorters: [{ field: "checkedInAt", order: "desc" }],
    meta: { appends: ["asset", "member"] },
    queryOptions: { retry: false, enabled: view === "history" },
  });

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { member: UserRef | null | undefined; items: AssignmentRecord[] }
    >();
    for (const r of activeQuery.result.data) {
      const key = r.memberId != null ? String(r.memberId) : `unknown-${r.id}`;
      if (!map.has(key)) map.set(key, { member: r.member, items: [] });
      map.get(key)!.items.push(r);
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [activeQuery.result.data]);

  const activePagination = useListPagination("active", GROUPS_PER_PAGE);
  const groupPage = groups.slice(
    (activePagination.currentPage - 1) * activePagination.pageSize,
    activePagination.currentPage * activePagination.pageSize
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.assignments.title", "Assignments")}
        description={tt(
          translate,
          "it.assignments.description",
          "Every device currently in someone's hands, plus the return history."
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={tt(translate, "it.assignments.kpi.active", "Active assignments")}
          value={activeTotal}
          icon={<ClipboardList />}
          loading={activeCountsLoading}
        />
        <KpiCard
          label={tt(translate, "it.assignments.kpi.employees", "Employees with devices")}
          value={distinctActiveMembers}
          icon={<Users />}
          loading={activeCountsLoading}
        />
        <KpiCard
          label={tt(translate, "it.assignments.kpi.returned", "Devices returned")}
          value={returnedTotal}
          icon={<PackageCheck />}
          tone="success"
          loading={returnedLoading}
        />
        <KpiCard
          label={tt(translate, "it.assignments.kpi.avg", "Avg devices/employee")}
          value={avgPerEmployee.toFixed(1)}
          icon={<Boxes />}
          loading={activeCountsLoading}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          active={view === "active"}
          onClick={() => setView("active")}
          label={tt(translate, "it.assignments.filter.active", "Currently assigned")}
          count={activeTotal}
        />
        <FilterChip
          active={view === "history"}
          onClick={() => setView("history")}
          label={tt(translate, "it.assignments.filter.history", "Return history")}
          count={returnedTotal}
        />
      </div>

      {view === "active" ? (
        <>
          <ActiveView
            groups={groupPage}
            loading={activeQuery.query.isLoading}
            translate={translate}
          />
          <ListPagination {...activePagination} total={groups.length} />
        </>
      ) : (
        <>
          <HistoryView
            rows={historyQuery.result.data}
            loading={historyQuery.query.isLoading}
            translate={translate}
          />
          <ListPagination
            {...historyPagination}
            total={historyQuery.result.total}
          />
        </>
      )}
    </div>
  );
}

function ActiveView({
  groups,
  loading,
  translate,
}: {
  groups: { member: UserRef | null | undefined; items: AssignmentRecord[] }[];
  loading: boolean;
  translate: ReturnType<typeof useTranslate>;
}) {
  if (loading) {
    return <EmptyState label={tt(translate, "it.common.loading", "Loading...")} />;
  }
  if (groups.length === 0) {
    return (
      <EmptyState
        label={tt(translate, "it.assignments.empty.active", "No devices are currently checked out.")}
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((g, idx) => (
        <div key={idx} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{personName(g.member)}</span>
            <Badge variant="outline" className="h-6 shadow-none tabular-nums">
              {g.items.length}
            </Badge>
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {g.items.map((item) => (
              <li key={item.id} className="rounded-lg border bg-muted/40 p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{item.asset?.name ?? "—"}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.asset?.assetTag ?? ""}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  {item.asset?.category ? <span>{item.asset.category}</span> : null}
                  <span>
                    {tt(translate, "it.assignments.field.checkedOut", "Checked out")}{" "}
                    {formatDate(item.checkedOutAt)}
                  </span>
                </div>
                {item.notes ? (
                  <div className="mt-1 text-xs text-muted-foreground">{item.notes}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function HistoryView({
  rows,
  loading,
  translate,
}: {
  rows: AssignmentRecord[];
  loading: boolean;
  translate: ReturnType<typeof useTranslate>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{tt(translate, "it.field.asset", "Asset")}</TableHead>
              <TableHead>{tt(translate, "it.field.assignee", "Employee")}</TableHead>
              <TableHead>{tt(translate, "it.assignments.field.checkedOut", "Checked out")}</TableHead>
              <TableHead>{tt(translate, "it.assignments.field.checkedIn", "Returned")}</TableHead>
              <TableHead>{tt(translate, "it.field.notes", "Notes")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.asset?.name ?? "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {r.asset?.assetTag ?? "—"}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{personName(r.member)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.checkedOutAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.checkedInAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.notes ?? "—"}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    label={
                      loading
                        ? tt(translate, "it.common.loading", "Loading...")
                        : tt(translate, "it.assignments.empty.history", "No returns recorded yet.")
                    }
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
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
