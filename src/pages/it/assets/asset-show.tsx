import {
  useList,
  useShow,
  useTranslate,
  useUpdate,
  useCreate,
  useInvalidate,
  type HttpError,
} from "@refinedev/core";
import {
  ArrowLeftRight,
  Pencil,
  RotateCcw,
  Wrench,
  Archive,
  History,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useOutlet, useParams } from "react-router";

import { LoadingState } from "@/components/app-shell/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RouteDrawer } from "@/extensions/nocobase-route-surfaces";

import {
  Field,
  StatusPill,
  ValuePill,
  daysUntil,
  formatDate,
  money,
  personName,
  tt,
  type AssetRecord,
  type AssignmentRecord,
  type RepairRecord,
  type UserRef,
} from "../lib";
import { useContextualCloseTo, useOpenContextualChild } from "../route-surfaces";

type TimelineItem = {
  id: string;
  date: string | null | undefined;
  kind: "checkout" | "checkin" | "repair";
  title: string;
  detail?: string;
  status?: string;
};

export function AssetShow() {
  const translate = useTranslate();
  const { id } = useParams<{ id: string }>();
  const closeTo = useContextualCloseTo();
  const openChild = useOpenContextualChild();
  const nested = useOutlet();
  const invalidate = useInvalidate();
  const { result: record, query } = useShow<AssetRecord>({
    resource: "it_assets",
    id,
    meta: { appends: ["assignee"] },
  });
  const update = useUpdate<AssetRecord, HttpError>();
  const createAssignment = useCreate();
  const createRepair = useCreate();

  const { result: assignments, query: aq } = useList<AssignmentRecord>({
    resource: "it_assignments",
    filters: [{ field: "assetId", operator: "eq", value: id }],
    sorters: [{ field: "checkedOutAt", order: "desc" }],
    pagination: { mode: "off" },
    meta: { appends: ["member"] },
    queryOptions: { enabled: !!id, retry: false },
  });
  const { result: repairs, query: rq } = useList<RepairRecord>({
    resource: "it_repairs",
    filters: [{ field: "assetId", operator: "eq", value: id }],
    sorters: [{ field: "startedAt", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!id, retry: false },
  });
  const { result: users } = useList<UserRef>({
    resource: "users",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    queryOptions: { retry: false },
    errorNotification: false,
  });

  const [assignTo, setAssignTo] = useState("");
  const [repairIssue, setRepairIssue] = useState("");
  const [panel, setPanel] = useState<"none" | "assign" | "repair">("none");

  const refresh = () => {
    void query.refetch();
    void aq.refetch();
    void rq.refetch();
    invalidate({ resource: "it_assets", invalidates: ["list"] });
    invalidate({ resource: "it_assignments", invalidates: ["list"] });
    invalidate({ resource: "it_repairs", invalidates: ["list"] });
  };

  const nowIso = () => new Date().toISOString();
  const today = () => new Date().toISOString().slice(0, 10);

  const doAssign = () => {
    if (!record || !assignTo) return;
    update.mutate(
      { resource: "it_assets", id: record.id, values: { status: "In use", assigneeId: Number(assignTo) } },
      {
        onSuccess: () =>
          createAssignment.mutate(
            {
              resource: "it_assignments",
              values: { assetId: record.id, memberId: Number(assignTo), checkedOutAt: nowIso() },
            },
            {
              onSuccess: () => {
                setPanel("none");
                setAssignTo("");
                refresh();
              },
            }
          ),
      }
    );
  };

  const doReturn = () => {
    if (!record) return;
    const openAssignment = assignments.data.find((a) => !a.checkedInAt);
    update.mutate(
      { resource: "it_assets", id: record.id, values: { status: "Available", assigneeId: null } },
      {
        onSuccess: () => {
          if (openAssignment) {
            update.mutate(
              { resource: "it_assignments", id: openAssignment.id, values: { checkedInAt: nowIso() } },
              { onSuccess: refresh }
            );
          } else {
            refresh();
          }
        },
      }
    );
  };

  const doRepair = () => {
    if (!record || !repairIssue.trim()) return;
    update.mutate(
      { resource: "it_assets", id: record.id, values: { status: "Under repair" } },
      {
        onSuccess: () =>
          createRepair.mutate(
            {
              resource: "it_repairs",
              values: { assetId: record.id, issue: repairIssue.trim(), status: "Open", startedAt: today() },
            },
            {
              onSuccess: () => {
                setPanel("none");
                setRepairIssue("");
                refresh();
              },
            }
          ),
      }
    );
  };

  const doRetire = () => {
    if (!record) return;
    update.mutate(
      { resource: "it_assets", id: record.id, values: { status: "Retired", assigneeId: null, retiredAt: today() } },
      { onSuccess: refresh }
    );
  };

  const timeline: TimelineItem[] = [
    ...assignments.data.flatMap((a) => {
      const items: TimelineItem[] = [
        {
          id: `co-${a.id}`,
          date: a.checkedOutAt,
          kind: "checkout",
          title: tt(translate, "it.assets.timeline.assignedTo", "Assigned to {{name}}", {
            name: personName(a.member),
          }),
          detail: a.notes ?? undefined,
        },
      ];
      if (a.checkedInAt) {
        items.push({
          id: `ci-${a.id}`,
          date: a.checkedInAt,
          kind: "checkin",
          title: tt(translate, "it.assets.timeline.returned", "Returned by {{name}}", {
            name: personName(a.member),
          }),
        });
      }
      return items;
    }),
    ...repairs.data.map((r) => ({
      id: `rp-${r.id}`,
      date: r.startedAt,
      kind: "repair" as const,
      title: r.issue ?? tt(translate, "it.repairs.title", "Repair"),
      detail: [r.vendor, r.completedAt ? tt(translate, "it.assets.timeline.repairClosed", "closed {{d}}", { d: formatDate(r.completedAt) }) : undefined]
        .filter(Boolean)
        .join(" · "),
      status: r.status ?? undefined,
    })),
  ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

  const warrantyDays = daysUntil(record?.warrantyExpiry);

  return (
    <RouteDrawer
      title={
        query.isLoading && !record ? (
          <Skeleton className="h-6 w-56" />
        ) : (
          <span className="flex items-center gap-2">
            <span className="truncate">{record?.name ?? tt(translate, "it.assets.title", "Asset")}</span>
            {record ? <ValuePill translate={translate} value={record.status} /> : null}
          </span>
        )
      }
      description={record ? `${record.assetTag ?? ""} · ${record.brand ?? ""} ${record.model ?? ""}`.trim() : ""}
      closeLabel={tt(translate, "buttons.close", "Close")}
      closeTo={closeTo}
      nested={nested}
      actions={
        record ? (
          <Button type="button" variant="outline" size="sm" onClick={() => openChild("edit")}>
            <Pencil />
            {tt(translate, "buttons.edit", "Edit")}
          </Button>
        ) : null
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {query.isLoading ? (
          <LoadingState className="min-h-64" />
        ) : query.isError || !record ? (
          <Alert variant="destructive">
            <AlertDescription>
              {tt(translate, "it.assets.show.loadError", "This asset may no longer exist.")}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5">
            {/* Actions */}
            <section className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" disabled={update.mutation.isPending} onClick={() => setPanel(panel === "assign" ? "none" : "assign")}>
                <ArrowLeftRight />
                {tt(translate, "it.assets.actions.assign", "Assign")}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={update.mutation.isPending || !record.assigneeId} onClick={doReturn}>
                <RotateCcw />
                {tt(translate, "it.assets.actions.return", "Return")}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={update.mutation.isPending} onClick={() => setPanel(panel === "repair" ? "none" : "repair")}>
                <Wrench />
                {tt(translate, "it.assets.actions.repair", "Send to repair")}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={update.mutation.isPending || record.status === "Retired"} onClick={doRetire}>
                <Archive />
                {tt(translate, "it.assets.actions.retire", "Retire")}
              </Button>
            </section>

            {panel === "assign" ? (
              <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center">
                <Select value={assignTo} onValueChange={(v) => setAssignTo(v ?? "")}>
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder={tt(translate, "it.assets.actions.selectMember", "Select an employee")} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.data.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {personName(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" disabled={!assignTo} onClick={doAssign}>
                  {tt(translate, "it.assets.actions.confirmAssign", "Assign device")}
                </Button>
              </div>
            ) : null}

            {panel === "repair" ? (
              <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                <Textarea
                  value={repairIssue}
                  onChange={(e) => setRepairIssue(e.target.value)}
                  placeholder={tt(translate, "it.assets.actions.issuePlaceholder", "Describe the fault to send for repair...")}
                  className="min-h-20"
                />
                <div className="flex justify-end">
                  <Button type="button" size="sm" disabled={!repairIssue.trim()} onClick={doRepair}>
                    {tt(translate, "it.assets.actions.openRepair", "Open repair ticket")}
                  </Button>
                </div>
              </div>
            ) : null}

            <Separator />

            {/* Facts */}
            <section className="grid gap-3 sm:grid-cols-2">
              <Field label={tt(translate, "it.field.category", "Category")}>
                {record.category ? tt(translate, `it.value.${record.category.toLowerCase()}`, record.category) : "—"}
              </Field>
              <Field label={tt(translate, "it.field.assignee", "Assigned to")}>
                {record.assignee ? personName(record.assignee) : tt(translate, "it.common.unassigned", "Unassigned")}
              </Field>
              <Field label={tt(translate, "it.field.serial", "Serial number")}>{record.serialNumber ?? "—"}</Field>
              <Field label={tt(translate, "it.field.location", "Location")}>{record.location ?? "—"}</Field>
              <Field label={tt(translate, "it.field.purchaseDate", "Purchase date")}>{formatDate(record.purchaseDate)}</Field>
              <Field label={tt(translate, "it.field.purchaseCost", "Purchase cost")}>{money(record.purchaseCost)}</Field>
              <Field label={tt(translate, "it.field.warrantyExpiry", "Warranty expiry")}>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                  {formatDate(record.warrantyExpiry)}
                  {warrantyDays != null ? (
                    <StatusPill
                      withDot={false}
                      value={
                        warrantyDays < 0
                          ? tt(translate, "it.assets.warranty.expired", "expired")
                          : tt(translate, "it.assets.warranty.inDays", "{{n}}d left", { n: warrantyDays })
                      }
                      tone={warrantyDays < 0 ? "red" : warrantyDays < 60 ? "amber" : "emerald"}
                      className="h-5"
                    />
                  ) : null}
                </span>
              </Field>
              {record.notes ? (
                <div className="sm:col-span-2">
                  <Field label={tt(translate, "it.field.notes", "Notes")}>{record.notes}</Field>
                </div>
              ) : null}
            </section>

            <Separator />

            {/* Lifecycle timeline */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <History className="size-4 text-muted-foreground" />
                {tt(translate, "it.assets.timeline.title", "Lifecycle history")}
              </h3>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {tt(translate, "it.assets.timeline.empty", "No assignment or repair activity recorded yet.")}
                </p>
              ) : (
                <ol className="space-y-3">
                  {timeline.map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <span
                        className={`mt-1 size-2.5 shrink-0 rounded-full ${
                          item.kind === "repair"
                            ? "bg-amber-500"
                            : item.kind === "checkin"
                              ? "bg-emerald-500"
                              : "bg-blue-500"
                        }`}
                      />
                      <div className="min-w-0 flex-1 rounded-lg border bg-card px-3 py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium">{item.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.date)}</span>
                        </div>
                        {item.detail ? <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p> : null}
                        {item.status ? (
                          <div className="mt-1">
                            <ValuePill translate={translate} value={item.status} className="h-5" />
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </div>
    </RouteDrawer>
  );
}
