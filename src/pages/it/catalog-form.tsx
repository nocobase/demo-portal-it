import { useCreate, useShow, useTranslate, useUpdate, useWarnAboutChange, type HttpError } from "@refinedev/core";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

import { tt, type RequestTypeRecord } from "./lib";
import { useContextualCloseTo } from "./route-surfaces";

const CATEGORIES = ["Hardware", "Software", "Access", "Network", "Facilities"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

type Values = Record<string, string | boolean>;

function CatalogFields({
  values,
  set,
}: {
  values: Values;
  set: (k: string, v: string | boolean) => void;
}) {
  const translate = useTranslate();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-medium sm:col-span-2">
        <span>{tt(translate, "it.field.serviceName", "Service name")}</span>
        <Input value={String(values.name ?? "")} onChange={(e) => set("name", e.target.value)} required />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.category", "Category")}</span>
        <Select value={String(values.category ?? "")} onValueChange={(v) => set("category", v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {tt(translate, `it.value.${c.toLowerCase()}`, c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.defaultPriority", "Default priority")}</span>
        <Select value={String(values.defaultPriority ?? "")} onValueChange={(v) => set("defaultPriority", v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {tt(translate, `it.value.${p.toLowerCase()}`, p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.slaHours", "SLA (hours)")}</span>
        <Input
          type="number"
          value={values.slaHours == null ? "" : String(values.slaHours)}
          onChange={(e) => set("slaHours", e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 self-end pb-1.5 text-xs font-medium">
        <Checkbox
          checked={Boolean(values.requiresApproval)}
          onCheckedChange={(v) => set("requiresApproval", Boolean(v))}
        />
        <span>{tt(translate, "it.catalog.requiresApproval", "Requires approval")}</span>
      </label>
      <label className="flex items-center gap-2 self-end pb-1.5 text-xs font-medium">
        <Checkbox checked={Boolean(values.active)} onCheckedChange={(v) => set("active", Boolean(v))} />
        <span>{tt(translate, "it.catalog.active", "Published")}</span>
      </label>
      <label className="grid gap-1 text-xs font-medium sm:col-span-2">
        <span>{tt(translate, "it.field.description", "Description")}</span>
        <Textarea
          value={String(values.description ?? "")}
          onChange={(e) => set("description", e.target.value)}
          className="min-h-20"
        />
      </label>
    </div>
  );
}

function normalize(values: Values) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === "" || v == null) continue;
    out[k] = k === "slaHours" ? Number(v) : v;
  }
  return out;
}

export function CatalogItemCreate() {
  const translate = useTranslate();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.catalog.create.title", "New catalog service")}
        description={tt(translate, "it.catalog.create.description", "Add a service the team can request from the catalog.")}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <CatalogItemCreateForm />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function CatalogItemCreateForm() {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const [values, setValues] = useState<Values>({ active: true, requiresApproval: false });
  const [error, setError] = useState("");
  const create = useCreate<RequestTypeRecord, HttpError>();
  const set = (k: string, v: string | boolean) => {
    setValues((p) => ({ ...p, [k]: v }));
    setWarnWhen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    create.mutate(
      { resource: "it_request_types", values: normalize(values) },
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
      <CatalogFields values={values} set={set} />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void close()}>
          {tt(translate, "buttons.cancel", "Cancel")}
        </Button>
        <Button type="submit" disabled={create.mutation.isPending}>
          {tt(translate, "it.catalog.create.submit", "Add service")}
        </Button>
      </div>
    </form>
  );
}

export function CatalogItemEdit() {
  const translate = useTranslate();
  const { id } = useParams<{ id: string }>();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  const { result: record } = useShow<RequestTypeRecord>({ resource: "it_request_types", id });
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.catalog.edit.title", "Edit catalog service")}
        description={record?.name ?? ""}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <CatalogItemEditForm id={id} />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function CatalogItemEditForm({ id }: { id?: string }) {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const { result: record } = useShow<RequestTypeRecord>({ resource: "it_request_types", id });
  const [values, setValues] = useState<Values | null>(null);
  const [error, setError] = useState("");
  const update = useUpdate<RequestTypeRecord, HttpError>();

  const current: Values =
    values ??
    (record
      ? {
          name: record.name ?? "",
          category: record.category ?? "",
          defaultPriority: record.defaultPriority ?? "",
          slaHours: record.slaHours != null ? String(record.slaHours) : "",
          requiresApproval: Boolean(record.requiresApproval),
          active: Boolean(record.active),
          description: record.description ?? "",
        }
      : {});

  const set = (k: string, v: string | boolean) => {
    setValues({ ...current, [k]: v });
    setWarnWhen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setError("");
    update.mutate(
      { resource: "it_request_types", id: record.id, values: normalize(current) },
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
      <CatalogFields values={current} set={set} />
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
