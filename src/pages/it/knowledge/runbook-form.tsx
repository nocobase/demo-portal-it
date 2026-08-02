import { useCreate, useShow, useTranslate, useUpdate, useWarnAboutChange, type HttpError } from "@refinedev/core";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  RouteDialog,
  useRefineUnsavedChangesGuard,
} from "@/extensions/nocobase-route-surfaces";
import { useRouteSurfaceClose } from "@nocobase/portal-sdk/routing";

import { tt, type RunbookRecord } from "../lib";
import { useContextualCloseTo } from "../route-surfaces";

type Values = Record<string, string>;

function RunbookFields({
  values,
  set,
}: {
  values: Values;
  set: (k: string, v: string) => void;
}) {
  const translate = useTranslate();
  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.field.title", "Title")}</span>
        <Input value={values.title ?? ""} onChange={(e) => set("title", e.target.value)} required />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium">
          <span>{tt(translate, "it.field.category", "Category")}</span>
          <Input value={values.category ?? ""} onChange={(e) => set("category", e.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          <span>{tt(translate, "it.knowledge.field.tags", "Tags")}</span>
          <Input
            value={values.tags ?? ""}
            onChange={(e) => set("tags", e.target.value)}
            placeholder={tt(translate, "it.knowledge.tagsPlaceholder", "Comma-separated")}
          />
        </label>
      </div>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.knowledge.field.summary", "Summary")}</span>
        <Textarea value={values.summary ?? ""} onChange={(e) => set("summary", e.target.value)} className="min-h-16" />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        <span>{tt(translate, "it.knowledge.field.body", "Body (Markdown)")}</span>
        <Textarea
          value={values.body ?? ""}
          onChange={(e) => set("body", e.target.value)}
          className="min-h-48 font-mono text-xs"
        />
      </label>
    </div>
  );
}

function normalize(values: Values) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === "") continue;
    out[k] = v;
  }
  return out;
}

export function RunbookCreate() {
  const translate = useTranslate();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.knowledge.create.title", "New runbook")}
        description={tt(translate, "it.knowledge.create.description", "Write a new procedure or troubleshooting guide.")}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <RunbookCreateForm />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function RunbookCreateForm() {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const [values, setValues] = useState<Values>({});
  const [error, setError] = useState("");
  const create = useCreate<RunbookRecord, HttpError>();
  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    setWarnWhen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    create.mutate(
      { resource: "it_runbooks", values: { published: true, views: 0, ...normalize(values) } },
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
      <RunbookFields values={values} set={set} />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => void close()}>
          {tt(translate, "buttons.cancel", "Cancel")}
        </Button>
        <Button type="submit" disabled={create.mutation.isPending}>
          {tt(translate, "it.knowledge.create.submit", "Publish runbook")}
        </Button>
      </div>
    </form>
  );
}

export function RunbookEdit() {
  const translate = useTranslate();
  const { id } = useParams<{ id: string }>();
  const closeTo = useContextualCloseTo();
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();
  const { result: record } = useShow<RunbookRecord>({ resource: "it_runbooks", id });
  return (
    <>
      <RouteDialog
        title={tt(translate, "it.knowledge.edit.title", "Edit runbook")}
        description={record?.title ?? ""}
        closeLabel={tt(translate, "buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
        className="sm:max-w-2xl"
      >
        <RunbookEditForm id={id} />
      </RouteDialog>
      {confirmation}
    </>
  );
}

function RunbookEditForm({ id }: { id?: string }) {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const { setWarnWhen } = useWarnAboutChange();
  const { result: record } = useShow<RunbookRecord>({ resource: "it_runbooks", id });
  const [values, setValues] = useState<Values | null>(null);
  const [error, setError] = useState("");
  const update = useUpdate<RunbookRecord, HttpError>();

  const current: Values =
    values ??
    (record
      ? {
          title: record.title ?? "",
          category: record.category ?? "",
          tags: record.tags ?? "",
          summary: record.summary ?? "",
          body: record.body ?? "",
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
      { resource: "it_runbooks", id: record.id, values: normalize(current) },
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
      <RunbookFields values={current} set={set} />
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
