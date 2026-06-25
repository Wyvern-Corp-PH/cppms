"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  canAccess,
  filterProjectsForUser,
} from "@workspace/pocketbase/domain/access-control"
import { computeProjectBudgetBreakdown } from "@workspace/pocketbase/domain/budget-summary"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import { formatDisplayDateTime } from "@workspace/pocketbase/domain/format-display-date"
import {
  formatProjectDateRange,
  isApprovalEligible,
  projectLocationDisplayParts,
} from "@workspace/pocketbase/domain/project-filters"
import { recordFileUrl } from "@workspace/pocketbase/files"
import {
  REQUIRED_COMPLETION_DOCUMENTS,
  approvalFormSchema,
  fieldErrorsFromZod,
  locationRecordSchema,
  parseRecordList,
  progressUpdateRecordSchema,
  projectRecordSchema,
  budgetAllocationRecordSchema,
  budgetExpenseRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  LocationRecord,
  ProgressUpdateRecord,
  ProjectRecord,
} from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Progress } from "@workspace/ui/components/progress"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"

import { DateRangeFilter } from "@/components/date-range-filter"
import { PageHeaderBand } from "@/components/page-header-band"
import {
  LocationFilterControls,
  projectMatchesLocationFilters,
  type LocationFilterValue,
} from "@/components/location-filter-controls"
import { SitePhoto, sitePhotoNames } from "@/components/site-photo"
import { SitePhotoCarousel } from "@/components/site-photo-carousel"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

function recordInDateRange(date: string | undefined, from: string, to: string) {
  if (!from && !to) return true
  if (!date) return false
  const value = Date.parse(date)
  if (Number.isNaN(value)) return false
  if (from) {
    const fromValue = Date.parse(from)
    if (!Number.isNaN(fromValue) && value < fromValue) return false
  }
  if (to) {
    const toValue = Date.parse(to)
    if (!Number.isNaN(toValue) && value > toValue) return false
  }
  return true
}

function isReviewedProject(
  project: Pick<ProjectRecord, "approval_status" | "status">
) {
  return (
    project.approval_status === "approved" ||
    project.approval_status === "rejected" ||
    project.status === "Approved" ||
    project.status === "Rejected"
  )
}

function isRejectedProject(
  project: Pick<ProjectRecord, "approval_status" | "status">
) {
  return project.approval_status === "rejected" || project.status === "Rejected"
}

function latestCompletionUpdate(updates: ProgressUpdateRecord[]) {
  return (
    [...updates]
      .filter((update) => update.to_pct >= 100)
      .sort((a, b) => {
        const aKey = a.created ?? a.updated_at ?? a.id
        const bKey = b.created ?? b.updated_at ?? b.id
        return bKey.localeCompare(aKey)
      })[0] ?? null
  )
}

function fileNamesFor(update: ProgressUpdateRecord, field: string): string[] {
  const value = update[field as keyof ProgressUpdateRecord]
  if (Array.isArray(value)) {
    return value.filter(
      (name): name is string =>
        typeof name === "string" && name.trim().length > 0
    )
  }
  return typeof value === "string" && value.trim() ? [value] : []
}

function completionDocumentStatus(updates: ProgressUpdateRecord[]) {
  const update = latestCompletionUpdate(updates)
  const missing = REQUIRED_COMPLETION_DOCUMENTS.filter((doc) => {
    if (!update) return true
    return fileNamesFor(update, doc.field).length === 0
  })

  return { update, missing }
}

function CompletionDocumentsPanel({
  updates,
}: {
  updates: ProgressUpdateRecord[]
}) {
  const status = completionDocumentStatus(updates)

  return (
    <div className="rounded-md border p-3">
      <p className="font-medium">Completion documents</p>
      {status.update ? (
        <dl className="mt-2 space-y-2">
          {REQUIRED_COMPLETION_DOCUMENTS.map((doc) => {
            const names = fileNamesFor(status.update!, doc.field)
            return (
              <div key={doc.field}>
                <dt className="text-xs text-muted-foreground">{doc.label}</dt>
                <dd className="text-sm">
                  {names.length > 0 ? (
                    <ul className="space-y-1">
                      {names.map((name) => {
                        const href = recordFileUrl(status.update!, name)
                        return (
                          <li key={name}>
                            {href ? (
                              <a
                                className="text-primary underline-offset-2 hover:underline"
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {name}
                              </a>
                            ) : (
                              name
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <span className="text-warning">
                      {doc.label} is missing.
                    </span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-warning">
          No 100% progress update with completion documents is on file.
        </p>
      )}
    </div>
  )
}

export function ApprovalsModule() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [updates, setUpdates] = useState<ProgressUpdateRecord[]>([])
  const [allocations, setAllocations] = useState<BudgetAllocationRecord[]>([])
  const [expenses, setExpenses] = useState<BudgetExpenseRecord[]>([])
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ProjectRecord | null>(null)
  const [locationFilters, setLocationFilters] = useState<LocationFilterValue>({
    municipality: "",
    barangay: "",
  })
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [dialog, setDialog] = useState<"approve" | "reject" | "request_revision" | null>(null)
  const [authorityName, setAuthorityName] = useState("")
  const [reason, setReason] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [completionDocError, setCompletionDocError] = useState<string | null>(
    null
  )
  const actor = getPocketBase().authStore?.record
  const canCreateApprovalActions = actor
    ? canAccess(actor, "approval_actions.create")
    : false

  const load = useCallback(async () => {
    setLoading(true)
    const pb = getPocketBase()
    const [projectRows, updateRows, allocationRows, expenseRows, locationRows] =
      await Promise.all([
        pb.collection("projects").getFullList(),
        pb.collection("progress_updates").getFullList(),
        pb.collection("budget_allocations").getFullList(),
        pb.collection("budget_expenses").getFullList(),
        pb.collection("locations").getFullList().catch(() => []),
      ])
    setProjects(parseRecordList(projectRecordSchema, projectRows))
    setUpdates(parseRecordList(progressUpdateRecordSchema, updateRows))
    setAllocations(
      parseRecordList(budgetAllocationRecordSchema, allocationRows)
    )
    setExpenses(parseRecordList(budgetExpenseRecordSchema, expenseRows))
    setLocations(parseRecordList(locationRecordSchema, locationRows))
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const { live } = usePocketBaseRealtime(
    ["projects", "approval_actions", "progress_updates"],
    () => {
      void load()
    }
  )

  const dateFilteredCompletionProjectIds = useMemo(() => {
    if (!dateFrom && !dateTo) return null
    return new Set(
      updates
        .filter(
          (update) =>
            update.to_pct >= 100 &&
            recordInDateRange(update.updated_at ?? update.created, dateFrom, dateTo)
        )
        .map((update) => update.project)
    )
  }, [dateFrom, dateTo, updates])

  const scopedProjects = useMemo(
    () => (actor?.role ? filterProjectsForUser(actor, projects) : projects),
    [actor, projects]
  )
  const filteredProjects = useMemo(
    () =>
      scopedProjects.filter(
        (project) =>
          projectMatchesLocationFilters(project, locationFilters) &&
          (!dateFilteredCompletionProjectIds ||
            dateFilteredCompletionProjectIds.has(project.id))
      ),
    [dateFilteredCompletionProjectIds, locationFilters, scopedProjects]
  )

  const queue = useMemo(
    () =>
      filteredProjects.filter(
        (project) => isApprovalEligible(project) && !isReviewedProject(project)
      ),
    [filteredProjects]
  )
  const approved = filteredProjects.filter(
    (project) => project.approval_status === "approved"
  )
  const rejected = filteredProjects.filter(
    (project) => project.approval_status === "rejected"
  )

  const reviewedBudgetTotal = useMemo(
    () =>
      [...queue, ...approved, ...rejected].reduce(
        (sum, project) => sum + (project.total_budget ?? 0),
        0
      ),
    [queue, approved, rejected]
  )

  function projectBudget(project: ProjectRecord) {
    const breakdown = computeProjectBudgetBreakdown(
      [project],
      allocations,
      expenses
    )[0]
    return (
      breakdown ?? {
        spent: 0,
        totalBudget: project.total_budget ?? 0,
        remaining: project.total_budget ?? 0,
      }
    )
  }

  function projectUpdates(projectId: string) {
    return updates.filter((update) => update.project === projectId)
  }

  async function submitAction(action: "approve" | "reject" | "request_revision") {
    if (!selected) return
    if (!canCreateApprovalActions) return

    const parsed = approvalFormSchema.safeParse({
      action,
      authority_name: authorityName,
      reason,
    })

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    setFieldErrors({})
    setCompletionDocError(null)

    if (action === "approve" && (selected.progress_pct ?? 0) >= 100) {
      const status = completionDocumentStatus(projectUpdates(selected.id))
      if (status.missing.length > 0) {
        setCompletionDocError(
          "Complete all required completion documents before approval."
        )
        return
      }
    }

    const pb = getPocketBase()
    await pb.collection("approval_actions").create({
      project: selected.id,
      action: parsed.data.action,
      authority_name: parsed.data.authority_name,
      reason:
        parsed.data.action === "reject" ||
        parsed.data.action === "request_revision"
          ? parsed.data.reason
          : undefined,
    })

    if (parsed.data.action !== "request_revision") {
      await pb.collection("projects").update(selected.id, {
        approval_status:
          parsed.data.action === "approve" ? "approved" : "rejected",
        status: parsed.data.action === "approve" ? "Approved" : "Rejected",
        approved_at:
          parsed.data.action === "approve"
            ? new Date().toISOString().slice(0, 10)
            : undefined,
        rejection_reason:
          parsed.data.action === "reject" ? parsed.data.reason : undefined,
      })
    }

    setDialog(null)
    setAuthorityName("")
    setReason("")
    setSelected(null)
    await load()
  }

  function ApprovalCard({ project }: { project: ProjectRecord }) {
    const budget = projectBudget(project)
    const projectUpdateList = projectUpdates(project.id)
    const spent = "spent" in budget ? budget.spent : 0
    const total = project.total_budget ?? 0
    const saved = Math.max(0, total - spent)
    const utilPct = total > 0 ? Math.round((spent / total) * 100) : 0
    const photos = projectUpdateList.filter(
      (u) => sitePhotoNames(u.site_photo).length > 0
    )
    const isReviewed = isReviewedProject(project)
    const isRejected = isRejectedProject(project)
    const completionStatus = completionDocumentStatus(projectUpdateList)

    return (
      <article
        className="rounded-lg border border-border bg-card p-4"
        data-testid={`approval-card-${project.id}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">{project.name}</h2>
            <p className="text-sm text-muted-foreground">
              {[
                ...projectLocationDisplayParts(project),
                project.category,
                project.lgu_level,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-sm">{formatPhp(total)}</p>
          </div>
          <Badge>{project.status}</Badge>
        </div>
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-xs">Progress {project.progress_pct ?? 0}%</p>
            <Progress value={project.progress_pct ?? 0} />
          </div>
          <div>
            <p className="text-xs">
              Utilization {utilPct}% · Spent {formatPhp(spent)} · Saved{" "}
              {formatPhp(saved)}
            </p>
            <Progress value={utilPct} />
          </div>
          <p className="text-xs text-muted-foreground">
            {projectUpdateList.length} progress updates
          </p>
          <SitePhotoCarousel
            updates={photos}
            alt={`${project.name} site photo`}
          />
        </div>
        {isRejected && project.rejection_reason ? (
          <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm">
            <p className="font-medium text-destructive">Reason for rejection</p>
            <p className="mt-1 text-muted-foreground">
              {project.rejection_reason}
            </p>
          </div>
        ) : null}
        {(project.progress_pct ?? 0) >= 100 &&
        !isReviewed &&
        completionStatus.missing.length > 0 ? (
          <p
            className="mt-2 text-sm text-warning"
            role="status"
            data-testid="missing-docs-banner"
          >
            Missing completion documents:{" "}
            {completionStatus.missing.map((doc) => doc.label).join(", ")}.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelected(project)}
          >
            View details
          </Button>
          {!isReviewed && canCreateApprovalActions ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSelected(project)
                  setCompletionDocError(null)
                  setDialog("approve")
                }}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  setSelected(project)
                  setCompletionDocError(null)
                  setDialog("reject")
                }}
              >
                Reject
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelected(project)
                  setCompletionDocError(null)
                  setDialog("request_revision")
                }}
              >
                Request Revision
              </Button>
            </>
          ) : null}
        </div>
      </article>
    )
  }

  if (loading) {
    return (
      <div
        className="h-32 animate-pulse rounded-md bg-muted"
        data-testid="approvals-skeleton"
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeaderBand
        title="Completion approvals"
        context="Review finished projects before closure."
        live={live}
      />

      {queue.length > 0 ? (
        <div
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
          role="status"
        >
          {queue.length} project(s) awaiting completion approval.
        </div>
      ) : null}

      <SummaryCardRow
        cards={[
          {
            label: "Pending approval",
            value: String(queue.length),
            testId: "approvals-queue",
          },
          {
            label: "Approved",
            value: String(approved.length),
            testId: "approvals-approved",
          },
          {
            label: "Rejected",
            value: String(rejected.length),
            testId: "approvals-rejected",
          },
          {
            label: "Total budget managed",
            value: formatPhp(reviewedBudgetTotal),
            testId: "approvals-budget-managed",
          },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <LocationFilterControls
          locations={locations}
          value={locationFilters}
          onChange={setLocationFilters}
        />
        <DateRangeFilter
          id="approvals-date-range"
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Tabs defaultValue="queue">
          <div className="-mx-1 overflow-x-auto pb-1">
            <TabsList className="w-max min-w-full">
              <TabsTrigger value="queue">Completion approval</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="queue" className="space-y-3">
            {queue.length === 0 ? (
              <div className="rounded-md border p-6 text-center">
                <h2 className="font-semibold">Queue is clear</h2>
              </div>
            ) : (
              queue.map((project) => (
                <ApprovalCard key={project.id} project={project} />
              ))
            )}
          </TabsContent>
          <TabsContent value="approved" className="space-y-3">
            {approved.map((project) => (
              <ApprovalCard key={project.id} project={project} />
            ))}
          </TabsContent>
          <TabsContent value="rejected" className="space-y-3">
            {rejected.map((project) => (
              <ApprovalCard key={project.id} project={project} />
            ))}
          </TabsContent>
        </Tabs>

        <aside
          className="rounded-lg border border-border bg-card p-4"
          data-testid="approval-detail-panel"
        >
          <h2 className="font-semibold">Review detail</h2>
          {selected ? (
            <div className="mt-3 space-y-3 text-sm">
              <p className="font-medium">{selected.name}</p>
              <p className="text-muted-foreground">
                {[
                  ...projectLocationDisplayParts(selected),
                  selected.category,
                  selected.lgu_level,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p>
                {selected.status} · {selected.contractor ?? "—"}
              </p>
              <p>
                {formatProjectDateRange(
                  selected.start_date,
                  selected.target_end_date
                )}
              </p>
              {selected.description ? <p>{selected.description}</p> : null}
              {(() => {
                const b = projectBudget(selected)
                const spent = "spent" in b ? b.spent : 0
                const total = selected.total_budget ?? 0
                const savings = Math.max(0, total - spent)
                return (
                  <div className="rounded-md border p-3">
                    <p>Total budget: {formatPhp(total)}</p>
                    <p className="text-destructive">
                      Total spent: {formatPhp(spent)}
                    </p>
                    <p className="text-success">
                      Savings: {formatPhp(savings)}
                    </p>
                  </div>
                )
              })()}
              <CompletionDocumentsPanel updates={projectUpdates(selected.id)} />
              {isRejectedProject(selected) && selected.rejection_reason ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                  <p className="font-medium text-destructive">
                    Reason for rejection
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {selected.rejection_reason}
                  </p>
                </div>
              ) : null}
              <ul className="space-y-2">
                {projectUpdates(selected.id).map((update) => (
                  <li key={update.id} className="border-b pb-2">
                    {update.from_pct}% → {update.to_pct}% ·{" "}
                    {formatDisplayDateTime(update.updated_at ?? update.created)}
                    {update.notes ? (
                      <p className="text-xs">{update.notes}</p>
                    ) : null}
                    <SitePhoto
                      update={update}
                      alt={`${selected.name} progress update`}
                      className="mt-1 h-24 w-full max-w-xs"
                    />
                  </li>
                ))}
              </ul>
              {!isReviewedProject(selected) && canCreateApprovalActions ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setCompletionDocError(null)
                      setDialog("reject")
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setCompletionDocError(null)
                      setDialog("approve")
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCompletionDocError(null)
                      setDialog("request_revision")
                    }}
                  >
                    Request Revision
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Select a project to review.
            </p>
          )}
        </aside>
      </div>

      <Dialog
        open={dialog !== null}
        onOpenChange={() => {
          setDialog(null)
          setCompletionDocError(null)
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog === "approve"
                ? "Approve project completion"
                : dialog === "reject"
                  ? "Reject project completion"
                  : "Request revision"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "approve"
                ? "Provincial Admin review: confirm that deliverables and completion documents are ready for approval."
                : dialog === "reject"
                  ? "Provincial Admin review: provide a rejection reason so the project team can address it."
                  : "Provincial Admin review: send revision notes back to the barangay before provincial approval."}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            {completionDocError && selected ? (
              <div
                className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm"
                role="alert"
              >
                <p className="font-medium text-warning">{completionDocError}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  {completionDocumentStatus(
                    projectUpdates(selected.id)
                  ).missing.map((doc) => (
                    <li key={doc.field}>{doc.label} is missing.</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Field data-invalid={!!fieldErrors.authority_name}>
              <FieldLabel htmlFor="authority-name">
                {dialog === "approve"
                  ? "Approving authority name"
                  : "Reviewing authority name"}
              </FieldLabel>
              <Input
                id="authority-name"
                value={authorityName}
                aria-invalid={Boolean(fieldErrors.authority_name)}
                onChange={(e) => setAuthorityName(e.target.value)}
              />
              <FieldError>{fieldErrors.authority_name}</FieldError>
            </Field>
            {dialog === "reject" || dialog === "request_revision" ? (
              <Field data-invalid={!!fieldErrors.reason}>
                <FieldLabel htmlFor="reject-reason">
                  {dialog === "reject" ? "Reason for rejection" : "Revision notes"}
                </FieldLabel>
                <Textarea
                  id="reject-reason"
                  value={reason}
                  aria-invalid={Boolean(fieldErrors.reason)}
                  onChange={(e) => setReason(e.target.value)}
                />
                <FieldError>{fieldErrors.reason}</FieldError>
              </Field>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="confirm-approval-action"
              onClick={() => void submitAction(dialog ?? "approve")}
            >
              {dialog === "approve"
                ? "Confirm approval"
                : dialog === "reject"
                  ? "Confirm rejection"
                  : "Confirm request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
