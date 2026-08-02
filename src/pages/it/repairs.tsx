import {
  useCreate,
  useInvalidate,
  useList,
  useShow,
  useTranslate,
  useUpdate,
  type HttpError,
} from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { useWarnAboutChange } from "@refinedev/core";
import { Pencil, Plus } from "lucide-react";
import { useState, type DragEvent, type FormEvent } from "react";
import { useNavigate, useOutlet, useParams } from "react-router";

import { LoadingState } from "@/components/app-shell/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  RouteDialog,
  RouteDrawer,
  useRefineUnsavedChangesGuard,
} from "@/extensions/nocobase-route-surfaces";
import { useRouteSurfaceClose } from "@nocobase/portal-sdk/routing";
import { cn } from "@/lib/utils";

import {
  Field,
  KpiCard,
  PageHeader,
  REPAIR_STAGES,
  ValuePill,
  formatDate,
  money,
  tt,
  useStatusValues,
  useSumOf,
  type AssetRecord,
  type RepairRecord,
} from "./lib";
import { ShowMore, useColumnLimits } from "./pagination";
import { useContextualCloseTo, useOpenContextualChild } from "./route-surfaces";

type RepairStage = string;

const COLUMN_STYLES: Record<string, string> = {
  Open: "border-t-blue-400",
  "In progress": "border-t-amber-400",
  Done: "border-t-emerald-400",
};
// Any status that is not one of the canonical stages still gets a column, so
// no repair is unreachable.
const EXTRA_COLUMN_STYLE = "border-t-slate-400";

// What a dragged card carries. The board no longer holds every repair in
// memory, so the payload has to describe the record well enough to move it.
type DragPayload = {
  id: RepairRecord["id"];
  status?: string | null;
  completedAt?: string | null;
};

export function RepairsBoard() {
  const translate = useTranslate();
  const openChild = useOpenContextualChild();
  const update = useUpdate();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState<RepairStage | null>(null);
  // Columns come from the data, not a hardcoded list: the canonical stages
  // first, then any other status present in the collection.
  const {
    values: stages,
    counts,
    isLoading: countsLoading,
  } = useStatusValues("it_repairs", "status", REPAIR_STAGES);
  const { limitFor, showMore } = useColumnLimits(stages);
  const { value: totalCost, isLoading: costLoading } = useSumOf(
    "it_repairs",
    "cost"
  );

  const refresh = () => {
    void invalidate({ resource: "it_repairs", invalidates: ["list"] });
    void queryClient.invalidateQueries({ queryKey: ["it-agg", "it_repairs"] });
    void queryClient.invalidateQueries({ queryKey: ["it-sum", "it_repairs"] });
  };

  const moveRepair = (repair: DragPayload, to: RepairStage) => {
    if (repair.status === to) return;
    const values: Record<string, unknown> = { status: to };
    if (to === "Done") {
      values.completedAt = new Date().toISOString().slice(0, 10);
    } else if (repair.completedAt) {
      values.completedAt = null;
    }
    update.mutate(
      { resource: "it_repairs", id: repair.id, values },
      { onSuccess: refresh }
    );
  };

  const handleDrop = (event: DragEvent, stage: RepairStage) => {
    event.preventDefault();
    setDragOver(null);
    const raw = event.dataTransfer.getData("text/repair");
    if (!raw) return;
    try {
      moveRepair(JSON.parse(raw) as DragPayload, stage);
    } catch {
      // A drop from outside the board; nothing to move.
    }
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
        <KpiCard
          label={tt(translate, "it.value.open", "Open")}
          value={counts["Open"] ?? 0}
          loading={countsLoading}
        />
        <KpiCard
          label={tt(translate, "it.value.in_progress", "In progress")}
          value={counts["In progress"] ?? 0}
          loading={countsLoading}
        />
        <KpiCard
          label={tt(translate, "it.value.done", "Done")}
          value={counts["Done"] ?? 0}
          loading={countsLoading}
        />
        <KpiCard
          label={tt(translate, "it.repairs.kpi.totalCost", "Total cost")}
          value={money(totalCost)}
          loading={costLoading}
        />
      </div>

      <div className="grid flex-1 items-start gap-4 md:grid-cols-3">
        {stages.map((stage) => (
          <RepairColumn
            key={stage}
            stage={stage}
            limit={limitFor(stage)}
            onShowMore={() => showMore(stage)}
            dragOver={dragOver === stage}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(stage);
            }}
            onDragLeave={() =>
              setDragOver((current) => (current === stage ? null : current))
            }
            onDrop={(event) => handleDrop(event, stage)}
            translate={translate}
            onOpen={openChild}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One board column. Each column runs its own query filtered to its stage and
 * capped at `limit`, so opening the board costs three small requests instead
 * of one that drags in every repair.
 */
function RepairColumn({
  stage,
  limit,
  onShowMore,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  translate,
  onOpen,
}: {
  stage: RepairStage;
  limit: number;
  onShowMore: () => void;
  dragOver: boolean;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent) => void;
  translate: ReturnType<typeof useTranslate>;
  onOpen: (path: string) => void;
}) {
  const { result, query } = useList<RepairRecord>({
    resource: "it_repairs",
    pagination: { mode: "server", currentPage: 1, pageSize: limit },
    filters: [{ field: "status", operator: "eq", value: stage }],
    sorters: [{ field: "startedAt", order: "desc" }],
    meta: { appends: ["asset"] },
    queryOptions: { retry: false },
  });

  const repairs = result.data;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex min-h-48 flex-col gap-3 rounded-xl border border-t-2 bg-muted/40 p-3 transition-colors",
        COLUMN_STYLES[stage] ?? EXTRA_COLUMN_STYLE,
        dragOver && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">
          {tt(translate, `it.value.${stage.toLowerCase().replace(/\s+/g, "_")}`, stage)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {query.isLoading ? "—" : result.total}
        </span>
      </div>
      {repairs.map((repair) => (
        <RepairCard
          key={repair.id}
          repair={repair}
          translate={translate}
          onOpen={() => onOpen(String(repair.id))}
        />
      ))}
      {!query.isLoading && repairs.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          {tt(translate, "it.repairs.emptyColumn", "Drop repairs here")}
        </p>
      ) : null}
      <ShowMore
        loaded={repairs.length}
        total={result.total}
        onClick={onShowMore}
      />
    </div>
  );
}

function RepairCard({
  repair,
  translate,
  onOpen,
}: {
  repair: RepairRecord;
  translate: ReturnType<typeof useTranslate>;
  onOpen: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event) =>
        event.dataTransfer.setData(
          "text/repair",
          JSON.stringify({
            id: repair.id,
            status: repair.status,
            completedAt: repair.completedAt,
          })
        )
      }
      onClick={onOpen}
      className="cursor-pointer space-y-2 rounded-lg border bg-card p-3 text-left shadow-xs transition-shadow hover:shadow-md active:cursor-grabbing"
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
            <SelectValue placeholder={tt(translate, "it.common.select", "Select...")}>
              {values.assetId
                ? (() => {
                    const a = (assets?.data ?? []).find(
                      (asset) => String(asset.id) === String(values.assetId)
                    );
                    return a
                      ? `${a.name}${a.assetTag ? ` (${a.assetTag})` : ""}`
                      : undefined;
                  })()
                : undefined}
            </SelectValue>
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

/* ------------------------------------------------------------------ */
/* Show (also mounted as a nested child under an asset's detail)      */
/* ------------------------------------------------------------------ */

export function RepairShow() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { repairId, id } = useParams<{ repairId?: string; id?: string }>();
  const recordId = repairId ?? id;
  const closeTo = useContextualCloseTo();
  const openChild = useOpenContextualChild();
  const nested = useOutlet();
  const { result: record, query } = useShow<RepairRecord>({
    resource: "it_repairs",
    id: recordId,
    meta: { appends: ["asset"] },
  });

  return (
    <RouteDrawer
      title={
        query.isLoading && !record ? (
          <Skeleton className="h-6 w-56" />
        ) : (
          <span className="flex items-center gap-2">
            <span className="truncate">{record?.issue ?? tt(translate, "it.repairs.title", "Repairs")}</span>
            {record ? <ValuePill translate={translate} value={record.status} /> : null}
          </span>
        )
      }
      description={record?.asset?.name ?? ""}
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
              {tt(translate, "it.repairs.show.loadError", "This repair may no longer exist.")}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2">
              <Field label={tt(translate, "it.field.asset", "Asset")}>
                {record.asset ? (
                  <button
                    type="button"
                    className="text-primary underline-offset-2 hover:underline"
                    onClick={() => navigate(`/asset-register/${record.assetId}`)}
                  >
                    {record.asset.name}
                    {record.asset.assetTag ? ` (${record.asset.assetTag})` : ""}
                  </button>
                ) : (
                  "—"
                )}
              </Field>
              <Field label={tt(translate, "it.field.vendor", "Vendor")}>
                {record.vendor || tt(translate, "it.repairs.internal", "Internal IT")}
              </Field>
              <Field label={tt(translate, "it.field.cost", "Cost")}>{money(record.cost)}</Field>
              <Field label={tt(translate, "it.field.startedAt", "Started at")}>{formatDate(record.startedAt)}</Field>
              <Field label={tt(translate, "it.field.completedAt", "Completed")}>{formatDate(record.completedAt)}</Field>
            </section>
            {record.notes ? (
              <>
                <Separator />
                <Field label={tt(translate, "it.field.notes", "Notes")}>
                  <span className="whitespace-pre-wrap font-normal">{record.notes}</span>
                </Field>
              </>
            ) : null}
          </div>
        )}
      </div>
    </RouteDrawer>
  );
}

/* ------------------------------------------------------------------ */
/* Edit                                                                */
/* ------------------------------------------------------------------ */

export function RepairEdit() {
  const translate = useTranslate();
  const { repairId, id } = useParams<{ repairId?: string; id?: string }>();
  const recordId = repairId ?? id;
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  const { result: record } = useShow<RepairRecord>({ resource: "it_repairs", id: recordId });
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.repairs.edit.title", "Edit repair")}
        description={record?.issue ?? ""}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <RepairEditForm id={recordId} />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function RepairEditForm({ id }: { id?: string }) {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const { result: record } = useShow<RepairRecord>({ resource: "it_repairs", id });
  const [values, setValues] = useState<Values | null>(null);
  const [error, setError] = useState("");
  const update = useUpdate<RepairRecord, HttpError>();

  const current: Values =
    values ??
    (record
      ? {
          assetId: record.assetId != null ? String(record.assetId) : "",
          status: record.status ?? "",
          issue: record.issue ?? "",
          vendor: record.vendor ?? "",
          cost: record.cost != null ? String(record.cost) : "",
          startedAt: record.startedAt ?? "",
          notes: record.notes ?? "",
        }
      : {});

  const set = (k: string, v: string) => {
    setValues({ ...current, [k]: v });
    setWarnWhen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setError("");
    update.mutate(
      { resource: "it_repairs", id: record.id, values: normalize(current) },
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
      <RepairFields values={current} set={set} />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void close()}>
          {tt(translate, "buttons.cancel", "Cancel")}
        </Button>
        <Button type="submit" disabled={update.mutation.isPending}>
          {tt(translate, "buttons.save", "Save")}
        </Button>
      </div>
    </form>
  );
}
