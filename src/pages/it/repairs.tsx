import {
  useCreate,
  useList,
  useTranslate,
  useUpdate,
  type HttpError,
} from "@refinedev/core";
import { useWarnAboutChange } from "@refinedev/core";
import { Plus } from "lucide-react";
import { useState, type DragEvent, type FormEvent } from "react";
import { Outlet } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RouteDialog,
  useRefineUnsavedChangesGuard,
} from "@/extensions/nocobase-route-surfaces";
import { useRouteSurfaceClose } from "@nocobase/portal-sdk/routing";
import { cn } from "@/lib/utils";

import {
  KpiCard,
  PageHeader,
  REPAIR_STAGES,
  ValuePill,
  formatDate,
  money,
  tt,
  type AssetRecord,
  type RepairRecord,
} from "./lib";
import { useContextualCloseTo, useOpenContextualChild } from "./route-surfaces";

type RepairStage = (typeof REPAIR_STAGES)[number];

const COLUMN_STYLES: Record<RepairStage, string> = {
  Open: "border-t-blue-400",
  "In progress": "border-t-amber-400",
  Done: "border-t-emerald-400",
};

export function RepairsBoard() {
  const translate = useTranslate();
  const openChild = useOpenContextualChild();
  const update = useUpdate();
  const [dragOver, setDragOver] = useState<RepairStage | null>(null);
  const { result, query } = useList<RepairRecord>({
    resource: "it_repairs",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    sorters: [{ field: "startedAt", order: "desc" }],
    meta: { appends: ["asset"] },
    queryOptions: { retry: false },
  });

  const repairs = result?.data ?? [];
  const openCount = repairs.filter((r) => r.status === "Open").length;
  const inProgressCount = repairs.filter((r) => r.status === "In progress").length;
  const doneCount = repairs.filter((r) => r.status === "Done").length;
  const totalCost = repairs.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  const moveRepair = (repair: RepairRecord, to: RepairStage) => {
    if (repair.status === to) return;
    const values: Record<string, unknown> = { status: to };
    if (to === "Done") {
      values.completedAt = new Date().toISOString().slice(0, 10);
    } else if (repair.completedAt) {
      values.completedAt = null;
    }
    update.mutate(
      { resource: "it_repairs", id: repair.id, values },
      { onSuccess: () => query.refetch() }
    );
  };

  const handleDrop = (event: DragEvent, stage: RepairStage) => {
    event.preventDefault();
    setDragOver(null);
    const raw = event.dataTransfer.getData("text/repair-id");
    const repair = repairs.find((item) => String(item.id) === raw);
    if (repair) moveRepair(repair, stage);
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.repairs.title", "Repairs")}
        description={tt(
          translate,
          "it.repairs.description",
          "Track device repairs from open to done."
        )}
        actions={
          <Button type="button" onClick={() => openChild("create")}>
            <Plus />
            {tt(translate, "it.repairs.actions.new", "Log repair")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={tt(translate, "it.value.open", "Open")} value={openCount} />
        <KpiCard
          label={tt(translate, "it.value.in_progress", "In progress")}
          value={inProgressCount}
        />
        <KpiCard label={tt(translate, "it.value.done", "Done")} value={doneCount} />
        <KpiCard
          label={tt(translate, "it.repairs.kpi.totalCost", "Total cost")}
          value={money(totalCost)}
        />
      </div>

      {query.isLoading ? (
        <div className="grid flex-1 gap-4 md:grid-cols-3">
          {REPAIR_STAGES.map((stage) => (
            <div key={stage} className="rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="grid flex-1 items-start gap-4 md:grid-cols-3">
          {REPAIR_STAGES.map((stage) => {
            const stageRepairs = repairs.filter((r) => r.status === stage);
            return (
              <div
                key={stage}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(stage);
                }}
                onDragLeave={() =>
                  setDragOver((current) => (current === stage ? null : current))
                }
                onDrop={(event) => handleDrop(event, stage)}
                className={cn(
                  "flex min-h-48 flex-col gap-3 rounded-xl border border-t-2 bg-muted/40 p-3 transition-colors",
                  COLUMN_STYLES[stage],
                  dragOver === stage && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium">
                    {tt(translate, `it.value.${stage.toLowerCase().replace(/\s+/g, "_")}`, stage)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {stageRepairs.length}
                  </span>
                </div>
                {stageRepairs.map((repair) => (
                  <RepairCard
                    key={repair.id}
                    repair={repair}
                    translate={translate}
                  />
                ))}
                {stageRepairs.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                    {tt(translate, "it.repairs.emptyColumn", "Drop repairs here")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <Outlet />
    </div>
  );
}

function RepairCard({
  repair,
  translate,
}: {
  repair: RepairRecord;
  translate: ReturnType<typeof useTranslate>;
}) {
  return (
    <div
      draggable
      onDragStart={(event) =>
        event.dataTransfer.setData("text/repair-id", String(repair.id))
      }
      className="cursor-grab space-y-2 rounded-lg border bg-card p-3 text-left shadow-xs transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <p className="line-clamp-2 text-sm font-medium">{repair.issue}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">
          {repair.asset?.name ?? "—"}
          {repair.asset?.assetTag ? ` · ${repair.asset.assetTag}` : ""}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">
          {repair.vendor || tt(translate, "it.repairs.internal", "Internal IT")}
        </span>
        <span className="text-xs text-muted-foreground">{formatDate(repair.startedAt)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {repair.cost ? money(repair.cost) : ""}
        </span>
        <ValuePill translate={translate} value={repair.status} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create dialog                                                       */
/* ------------------------------------------------------------------ */

type Values = Record<string, string>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function RepairFields({
  values,
  set,
}: {
  values: Values;
  set: (k: string, v: string) => void;
}) {
  const translate = useTranslate();
  const { result: assets } = useList<AssetRecord>({
    resource: "it_assets",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
  });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.asset", "Asset")}</span>
        <Select
          value={values.assetId ?? ""}
          onValueChange={(v) => set("assetId", v ?? "")}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
          </SelectTrigger>
          <SelectContent>
            {(assets?.data ?? []).map((asset) => (
              <SelectItem key={asset.id} value={String(asset.id)}>
                {asset.name}
                {asset.assetTag ? ` (${asset.assetTag})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.status", "Status")}</span>
        <Select value={values.status ?? ""} onValueChange={(v) => set("status", v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
          </SelectTrigger>
          <SelectContent>
            {REPAIR_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-medium sm:col-span-2">
        <span>{tt(translate, "it.field.issue", "Issue")}</span>
        <Textarea
          value={values.issue ?? ""}
          onChange={(e) => set("issue", e.target.value)}
          required
          className="min-h-20"
        />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.vendor", "Vendor")}</span>
        <Input value={values.vendor ?? ""} onChange={(e) => set("vendor", e.target.value)} />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.cost", "Cost")}</span>
        <Input
          type="number"
          value={values.cost ?? ""}
          onChange={(e) => set("cost", e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.startedAt", "Started at")}</span>
        <Input
          type="date"
          value={values.startedAt ?? ""}
          onChange={(e) => set("startedAt", e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs font-medium sm:col-span-2">
        <span>{tt(translate, "it.field.notes", "Notes")}</span>
        <Textarea
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          className="min-h-20"
        />
      </label>
    </div>
  );
}

function normalize(values: Values) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === "") continue;
    if (k === "cost") {
      out[k] = Number(v);
    } else if (k === "assetId") {
      out[k] = Number(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function RepairCreate() {
  const translate = useTranslate();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.repairs.create.title", "Log repair")}
        description={tt(
          translate,
          "it.repairs.create.description",
          "Record a new device repair."
        )}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <RepairCreateForm />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function RepairCreateForm() {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const [values, setValues] = useState<Values>({ status: "Open", startedAt: today() });
  const [error, setError] = useState("");
  const create = useCreate<RepairRecord, HttpError>();
  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    setWarnWhen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    create.mutate(
      { resource: "it_repairs", values: normalize(values) },
      {
        onSuccess: () => {
          setWarnWhen(false);
          void close({ skipBeforeClose: true });
        },
        onError: (err) => setError(err?.message ?? "Error"),
      }
    );
  };
  return (
    <form onSubmit={submit} className="grid min-h-0 gap-4 overflow-y-auto p-5">
      <RepairFields values={values} set={set} />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void close()}>
          {tt(translate, "buttons.cancel", "Cancel")}
        </Button>
        <Button type="submit" disabled={create.mutation.isPending}>
          {tt(translate, "it.repairs.create.submit", "Log repair")}
        </Button>
      </div>
    </form>
  );
}
