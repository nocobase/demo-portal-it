import { useCreate, useTranslate, useUpdate, type HttpError } from "@refinedev/core";
import { useShow } from "@refinedev/core";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router";

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
import { useWarnAboutChange } from "@refinedev/core";

import { LICENSE_STATUSES, tt, type LicenseRecord } from "../lib";
import { useContextualCloseTo } from "../route-surfaces";

const LICENSE_TYPES = [
  "Subscription",
  "Named user",
  "Per user",
  "Per seat",
  "Per endpoint",
  "Perpetual",
];

type Values = Record<string, string>;

function LicenseFields({
  values,
  set,
}: {
  values: Values;
  set: (k: string, v: string) => void;
}) {
  const translate = useTranslate();
  const text = (name: string, label: string, required = false) => (
    <label className="grid gap-1 text-xs font-medium">
      <span>{label}</span>
      <Input
        value={values[name] ?? ""}
        onChange={(e) => set(name, e.target.value)}
        required={required}
      />
    </label>
  );
  const number = (name: string, label: string) => (
    <label className="grid gap-1 text-xs font-medium">
      <span>{label}</span>
      <Input
        type="number"
        value={values[name] ?? ""}
        onChange={(e) => set(name, e.target.value)}
      />
    </label>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {text("name", tt(translate, "it.field.name", "Product name"), true)}
      {text("vendor", tt(translate, "it.field.vendor", "Vendor"))}
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.licenseType", "License type")}</span>
        <Select value={values.licenseType ?? ""} onValueChange={(v) => set("licenseType", v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
          </SelectTrigger>
          <SelectContent>
            {LICENSE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {tt(translate, `it.value.${t.toLowerCase().replace(/ /g, "_")}`, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {text("version", tt(translate, "it.field.version", "Version"))}
      {number("seatsTotal", tt(translate, "it.field.seatsTotal", "Seats total"))}
      {number("seatsUsed", tt(translate, "it.field.seatsUsed", "Seats used"))}
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.renewalDate", "Renewal date")}</span>
        <Input type="date" value={values.renewalDate ?? ""} onChange={(e) => set("renewalDate", e.target.value)} />
      </label>
      {number("annualCost", tt(translate, "it.field.annualCost", "Annual cost"))}
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.status", "Status")}</span>
        <Select value={values.status ?? ""} onValueChange={(v) => set("status", v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
          </SelectTrigger>
          <SelectContent>
            {LICENSE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-medium sm:col-span-2">
        <span>{tt(translate, "it.field.notes", "Notes")}</span>
        <Textarea value={values.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="min-h-20" />
      </label>
    </div>
  );
}

function normalize(values: Values) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === "") continue;
    out[k] = ["seatsTotal", "seatsUsed", "annualCost"].includes(k) ? Number(v) : v;
  }
  return out;
}

export function LicenseCreate() {
  const translate = useTranslate();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.licenses.create.title", "Add license")}
        description={tt(translate, "it.licenses.create.description", "Register a new software license.")}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <LicenseCreateForm />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function LicenseCreateForm() {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const [values, setValues] = useState<Values>({ status: "Active" });
  const [error, setError] = useState("");
  const create = useCreate<LicenseRecord, HttpError>();
  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    setWarnWhen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    create.mutate(
      { resource: "it_licenses", values: normalize(values) },
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
      <LicenseFields values={values} set={set} />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void close()}>
          {tt(translate, "buttons.cancel", "Cancel")}
        </Button>
        <Button type="submit" disabled={create.mutation.isPending}>
          {tt(translate, "it.licenses.create.submit", "Add license")}
        </Button>
      </div>
    </form>
  );
}

export function LicenseEdit() {
  const translate = useTranslate();
  const { id } = useParams<{ id: string }>();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  const { result: record } = useShow<LicenseRecord>({ resource: "it_licenses", id });
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.licenses.edit.title", "Edit license")}
        description={record?.name ?? ""}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <LicenseEditForm id={id} />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function LicenseEditForm({ id }: { id?: string }) {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const { result: record } = useShow<LicenseRecord>({ resource: "it_licenses", id });
  const [values, setValues] = useState<Values | null>(null);
  const [error, setError] = useState("");
  const update = useUpdate<LicenseRecord, HttpError>();

  const current: Values =
    values ??
    (record
      ? Object.fromEntries(
          [
            "name",
            "vendor",
            "licenseType",
            "version",
            "seatsTotal",
            "seatsUsed",
            "renewalDate",
            "annualCost",
            "status",
            "notes",
          ].map((k) => [k, record[k as keyof LicenseRecord] == null ? "" : String(record[k as keyof LicenseRecord])])
        )
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
      { resource: "it_licenses", id: record.id, values: normalize(current) },
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
      <LicenseFields values={current} set={set} />
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
