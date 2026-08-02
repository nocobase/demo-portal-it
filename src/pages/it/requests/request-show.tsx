import {
  useCreate,
  useInvalidate,
  useList,
  useShow,
  useTranslate,
  useUpdate,
  type HttpError,
} from "@refinedev/core";
import {
  Ban,
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  ThumbsUp,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useOutlet, useParams } from "react-router";

import { Pencil } from "lucide-react";

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
  EmptyState,
  Field,
  ValuePill,
  formatDate,
  personName,
  tt,
  type FulfillmentJobRecord,
  type RequestRecord,
  type UserRef,
} from "../lib";
import { useContextualCloseTo, useOpenContextualChild } from "../route-surfaces";

export function RequestShow() {
  const translate = useTranslate();
  const { id } = useParams<{ id: string }>();
  const closeTo = useContextualCloseTo();
  const openChild = useOpenContextualChild();
  const nested = useOutlet();
  const invalidate = useInvalidate();

  const { result: record, query } = useShow<RequestRecord>({
    resource: "it_requests",
    id,
    meta: { appends: ["requester", "assignee", "requestTypeRef", "asset"] },
  });

  const update = useUpdate<RequestRecord, HttpError>();
  const createJob = useCreate();

  const { result: jobs, query: jq } = useList<FulfillmentJobRecord>({
    resource: "it_fulfillment_jobs",
    filters: [{ field: "requestId", operator: "eq", value: id }],
    sorters: [{ field: "dueDate", order: "asc" }],
    pagination: { mode: "off" },
    meta: { appends: ["assignee"] },
    queryOptions: { enabled: !!id, retry: false },
  });

  const { result: users } = useList<UserRef>({
    resource: "users",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    queryOptions: { retry: false },
    errorNotification: false,
  });

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState("");

  const today = () => new Date().toISOString().slice(0, 10);

  const refresh = () => {
    void query.refetch();
    void jq.refetch();
    invalidate({ resource: "it_requests", invalidates: ["list"] });
    invalidate({ resource: "it_fulfillment_jobs", invalidates: ["list"] });
  };

  const patch = (values: Record<string, unknown>, after?: () => void) => {
    if (!record) return;
    update.mutate(
      { resource: "it_requests", id: record.id, values },
      { onSuccess: () => (after ? after() : refresh()) }
    );
  };

  const doApprove = () => {
    if (!record) return;
    patch({ status: "Approved", approvedAt: today() }, () => {
      createJob.mutate(
        {
          resource: "it_fulfillment_jobs",
          values: {
            title: `Fulfill: ${record.subject}`,
            status: "Queued",
            priority: record.priority ?? null,
            requestId: record.id,
            assigneeId: record.assignee?.id ?? null,
            dueDate: record.slaDueAt ?? null,
            instructions: `Fulfillment for ${record.requestTypeRef?.name ?? record.subject}`,
          },
        },
        { onSuccess: refresh }
      );
    });
  };

  const doReject = () => {
    if (!rejectionReason.trim()) return;
    patch(
      {
        status: "Rejected",
        rejectedAt: today(),
        rejectionReason: rejectionReason.trim(),
      },
      () => {
        setRejectOpen(false);
        setRejectionReason("");
        refresh();
      }
    );
  };

  const doResolve = () => {
    patch(
      {
        status: "Fulfilled",
        ...(resolution.trim() ? { resolution: resolution.trim() } : {}),
      },
      () => {
        setResolveOpen(false);
        setResolution("");
        refresh();
      }
    );
  };

  const setAssignee = (value: string) => {
    patch({ assigneeId: value ? Number(value) : null });
  };

  const status = record?.status;
  const busy = update.mutation.isPending || createJob.mutation.isPending;

  return (
    <RouteDrawer
      title={
        query.isLoading && !record ? (
          <Skeleton className="h-6 w-56" />
        ) : (
          <span className="flex items-center gap-2">
            <span className="truncate">
              {record?.subject ?? tt(translate, "it.requests.title", "Request")}
            </span>
            {record ? <ValuePill translate={translate} value={record.status} /> : null}
          </span>
        )
      }
      description={
        record ? record.requestTypeRef?.name ?? record.category ?? "" : ""
      }
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
              {tt(translate, "it.requests.show.loadError", "This request may no longer exist.")}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5">
            {/* Approval / fulfilment actions */}
            <section className="flex flex-wrap items-center gap-2">
              {status === "New" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={doApprove}
                  >
                    <ThumbsUp />
                    {tt(translate, "it.requests.actions.approve", "Approve")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setRejectOpen((o) => !o)}
                  >
                    <Ban />
                    {tt(translate, "it.requests.actions.reject", "Reject")}
                  </Button>
                </>
              ) : null}

              {status === "Approved" ? (
                <Button type="button" size="sm" disabled={busy} onClick={() => patch({ status: "In progress" })}>
                  <PlayCircle />
                  {tt(translate, "it.requests.actions.start", "Start fulfillment")}
                </Button>
              ) : null}

              {status === "In progress" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => setResolveOpen((o) => !o)}
                  >
                    <CheckCircle2 />
                    {tt(translate, "it.requests.actions.fulfill", "Mark fulfilled")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => patch({ status: "Approved" })}
                  >
                    <Wrench />
                    {tt(translate, "it.requests.actions.hold", "Put on hold")}
                  </Button>
                </>
              ) : null}

              {status === "Fulfilled" || status === "Resolved" ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" />
                    {tt(translate, "it.requests.actions.doneState", "This request is complete.")}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => patch({ status: "In progress" })}
                  >
                    <RotateCcw />
                    {tt(translate, "it.requests.actions.reopen", "Reopen")}
                  </Button>
                </>
              ) : null}
            </section>

            {rejectOpen ? (
              <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={tt(
                    translate,
                    "it.requests.actions.reasonPlaceholder",
                    "Explain why this request is being rejected..."
                  )}
                  className="min-h-20"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={!rejectionReason.trim() || busy}
                    onClick={doReject}
                  >
                    {tt(translate, "it.requests.actions.confirmReject", "Reject request")}
                  </Button>
                </div>
              </div>
            ) : null}

            {resolveOpen ? (
              <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder={tt(
                    translate,
                    "it.requests.actions.resolutionPlaceholder",
                    "Describe how this was resolved (optional)..."
                  )}
                  className="min-h-20"
                />
                <div className="flex justify-end">
                  <Button type="button" size="sm" disabled={busy} onClick={doResolve}>
                    {tt(translate, "it.requests.actions.confirmFulfill", "Mark fulfilled")}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Assignee */}
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center">
              <span className="text-xs font-medium text-muted-foreground sm:w-28">
                {tt(translate, "it.field.assignee", "Assignee")}
              </span>
              <Select
                value={record.assigneeId ? String(record.assigneeId) : ""}
                onValueChange={(v) => setAssignee(v ?? "")}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue
                    placeholder={tt(translate, "it.common.unassigned", "Unassigned")}
                  >
                    {record.assigneeId
                      ? personName(
                          users.data.find(
                            (u) => String(u.id) === String(record.assigneeId)
                          ) ?? record.assignee
                        )
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.data.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {personName(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Details */}
            <section className="grid gap-3 sm:grid-cols-2">
              <Field label={tt(translate, "it.field.catalogService", "Catalog service")}>
                {record.requestTypeRef?.name ?? "—"}
              </Field>
              <Field label={tt(translate, "it.field.category", "Category")}>
                {record.category ?? "—"}
              </Field>
              <Field label={tt(translate, "it.field.requestType", "Request type")}>
                {record.requestType ? (
                  <ValuePill translate={translate} value={record.requestType} />
                ) : (
                  "—"
                )}
              </Field>
              <Field label={tt(translate, "it.field.priority", "Priority")}>
                {record.priority ? (
                  <ValuePill translate={translate} value={record.priority} />
                ) : (
                  "—"
                )}
              </Field>
              <Field label={tt(translate, "it.field.requester", "Requester")}>
                {record.requester ? personName(record.requester) : "—"}
              </Field>
              <Field label={tt(translate, "it.field.asset", "Related asset")}>
                {record.asset?.name ?? "—"}
              </Field>
              <Field label={tt(translate, "it.field.slaDueAt", "SLA due")}>
                {formatDate(record.slaDueAt)}
              </Field>
              <Field label={tt(translate, "it.field.approvedAt", "Approved")}>
                {formatDate(record.approvedAt)}
              </Field>
              {record.rejectedAt ? (
                <Field label={tt(translate, "it.field.rejectedAt", "Rejected")}>
                  {formatDate(record.rejectedAt)}
                </Field>
              ) : null}
              {record.rejectionReason ? (
                <div className="sm:col-span-2">
                  <Field label={tt(translate, "it.field.rejectionReason", "Rejection reason")}>
                    <span className="whitespace-pre-wrap font-normal">
                      {record.rejectionReason}
                    </span>
                  </Field>
                </div>
              ) : null}
              {record.description ? (
                <div className="sm:col-span-2">
                  <Field label={tt(translate, "it.field.description", "Description")}>
                    <span className="whitespace-pre-wrap font-normal">
                      {record.description}
                    </span>
                  </Field>
                </div>
              ) : null}
              {record.suggestedFix ? (
                <div className="sm:col-span-2">
                  <Field label={tt(translate, "it.field.suggestedFix", "Suggested resolution")}>
                    <span className="whitespace-pre-wrap font-normal">
                      {record.suggestedFix}
                    </span>
                  </Field>
                </div>
              ) : null}
              {record.resolution ? (
                <div className="sm:col-span-2">
                  <Field label={tt(translate, "it.field.resolution", "Resolution")}>
                    <span className="whitespace-pre-wrap font-normal">
                      {record.resolution}
                    </span>
                  </Field>
                </div>
              ) : null}
            </section>

            <Separator />

            {/* Fulfilment jobs */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="size-4 text-muted-foreground" />
                {tt(translate, "it.requests.jobs.title", "Fulfilment jobs")}
              </h3>
              {jobs.data.length === 0 ? (
                <EmptyState
                  label={tt(
                    translate,
                    "it.requests.jobs.empty",
                    "No fulfilment jobs yet. Approve the request to create one."
                  )}
                />
              ) : (
                <ul className="space-y-2">
                  {jobs.data.map((job) => (
                    <li key={job.id}>
                      <button
                        type="button"
                        onClick={() => openChild(`jobs/${job.id}`)}
                        className="w-full rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:bg-accent/40"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium">{job.title}</span>
                          <ValuePill translate={translate} value={job.status} className="h-5" />
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{personName(job.assignee)}</span>
                          {job.dueDate ? <span>· {formatDate(job.dueDate)}</span> : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </RouteDrawer>
  );
}
