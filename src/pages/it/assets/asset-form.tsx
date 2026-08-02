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

import { ASSET_STATUSES, tt, type AssetRecord } from "../lib";
import { useContextualCloseTo } from "../route-surfaces";

const CATEGORIES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Smartphone",
  "Tablet",
  "Printer",
  "Networking",
  "Server",
  "Peripheral",
];

type Values = Record<string, string>;

function AssetFields({
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
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {text("name", tt(translate, "it.field.name", "Asset name"), true)}
      {text("assetTag", tt(translate, "it.field.assetTag", "Asset tag"))}
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.category", "Category")}</span>
        <Select value={values.category ?? ""} onValueChange={(v) => set("category", v ?? "")}>
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
        <span>{tt(translate, "it.field.status", "Status")}</span>
        <Select value={values.status ?? ""} onValueChange={(v) => set("status", v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={tt(translate, "it.common.select", "Select...")} />
          </SelectTrigger>
          <SelectContent>
            {ASSET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {text("brand", tt(translate, "it.field.brand", "Brand"))}
      {text("model", tt(translate, "it.field.model", "Model"))}
      {text("serialNumber", tt(translate, "it.field.serial", "Serial number"))}
      {text("location", tt(translate, "it.field.location", "Location"))}
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.purchaseDate", "Purchase date")}</span>
        <Input type="date" value={values.purchaseDate ?? ""} onChange={(e) => set("purchaseDate", e.target.value)} />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.warrantyExpiry", "Warranty expiry")}</span>
        <Input type="date" value={values.warrantyExpiry ?? ""} onChange={(e) => set("warrantyExpiry", e.target.value)} />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.purchaseCost", "Purchase cost")}</span>
        <Input type="number" value={values.purchaseCost ?? ""} onChange={(e) => set("purchaseCost", e.target.value)} />
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
    out[k] = k === "purchaseCost" ? Number(v) : v;
  }
  return out;
}

export function AssetCreate() {
  const translate = useTranslate();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.assets.create.title", "Register asset")}
        description={tt(translate, "it.assets.create.description", "Add a new device to the asset register.")}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <AssetCreateForm />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function AssetCreateForm() {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const [values, setValues] = useState<Values>({ status: "Available" });
  const [error, setError] = useState("");
  const create = useCreate<AssetRecord, HttpError>();
  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    setWarnWhen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    create.mutate(
      { resource: "it_assets", values: normalize(values) },
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
      <AssetFields values={values} set={set} />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void close()}>
          {tt(translate, "buttons.cancel", "Cancel")}
        </Button>
        <Button type="submit" disabled={create.mutation.isPending}>
          {tt(translate, "it.assets.create.submit", "Register asset")}
        </Button>
      </div>
    </form>
  );
}

export function AssetEdit() {
  const translate = useTranslate();
  const { id } = useParams<{ id: string }>();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  const { result: record } = useShow<AssetRecord>({ resource: "it_assets", id });
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.assets.edit.title", "Edit asset")}
        description={record?.name ?? ""}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <AssetEditForm id={id} />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function AssetEditForm({ id }: { id?: string }) {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const { result: record } = useShow<AssetRecord>({ resource: "it_assets", id });
  const [values, setValues] = useState<Values | null>(null);
  const [error, setError] = useState("");
  const update = useUpdate<AssetRecord, HttpError>();

  const current: Values =
    values ??
    (record
      ? Object.fromEntries(
          [
            "name",
            "assetTag",
            "category",
            "status",
            "brand",
            "model",
            "serialNumber",
            "location",
            "purchaseDate",
            "warrantyExpiry",
            "purchaseCost",
            "notes",
          ].map((k) => [k, record[k as keyof AssetRecord] == null ? "" : String(record[k as keyof AssetRecord])])
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
      { resource: "it_assets", id: record.id, values: normalize(current) },
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
      <AssetFields values={current} set={set} />
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
