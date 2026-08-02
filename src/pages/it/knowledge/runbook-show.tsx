import { useShow, useTranslate } from "@refinedev/core";
import { Eye, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useOutlet, useParams } from "react-router";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingState } from "@/components/app-shell/loading-state";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteDrawer } from "@/extensions/nocobase-route-surfaces";

import { Field, ValuePill, formatDate, tt, type RunbookRecord } from "../lib";
import { useContextualCloseTo, useOpenContextualChild } from "../route-surfaces";

export function RunbookShow() {
  const translate = useTranslate();
  const { id } = useParams<{ id: string }>();
  const closeTo = useContextualCloseTo();
  const openChild = useOpenContextualChild();
  const nested = useOutlet();
  const { result: record, query } = useShow<RunbookRecord>({
    resource: "it_runbooks",
    id,
  });

  const tags = (record?.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <RouteDrawer
      title={
        query.isLoading && !record ? (
          <Skeleton className="h-6 w-56" />
        ) : (
          <span className="flex items-center gap-2">
            <span className="truncate">{record?.title ?? tt(translate, "it.knowledge.title", "Runbooks")}</span>
            {record?.category ? <ValuePill translate={translate} value={record.category} /> : null}
          </span>
        )
      }
      description={record?.summary ?? ""}
      closeLabel={tt(translate, "buttons.close", "Close")}
      closeTo={closeTo}
      nested={nested}
      actions={
        record ? (
          <Button type="button" variant="outline" size="icon-sm" onClick={() => openChild("edit")}>
            <Pencil />
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
              {tt(translate, "it.knowledge.show.loadError", "This runbook may no longer exist.")}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2">
              <Field label={tt(translate, "it.field.category", "Category")}>
                {record.category ? <ValuePill translate={translate} value={record.category} /> : "—"}
              </Field>
              <Field label={tt(translate, "it.knowledge.field.views", "Views")}>
                <span className="flex items-center gap-1.5">
                  <Eye className="size-3.5 text-muted-foreground" />
                  {record.views ?? 0}
                </span>
              </Field>
              <Field label={tt(translate, "it.field.updatedAt", "Updated")}>{formatDate(record.updatedAt)}</Field>
              <Field label={tt(translate, "it.knowledge.field.tags", "Tags")}>
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </Field>
            </section>

            <Separator />

            <section
              className="[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h1]:text-lg [&_h1]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-2 [&_li]:my-1 text-sm leading-6"
            >
              {record.body ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{record.body}</ReactMarkdown>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {tt(translate, "it.knowledge.show.noBody", "No content has been written for this runbook yet.")}
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </RouteDrawer>
  );
}
