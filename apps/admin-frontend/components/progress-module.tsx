"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  canAccess,
  filterProjectsForUser,
} from "@workspace/pocketbase/domain/access-control"
import { formatDisplayDateTime } from "@workspace/pocketbase/domain/format-display-date"
import {
  formatProjectDateRange,
  projectLocationDisplayParts,
} from "@workspace/pocketbase/domain/project-filters"
import {
  buildUserDisplayMap,
  displayUserRef,
  type UserDisplayRecord,
} from "@workspace/pocketbase/domain/user-display"
import {
  buildProgressSummaryCards,
  effectiveProgressPct,
} from "@workspace/pocketbase/domain/progress-summary"
import {
  REQUIRED_COMPLETION_DOCUMENTS,
  type CompletionDocumentField,
  budgetExpenseRecordSchema,
  fieldErrorsFromZod,
  firstZodError,
  locationRecordSchema,
  parseRecordList,
  progressUpdateFormSchema,
  progressUpdateRecordSchema,
  progressUpdateRevisionFormSchema,
  progressUpdateRevisionWithReleasedAmountFormSchema,
  progressUpdateWithReleasedAmountFormSchema,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
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
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Progress } from "@workspace/ui/components/progress"
import { Slider } from "@workspace/ui/components/slider"
import { Textarea } from "@workspace/ui/components/textarea"

import {
  DocumentUploadField,
  IMAGE_UPLOAD_ACCEPT,
} from "@/components/document-upload-field"
import { DateRangeFilter } from "@/components/date-range-filter"
import {
  LocationFilterControls,
  projectMatchesLocationFilters,
  type LocationFilterValue,
} from "@/components/location-filter-controls"
import { PageHeaderBand } from "@/components/page-header-band"
import {
  emptyReleasedAmountFormValue,
  ReleasedAmountFields,
  type ReleasedAmountFormValue,
} from "@/components/released-amount-fields"
import { SitePhoto } from "@/components/site-photo"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

const SLIDER_MARKERS = [0, 25, 50, 75, 100]
const EDITABLE_PROGRESS_STATUSES = [
  "Planning",
  "Procurement",
  "Ongoing",
  "For Revision",
] as const

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

type CompletionDocumentState = {
  certification_completion: File[]
  certificate_acceptance: File[]
  proof_payment_barangay: File[]
  acknowledgment_completion: File[]
  audit_documents: File[]
  verification_documents: File[]
  liquidation_documents: File[]
}

const emptyCompletionDocuments = (): CompletionDocumentState => ({
  certification_completion: [],
  certificate_acceptance: [],
  proof_payment_barangay: [],
  acknowledgment_completion: [],
  audit_documents: [],
  verification_documents: [],
  liquidation_documents: [],
})

function lastUpdatedLabel(updates: ProgressUpdateRecord[]): string {
  const latest = updates[0]
  if (!latest) return "—"
  return formatDisplayDateTime(latest.updated_at ?? latest.created)
}

function canUpdateProjectProgress(
  project: ProjectRecord,
  canCreateProgressUpdates: boolean
) {
  return (
    canCreateProgressUpdates &&
    (EDITABLE_PROGRESS_STATUSES as readonly string[]).includes(project.status)
  )
}

function requiresReleasedAmountForActor(
  actor: ReturnType<typeof getPocketBase>["authStore"]["record"]
) {
  return actor?.role === "Barangay" || actor?.role === "Municipality"
}

function splitProgressFieldErrors(errors: Record<string, string>) {
  const releasedAmountErrors: Record<string, string> = {}
  const progressErrors: Record<string, string> = {}

  for (const [key, message] of Object.entries(errors)) {
    if (key.startsWith("releasedAmount.")) {
      releasedAmountErrors[key.replace("releasedAmount.", "")] = message
      continue
    }
    progressErrors[key] = message
  }

  return { progressErrors, releasedAmountErrors }
}

function toReleasedAmountInput(value: ReleasedAmountFormValue) {
  return {
    amount: value.amount,
    year: value.releaseYear,
    main_account: value.mainAccount,
    sub_account: value.subAccount || undefined,
    date: value.expenseDate,
    receipt_number: value.receiptNumber || undefined,
    description: value.expenseDescription || undefined,
  }
}

function namesOnRecord(...values: (string | string[] | undefined)[]): string[] {
  return values.flatMap((value) => {
    if (Array.isArray(value)) {
      return value.filter((name) => Boolean(name.trim()))
    }
    return value?.trim() ? [value] : []
  })
}

function recordRecencyKey(row: {
  created?: string
  updated_at?: string
  id: string
}) {
  return row.created ?? row.updated_at ?? row.id
}

function compareByRecencyDesc<
  T extends { created?: string; updated_at?: string; id: string },
>(a: T, b: T) {
  return recordRecencyKey(b).localeCompare(recordRecencyKey(a))
}

function latestByCreated<
  T extends { created?: string; updated_at?: string; id: string },
>(rows: T[]): T | undefined {
  if (rows.length === 0) return undefined
  return [...rows].sort(compareByRecencyDesc)[0]
}

function progressUpdateFormSchemaFor(options: {
  revision: boolean
  withReleasedAmount: boolean
}) {
  if (options.revision && options.withReleasedAmount) {
    return progressUpdateRevisionWithReleasedAmountFormSchema
  }
  if (options.revision) {
    return progressUpdateRevisionFormSchema
  }
  if (options.withReleasedAmount) {
    return progressUpdateWithReleasedAmountFormSchema
  }
  return progressUpdateFormSchema
}

async function rollbackCreatedProgressUpdate(
  pb: ReturnType<typeof getPocketBase>,
  progressRecordId: string
) {
  try {
    await pb.collection("progress_updates").delete(progressRecordId)
  } catch (rollbackError) {
    console.warn(
      "Progress update saved, but released amount rollback failed.",
      rollbackError
    )
  }
}

function releasedAmountFormFromExpense(
  expense: BudgetExpenseRecord
): ReleasedAmountFormValue {
  return {
    amount: String(expense.amount),
    releaseYear: String(expense.year),
    mainAccount: expense.main_account,
    subAccount: expense.sub_account ?? "",
    receiptNumber: expense.receipt_number ?? "",
    expenseDate: expense.date,
    expenseDescription: expense.description ?? "",
  }
}

function coerceComparable(value: unknown) {
  if (value === undefined || value === null) return ""
  return String(value)
}

function releasedAmountEqualsLatest(
  submitted: ReturnType<typeof toReleasedAmountInput>,
  latest: BudgetExpenseRecord | undefined
) {
  if (!latest) return false
  return (
    Number(submitted.amount) === Number(latest.amount) &&
    Number(submitted.year) === Number(latest.year) &&
    coerceComparable(submitted.main_account) ===
      coerceComparable(latest.main_account) &&
    coerceComparable(submitted.sub_account) ===
      coerceComparable(latest.sub_account) &&
    coerceComparable(submitted.date) === coerceComparable(latest.date) &&
    coerceComparable(submitted.receipt_number) ===
      coerceComparable(latest.receipt_number) &&
    coerceComparable(submitted.description) ===
      coerceComparable(latest.description)
  )
}

function existingCompletionDocNamesFromUpdate(
  update: ProgressUpdateRecord | undefined
) {
  if (!update) return undefined
  return {
    certification_completion: namesOnRecord(update.certification_completion),
    certificate_acceptance: namesOnRecord(update.certificate_acceptance),
    proof_payment_barangay: namesOnRecord(update.proof_payment_barangay),
    acknowledgment_completion: namesOnRecord(update.acknowledgment_completion),
    audit_documents: namesOnRecord(update.audit_documents),
    verification_documents: namesOnRecord(update.verification_documents),
    liquidation_documents: namesOnRecord(update.liquidation_documents),
  }
}

export function ProgressModule() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [updates, setUpdates] = useState<ProgressUpdateRecord[]>([])
  const [expenses, setExpenses] = useState<BudgetExpenseRecord[]>([])
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [users, setUsers] = useState<UserDisplayRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [locationFilters, setLocationFilters] = useState<LocationFilterValue>({
    municipality: "",
    barangay: "",
  })
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogProjectId, setDialogProjectId] = useState("")
  const [toPct, setToPct] = useState(50)
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [completionDocs, setCompletionDocs] = useState<CompletionDocumentState>(
    emptyCompletionDocuments()
  )
  const [existingSitePhotoNames, setExistingSitePhotoNames] = useState<
    string[]
  >([])
  const [existingCompletionDocNames, setExistingCompletionDocNames] = useState<
    ReturnType<typeof existingCompletionDocNamesFromUpdate>
  >(undefined)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [releasedAmount, setReleasedAmount] = useState<ReleasedAmountFormValue>(
    emptyReleasedAmountFormValue()
  )
  const [releasedAmountErrors, setReleasedAmountErrors] = useState<
    Record<string, string>
  >({})
  const [expensesLoadError, setExpensesLoadError] = useState<string | null>(
    null
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const actor = getPocketBase().authStore?.record
  const canCreateProgressUpdates = actor
    ? canAccess(actor, "progress_updates.create")
    : true
  // Same roles that have create also have update in ROLE_POLICIES; create remains
  // the intentional UI gate, but mutation sites re-check the matching capability.
  const canUpdateProgressUpdates = actor
    ? canAccess(actor, "progress_updates.update")
    : true
  const requiresReleasedAmount = requiresReleasedAmountForActor(actor)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()
      const [projectRows, updateRows, expenseResult, locationRows, userRows] =
        await Promise.all([
          pb.collection("projects").getFullList(),
          pb.collection("progress_updates").getFullList(),
          pb
            .collection("budget_expenses")
            .getFullList()
            .then(
              (rows) => ({ ok: true as const, rows }),
              (error: unknown) => ({ ok: false as const, error })
            ),
          pb.collection("locations").getFullList().catch(() => []),
          pb.collection("users").getFullList().catch(() => []),
        ])
      const parsedUpdates = parseRecordList(
        progressUpdateRecordSchema,
        updateRows
      )
      parsedUpdates.sort(compareByRecencyDesc)
      setProjects(parseRecordList(projectRecordSchema, projectRows))
      setLocations(parseRecordList(locationRecordSchema, locationRows))
      setUpdates(parsedUpdates)
      setUsers(userRows as UserDisplayRecord[])

      if (expenseResult.ok) {
        const parsedExpenses = parseRecordList(
          budgetExpenseRecordSchema,
          expenseResult.rows
        )
        parsedExpenses.sort(compareByRecencyDesc)
        setExpenses(parsedExpenses)
        setExpensesLoadError(null)
        setLoadError(null)
      } else {
        console.warn("Failed to load budget expenses.", expenseResult.error)
        setExpensesLoadError(
          "Unable to load released amount history. Refresh before saving a progress update."
        )
        setLoadError(
          "Unable to load released amount history. Refresh before saving a progress update."
        )
        // Keep previous expenses — do not treat load failure as empty history.
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const { live } = usePocketBaseRealtime(
    ["projects", "progress_updates", "budget_expenses"],
    () => {
      void load()
    }
  )

  const dateFilteredUpdates = useMemo(
    () =>
      updates.filter((update) =>
        recordInDateRange(update.updated_at ?? update.created, dateFrom, dateTo)
      ),
    [dateFrom, dateTo, updates]
  )
  const dateFilteredProjectIds = useMemo(
    () => new Set(dateFilteredUpdates.map((update) => update.project)),
    [dateFilteredUpdates]
  )
  const hasDateFilter = Boolean(dateFrom || dateTo)
  const scopedProjects = useMemo(
    () => (actor?.role ? filterProjectsForUser(actor, projects) : projects),
    [actor, projects]
  )
  const filteredProjects = useMemo(
    () =>
      scopedProjects.filter(
        (project) =>
          projectMatchesLocationFilters(project, locationFilters) &&
          (!hasDateFilter || dateFilteredProjectIds.has(project.id))
      ),
    [dateFilteredProjectIds, hasDateFilter, locationFilters, scopedProjects]
  )
  const filteredProjectIds = useMemo(
    () => new Set(filteredProjects.map((project) => project.id)),
    [filteredProjects]
  )
  const filteredUpdates = useMemo(
    () => dateFilteredUpdates.filter((update) => filteredProjectIds.has(update.project)),
    [dateFilteredUpdates, filteredProjectIds]
  )
  const summary = buildProgressSummaryCards(filteredProjects, filteredUpdates)
  const userDisplay = useMemo(
    () => buildUserDisplayMap(users, actor ? [actor] : []),
    [actor, users]
  )
  const selected = projects.find((project) => project.id === selectedId) ?? null
  const selectedUpdates = useMemo(
    () =>
      selected
        ? updates.filter((update) => update.project === selected.id)
        : [],
    [selected, updates]
  )

  function revisionContextFor(project: ProjectRecord) {
    const isForRevision = project.status === "For Revision"
    const projectUpdates = updates.filter(
      (update) => update.project === project.id
    )
    const projectExpenses = expenses.filter(
      (expense) => expense.project === project.id
    )
    const latestUpdate = isForRevision
      ? latestByCreated(projectUpdates)
      : undefined
    const latestExpense = isForRevision
      ? latestByCreated(projectExpenses)
      : undefined
    return {
      isForRevision,
      projectUpdates,
      projectExpenses,
      latestUpdate,
      latestExpense,
    }
  }

  function openUpdateModal(project: ProjectRecord) {
    if (!canUpdateProjectProgress(project, canCreateProgressUpdates)) {
      return
    }
    if (expensesLoadError && requiresReleasedAmount) {
      setFormError(expensesLoadError)
      setLoadError(expensesLoadError)
      return
    }
    const { latestUpdate, latestExpense } = revisionContextFor(project)

    setDialogProjectId(project.id)
    setToPct(
      latestUpdate
        ? latestUpdate.to_pct
        : effectiveProgressPct(
            project,
            updates.filter((update) => update.project === project.id)
          )
    )
    setNotes(latestUpdate?.notes ?? "")
    setPhotos([])
    setCompletionDocs(emptyCompletionDocuments())
    setExistingSitePhotoNames(
      latestUpdate ? namesOnRecord(latestUpdate.site_photo) : []
    )
    setExistingCompletionDocNames(
      existingCompletionDocNamesFromUpdate(latestUpdate)
    )
    setReleasedAmount(
      latestExpense
        ? releasedAmountFormFromExpense(latestExpense)
        : emptyReleasedAmountFormValue()
    )
    setReleasedAmountErrors({})
    setFieldErrors({})
    setFormError(null)
    setDialogOpen(true)
  }

  function openDetails(projectId: string) {
    setSelectedId(projectId)
    setDetailOpen(true)
  }

  function setCompletionDocument(
    field: CompletionDocumentField,
    files: File[]
  ) {
    setCompletionDocs((current) => ({
      ...current,
      [field]: files,
    }))
  }

  function appendCompletionDocuments(formData: FormData) {
    for (const doc of REQUIRED_COMPLETION_DOCUMENTS) {
      for (const file of completionDocs[doc.field]) {
        formData.append(doc.field, file)
      }
    }
  }

  function validateProgressUpdateInput(options: {
    projectId: string
    revision: boolean
    latestUpdate: ProgressUpdateRecord | undefined
  }) {
    const existingSitePhotoNamesFromRecord = options.latestUpdate
      ? namesOnRecord(options.latestUpdate.site_photo)
      : []
    const existingCompletionDocNamesFromRecord =
      existingCompletionDocNamesFromUpdate(options.latestUpdate)

    const parseInput = {
      projectId: options.projectId,
      toPct,
      notes,
      sitePhoto: photos,
      completionDocs,
      ...(options.revision
        ? {
            existingSitePhotoNames: existingSitePhotoNamesFromRecord,
            existingCompletionDocNames: existingCompletionDocNamesFromRecord,
          }
        : {}),
      ...(requiresReleasedAmount
        ? { releasedAmount: toReleasedAmountInput(releasedAmount) }
        : {}),
    }

    return progressUpdateFormSchemaFor({
      revision: options.revision,
      withReleasedAmount: requiresReleasedAmount,
    }).safeParse(parseInput)
  }

  function buildProgressUpdateFormData(
    parsed: {
      projectId: string
      toPct: number
      notes?: string
      sitePhoto: File[]
    },
    latestUpdate: ProgressUpdateRecord | undefined
  ) {
    const formData = new FormData()
    formData.append("project", parsed.projectId)
    formData.append("to_pct", String(parsed.toPct))
    if (latestUpdate) {
      formData.append("notes", parsed.notes ?? "")
    } else if (parsed.notes) {
      formData.append("notes", parsed.notes)
    }
    for (const file of parsed.sitePhoto) {
      formData.append("site_photo", file)
    }
    if (parsed.toPct >= 100) {
      appendCompletionDocuments(formData)
    }
    return formData
  }

  async function syncReleasedAmountExpense(options: {
    pb: ReturnType<typeof getPocketBase>
    projectId: string
    releasedAmount: ReturnType<typeof toReleasedAmountInput>
    latestExpense: BudgetExpenseRecord | undefined
    latestUpdate: ProgressUpdateRecord | undefined
    progressRecordId: string | undefined
  }) {
    const shouldCreateExpense = !releasedAmountEqualsLatest(
      options.releasedAmount,
      options.latestExpense
    )
    if (!shouldCreateExpense) {
      return
    }

    try {
      await options.pb.collection("budget_expenses").create({
        project: options.projectId,
        ...options.releasedAmount,
      })
    } catch (error) {
      console.warn("Released amount sync failed after progress save.", {
        projectId: options.projectId,
        progressUpdateId: options.progressRecordId,
        revisionUpdate: Boolean(options.latestUpdate),
        error,
      })
      if (!options.latestUpdate && options.progressRecordId) {
        await rollbackCreatedProgressUpdate(
          options.pb,
          options.progressRecordId
        )
      }
      throw error
    }
  }

  async function patchProjectAfterProgressSave(options: {
    pb: ReturnType<typeof getPocketBase>
    projectId: string
    toPct: number
    currentStatus: string
  }) {
    try {
      await options.pb.collection("projects").update(options.projectId, {
        progress_pct: options.toPct,
        status:
          options.toPct >= 100 ? "Ready for Review" : options.currentStatus,
      })
    } catch (error) {
      console.warn(
        "Progress update saved, but project summary did not update.",
        error
      )
    }
  }

  function resetProgressDialogState() {
    setDialogOpen(false)
    setPhotos([])
    setCompletionDocs(emptyCompletionDocuments())
    setExistingSitePhotoNames([])
    setExistingCompletionDocNames(undefined)
    setReleasedAmount(emptyReleasedAmountFormValue())
  }

  async function saveUpdate() {
    if (!canCreateProgressUpdates) {
      return
    }

    setFormError(null)
    const project = scopedProjects.find((row) => row.id === dialogProjectId)
    if (!project) {
      setFormError("Project is required.")
      return
    }
    if (!canUpdateProjectProgress(project, canCreateProgressUpdates)) {
      setFormError("This project is read-only for progress updates.")
      return
    }

    const { projectUpdates, latestUpdate, latestExpense } =
      revisionContextFor(project)
    const useRevisionValidation = Boolean(
      project.status === "For Revision" && latestUpdate
    )

    if (requiresReleasedAmount && expensesLoadError) {
      setFormError(expensesLoadError)
      return
    }

    const parsed = validateProgressUpdateInput({
      projectId: dialogProjectId,
      revision: useRevisionValidation,
      latestUpdate,
    })

    if (!parsed.success) {
      const nextFieldErrors = fieldErrorsFromZod(parsed.error)
      const { progressErrors, releasedAmountErrors: nextReleasedAmountErrors } =
        splitProgressFieldErrors(nextFieldErrors)
      const nextFormError = firstZodError(parsed.error)

      setFieldErrors(progressErrors)
      setReleasedAmountErrors(nextReleasedAmountErrors)
      setFormError(
        Object.values(nextFieldErrors).includes(nextFormError)
          ? null
          : nextFormError
      )
      return
    }

    // Create capability is the intentional UI gate. Immediately before mutate,
    // re-check create vs update to match the PB operation (same role policies).
    const canMutateThisPath = latestUpdate
      ? canUpdateProgressUpdates
      : canCreateProgressUpdates
    if (!canUpdateProjectProgress(project, canMutateThisPath)) {
      setFormError("This project is read-only for progress updates.")
      return
    }

    setFieldErrors({})
    setReleasedAmountErrors({})
    setSaving(true)
    const pb = getPocketBase()
    try {
      const formData = buildProgressUpdateFormData(parsed.data, latestUpdate)
      let progressRecordId: string | undefined

      if (latestUpdate) {
        await pb
          .collection("progress_updates")
          .update(latestUpdate.id, formData)
        progressRecordId = latestUpdate.id
      } else {
        formData.append(
          "from_pct",
          String(effectiveProgressPct(project, projectUpdates))
        )
        const progressRecord = await pb
          .collection("progress_updates")
          .create(formData)
        progressRecordId = progressRecord.id
      }

      if (requiresReleasedAmount) {
        await syncReleasedAmountExpense({
          pb,
          projectId: parsed.data.projectId,
          releasedAmount: toReleasedAmountInput(releasedAmount),
          latestExpense,
          latestUpdate,
          progressRecordId,
        })
      }

      await patchProjectAfterProgressSave({
        pb,
        projectId: parsed.data.projectId,
        toPct: parsed.data.toPct,
        currentStatus: project.status,
      })

      resetProgressDialogState()
      await load()
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save progress update."
      )
    } finally {
      setSaving(false)
    }
  }

  const dialogProject = projects.find((p) => p.id === dialogProjectId)
  const dialogProjectUpdates = dialogProject
    ? updates.filter((update) => update.project === dialogProject.id)
    : []
  const dialogProgress = dialogProject
    ? effectiveProgressPct(dialogProject, dialogProjectUpdates)
    : 0
  const selectedProgress = selected
    ? effectiveProgressPct(selected, selectedUpdates)
    : 0

  if (loading) {
    return (
      <div
        className="h-32 animate-pulse rounded-md bg-muted"
        data-testid="progress-skeleton"
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeaderBand
        title="Progress tracking"
        context="Site updates and completion percentages."
        live={live}
      />

      {loadError ? (
        <p className="text-destructive text-sm" role="alert">
          {loadError}
        </p>
      ) : null}

      <SummaryCardRow
        cards={[
          {
            label: "Active projects",
            value: String(summary.activeProjects),
            testId: "progress-active",
          },
          {
            label: "On track",
            value: String(summary.onTrack),
            testId: "progress-on-track",
          },
          {
            label: "Needs attention",
            value: String(summary.needsAttention),
            testId: "progress-needs-attention",
          },
          {
            label: "Updates today",
            value: String(summary.updatesToday),
            testId: "progress-updates-today",
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
          id="progress-date-range"
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ul className="space-y-3">
          {filteredProjects.map((project) => {
            const projectUpdates = updates.filter(
              (u) => u.project === project.id
            )
            const displayProgress = effectiveProgressPct(
              project,
              projectUpdates
            )
            const recent = projectUpdates.slice(0, 3)
            return (
              <li
                key={project.id}
                className="rounded-lg border border-border bg-card p-4"
                data-testid={`progress-row-${project.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">{project.name}</h2>
                      <Badge variant="secondary">{project.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {projectLocationDisplayParts(project)
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {displayProgress}%
                  </span>
                </div>
                <Progress className="mt-2" value={displayProgress} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatProjectDateRange(
                    project.start_date,
                    project.target_end_date
                  )}{" "}
                  · Contractor: {project.contractor ?? "—"} · Updated{" "}
                  {lastUpdatedLabel(projectUpdates)}
                </p>
                {recent.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {recent.map((update) => (
                      <li key={update.id}>
                        {update.from_pct}% → {update.to_pct}%
                        {update.notes ? ` — ${update.notes}` : ""} ·{" "}
                        {formatDisplayDateTime(
                          update.updated_at ?? update.created
                        )}
                      </li>
                    ))}
                    {projectUpdates.length > 3 ? (
                      <li>
                        <button
                          type="button"
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={() => openDetails(project.id)}
                        >
                          View all {projectUpdates.length} updates
                        </button>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openDetails(project.id)}
                  >
                    View details
                  </Button>
                  {canUpdateProjectProgress(project, canCreateProgressUpdates) ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openUpdateModal(project)}
                    >
                      Update progress
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>

        <aside
          className="hidden rounded-lg border border-border bg-card p-4 lg:block"
          data-testid="progress-detail-panel"
        >
          <h2 className="font-semibold">Project detail</h2>
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
                {formatProjectDateRange(
                  selected.start_date,
                  selected.target_end_date
                )}{" "}
                · {selected.status}
              </p>
              <div>
                <p className="mb-1">
                  Overall progress: {selectedProgress}%
                </p>
                <Progress value={selectedProgress} />
              </div>
              <div>
                <h3 className="font-medium">Progress update history</h3>
                <ul className="mt-2 space-y-2">
                  {selectedUpdates.map((update) => (
                    <li
                      key={update.id}
                      className="border-b border-border pb-2 last:border-b-0"
                    >
                      <p>
                        {update.from_pct}% → {update.to_pct}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDisplayDateTime(
                          update.updated_at ?? update.created
                        )}{" "}
                        · {displayUserRef(update.updated_by, userDisplay, "Unknown user")}
                      </p>
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
              </div>
              {canUpdateProjectProgress(selected, canCreateProgressUpdates) ? (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => openUpdateModal(selected)}
                >
                  Update progress
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Select a project to view history.
            </p>
          )}
        </aside>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Project detail</DialogTitle>
            <DialogDescription>
              Review the selected project&apos;s progress, notes, and site photos.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
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
                {formatProjectDateRange(
                  selected.start_date,
                  selected.target_end_date
                )}{" "}
                · {selected.status}
              </p>
              <div>
                <p className="mb-1">Overall progress: {selectedProgress}%</p>
                <Progress value={selectedProgress} />
              </div>
              <div>
                <h3 className="font-medium">Progress update history</h3>
                <ul className="mt-2 space-y-2">
                  {selectedUpdates.map((update) => (
                    <li
                      key={update.id}
                      className="border-b border-border pb-2 last:border-b-0"
                    >
                      <p>
                        {update.from_pct}% → {update.to_pct}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDisplayDateTime(
                          update.updated_at ?? update.created
                        )}{" "}
                        · {displayUserRef(update.updated_by, userDisplay, "Unknown user")}
                      </p>
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
              </div>
              {canUpdateProjectProgress(selected, canCreateProgressUpdates) ? (
                <DialogFooter>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      setDetailOpen(false)
                      openUpdateModal(selected)
                    }}
                  >
                    Update progress
                  </Button>
                </DialogFooter>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setPhotos([])
            setCompletionDocs(emptyCompletionDocuments())
            setExistingSitePhotoNames([])
            setExistingCompletionDocNames(undefined)
            setReleasedAmount(emptyReleasedAmountFormValue())
            setReleasedAmountErrors({})
            setFieldErrors({})
            setFormError(null)
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault()
              void saveUpdate()
            }}
          >
            <DialogHeader>
              <DialogTitle>Update progress</DialogTitle>
              <DialogDescription>
                Add a site update, progress percentage, and required completion
                documents.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              {formError ? (
                <p className="text-destructive text-sm" role="alert">
                  {formError}
                </p>
              ) : null}
              <p className="text-sm">
                {dialogProject?.name} — current {dialogProgress}%
              </p>
              <Field>
                <FieldLabel>Progress: {toPct}%</FieldLabel>
                <Slider
                  value={[toPct]}
                  onValueChange={(value) => setToPct(value[0] ?? 0)}
                  max={100}
                  step={1}
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  {SLIDER_MARKERS.map((marker) => (
                    <span key={marker}>{marker}%</span>
                  ))}
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="update-notes">Update notes</FieldLabel>
                <Textarea
                  id="update-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
              <DocumentUploadField
                id="site-photo"
                label="Site photo (required)"
                accept={IMAGE_UPLOAD_ACCEPT}
                helperText="JPG, PNG, WebP"
                dropZoneText="Click to upload or drag an image here"
                multiple
                files={photos}
                onChange={setPhotos}
                existingNames={existingSitePhotoNames}
                error={fieldErrors.sitePhoto}
              />
              {toPct >= 100 ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm font-medium">Completion documents</p>
                  <p className="text-xs text-muted-foreground">
                    Required before saving a 100% progress update.
                  </p>
                  {REQUIRED_COMPLETION_DOCUMENTS.map((doc) => {
                    return (
                      <DocumentUploadField
                        key={doc.field}
                        id={`completion-${doc.field}`}
                        label={doc.label}
                        multiple={doc.multiple}
                        files={completionDocs[doc.field]}
                        onChange={(files) =>
                          setCompletionDocument(doc.field, files)
                        }
                        existingNames={
                          existingCompletionDocNames?.[doc.field] ?? []
                        }
                        error={fieldErrors[doc.field]}
                      />
                    )
                  })}
                </div>
              ) : null}
              {requiresReleasedAmount ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm font-medium">Released amount (required)</p>
                  <p className="text-xs text-muted-foreground">
                    Record the funds released for this progress update.
                  </p>
                  <ReleasedAmountFields
                    value={releasedAmount}
                    onChange={setReleasedAmount}
                    fieldErrors={releasedAmountErrors}
                    idPrefix="progress-released"
                    sectionTestId="progress-released-amount-fields"
                    loadOptions={dialogOpen}
                  />
                </div>
              ) : null}
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
