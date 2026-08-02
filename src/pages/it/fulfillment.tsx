import { useList, useTranslate, useUpdate } from "@refinedev/core";
import { useMemo, useState, type DragEvent } from "react";

import { cn } from "@/lib/utils";

import {
  FULFILLMENT_STAGES,
  KpiCard,
  PageHeader,
  ValuePill,
  formatDate,
  personName,
  tt,
  type FulfillmentJobRecord,
} from "./lib";

type Stage = (typeof FULFILLMENT_STAGES)[number];

const COLUMN_STYLES: Record<Stage, string> = {
  Queued: "border-t-blue-400",
  "In progress": "border-t-amber-400",
  Blocked: "border-t-red-400",
  Done: "border-t-emerald-400",
};

export function FulfillmentBoard() {
  const translate = useTranslate();
  const update = useUpdate();
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  const { result, query } = useList<FulfillmentJobRecord>({
    resource: "it_fulfillment_jobs",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    sorters: [{ field: "dueDate", order: "asc" }],
    meta: { appends: ["request", "assignee"] },
    queryOptions: { retry: false },
  });

  const jobs = result.data;

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const j of jobs) c[j.status ?? "—"] = (c[j.status ?? "—"] ?? 0) + 1;
    return c;
  }, [jobs]);

  const moveJob = (job: FulfillmentJobRecord, to: Stage) => {
    if (job.status === to) return;
    update.mutate(
      { resource: "it_fulfillment_jobs", id: job.id, values: { status: to } },
      {
        onSuccess: () => {
          if (to === "Done" && job.requestId) {
            update.mutate(
              {
                resource: "it_requests",
                id: job.requestId,
                values: { status: "Fulfilled" },
              },
              { onSuccess: () => query.refetch() }
            );
          } else {
            void query.refetch();
          }
        },
      }
    );
  };

  const handleDrop = (event: DragEvent, stage: Stage) => {
    event.preventDefault();
    setDragOver(null);
    const raw = event.dataTransfer.getData("text/job-id");
    const job = jobs.find((j) => String(j.id) === raw);
    if (job) moveJob(job, stage);
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={tt(translate, "it.fulfillment.title", "Fulfillment")}
        description={tt(
          translate,
          "it.fulfillment.description",
          "Drag fulfilment jobs across the board. Completing a job marks its request fulfilled."
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={tt(translate, "it.value.queued", "Queued")}
          value={counts["Queued"] ?? 0}
          loading={query.isLoading}
        />
        <KpiCard
          label={tt(translate, "it.value.in_progress", "In progress")}
          value={counts["In progress"] ?? 0}
          tone="warning"
          loading={query.isLoading}
        />
        <KpiCard
          label={tt(translate, "it.value.blocked", "Blocked")}
          value={counts["Blocked"] ?? 0}
          tone="danger"
          loading={query.isLoading}
        />
        <KpiCard
          label={tt(translate, "it.value.done", "Done")}
          value={counts["Done"] ?? 0}
          tone="success"
          loading={query.isLoading}
        />
      </div>

      <div className="grid flex-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {FULFILLMENT_STAGES.map((stage) => {
          const columnJobs = jobs.filter((j) => j.status === stage);
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
                <ValuePill translate={translate} value={stage} />
                <span className="text-xs font-medium text-muted-foreground">
                  {columnJobs.length}
                </span>
              </div>
              {columnJobs.map((job) => (
                <BoardCard key={job.id} job={job} translate={translate} />
              ))}
              {columnJobs.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                  {tt(translate, "it.fulfillment.emptyColumn", "Drop jobs here")}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({
  job,
  translate,
}: {
  job: FulfillmentJobRecord;
  translate: ReturnType<typeof useTranslate>;
}) {
  return (
    <div
      draggable
      onDragStart={(event) =>
        event.dataTransfer.setData("text/job-id", String(job.id))
      }
      className="cursor-grab space-y-2 rounded-lg border bg-card p-3 text-left shadow-xs transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <p className="line-clamp-2 text-sm font-medium">{job.title}</p>
      {job.request?.subject ? (
        <p className="truncate text-xs text-muted-foreground">
          {job.request.subject}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {job.priority ? (
          <ValuePill translate={translate} value={job.priority} className="h-5" />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{personName(job.assignee)}</span>
        {job.dueDate ? (
          <span className="shrink-0">{formatDate(job.dueDate)}</span>
        ) : null}
      </div>
    </div>
  );
}
