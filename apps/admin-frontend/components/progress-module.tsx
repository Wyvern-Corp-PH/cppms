"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { canAccess } from "@workspace/pocketbase/domain/access-control"
import { formatDisplayDateTime } from "@workspace/pocketbase/domain/format-display-date"
import { formatProjectDateRange } from "@workspace/pocketbase/domain/project-filters"
import { buildProgressSummaryCards } from "@workspace/pocketbase/domain/progress-summary"
import {
  REQUIRED_COMPLETION_DOCUMENTS,
  type CompletionDocumentField,
  fieldErrorsFromZod,
  firstZodError,
  parseRecordList,
  progressUpdateFormSchema,
  progressUpdateRecordSchema,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
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
import { Label } from "@workspace/ui/components/label"
import { Progress } from "@workspace/ui/components/progress"
import { Slider } from "@workspace/ui/components/slider"
import { Textarea } from "@workspace/ui/components/textarea"

import {
  DocumentUploadField,
  IMAGE_UPLOAD_ACCEPT,
} from "@/components/document-upload-field"
import { PageHeaderBand } from "@/components/page-header-band"
import { SitePhoto } from "@/components/site-photo"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

const SLIDER_MARKERS = [0, 25, 50, 75, 100]

type CompletionDocumentState = {
  certification_completion: File | null
  certificate_acceptance: File | null
  proof_payment_barangay: File | null
  acknowledgment_completion: File | null
  audit_documents: File[]
  verification_documents: File[]
  liquidation_documents: File[]
}

const emptyCompletionDocuments = (): CompletionDocumentState => ({
  certification_completion: null,
  certificate_acceptance: null,
  proof_payment_barangay: null,
  acknowledgment_completion: null,
  audit_documents: [],
  verification_documents: [],
  liquidation_documents: [],
})

function lastUpdatedLabel(updates: ProgressUpdateRecord[]): string {
  const latest = updates[0]
  if (!latest) return "—"
  return formatDisplayDateTime(latest.updated_at ?? latest.created)
}

function effectiveProgressPct(
  project: ProjectRecord,
  updates: ProgressUpdateRecord[]
): number {
  return updates[0]?.to_pct ?? project.progress_pct ?? 0
}

export function ProgressModule() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [updates, setUpdates] = useState<ProgressUpdateRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const actor = getPocketBase().authStore?.record
  const canCreateProgressUpdates = actor
    ? canAccess(actor, "progress_updates.create")
    : true

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()
      const [projectRows, updateRows] = await Promise.all([
        pb.collection("projects").getFullList(),
        pb.collection("progress_updates").getFullList(),
      ])
      const parsedUpdates = parseRecordList(
        progressUpdateRecordSchema,
        updateRows
      )
      parsedUpdates.sort((a, b) => {
        const aKey = a.created ?? a.updated_at ?? a.id
        const bKey = b.created ?? b.updated_at ?? b.id
        return bKey.localeCompare(aKey)
      })
      setProjects(parseRecordList(projectRecordSchema, projectRows))
      setUpdates(parsedUpdates)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const { live } = usePocketBaseRealtime(
    ["projects", "progress_updates"],
    () => {
      void load()
    }
  )

  const summary = buildProgressSummaryCards(projects, updates)
  const selected = projects.find((project) => project.id === selectedId) ?? null
  const selectedUpdates = useMemo(
    () =>
      selected
        ? updates.filter((update) => update.project === selected.id)
        : [],
    [selected, updates]
  )

  function openUpdateModal(project: ProjectRecord) {
    if (!canCreateProgressUpdates) {
      return
    }
    const projectUpdates = updates.filter(
      (update) => update.project === project.id
    )
    setDialogProjectId(project.id)
    setToPct(effectiveProgressPct(project, projectUpdates))
    setNotes("")
    setPhotos([])
    setCompletionDocs(emptyCompletionDocuments())
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
      [field]: Array.isArray(current[field]) ? files : (files[0] ?? null),
    }))
  }

  function appendCompletionDocuments(formData: FormData) {
    for (const doc of REQUIRED_COMPLETION_DOCUMENTS) {
      const value = completionDocs[doc.field]
      if (Array.isArray(value)) {
        for (const file of value) {
          formData.append(doc.field, file)
        }
      } else if (value) {
        formData.append(doc.field, value)
      }
    }
  }

  async function saveUpdate() {
    if (!canCreateProgressUpdates) {
      return
    }

    setFormError(null)
    const parsed = progressUpdateFormSchema.safeParse({
      projectId: dialogProjectId,
      toPct,
      notes,
      sitePhoto: photos,
      completionDocs,
    })

    if (!parsed.success) {
      const nextFieldErrors = fieldErrorsFromZod(parsed.error)
      const nextFormError = firstZodError(parsed.error)

      setFieldErrors(nextFieldErrors)
      setFormError(
        Object.values(nextFieldErrors).includes(nextFormError)
          ? null
          : nextFormError
      )
      return
    }

    setFieldErrors({})
    setSaving(true)
    const pb = getPocketBase()
    try {
      const project = projects.find((row) => row.id === parsed.data.projectId)
      if (!project) {
        setFormError("Project is required.")
        return
      }
      const projectUpdates = updates.filter(
        (update) => update.project === project.id
      )

      const formData = new FormData()
      formData.append("project", parsed.data.projectId)
      formData.append(
        "from_pct",
        String(effectiveProgressPct(project, projectUpdates))
      )
      formData.append("to_pct", String(parsed.data.toPct))
      if (parsed.data.notes) formData.append("notes", parsed.data.notes)
      for (const file of parsed.data.sitePhoto) {
        formData.append("site_photo", file)
      }
      if (parsed.data.toPct >= 100) {
        appendCompletionDocuments(formData)
      }

      await pb.collection("progress_updates").create(formData)
      try {
        await pb.collection("projects").update(parsed.data.projectId, {
          progress_pct: parsed.data.toPct,
          status: parsed.data.toPct >= 100 ? "Completed" : project.status,
        })
      } catch (error) {
        console.warn(
          "Progress update saved, but project summary did not update.",
          error
        )
      }

      setDialogOpen(false)
      setPhotos([])
      setCompletionDocs(emptyCompletionDocuments())
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

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ul className="space-y-3">
          {projects.map((project) => {
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
                      {[project.location, project.lgu_level]
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
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openDetails(project.id)}
                  >
                    View details
                  </Button>
                  {canCreateProgressUpdates ? (
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
                {[selected.location, selected.category, selected.lgu_level]
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
                        · {update.updated_by ?? "Admin"}
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
              {canCreateProgressUpdates ? (
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
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
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
                {[selected.location, selected.category, selected.lgu_level]
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
                        · {update.updated_by ?? "Admin"}
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
              {canCreateProgressUpdates ? (
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
            setFieldErrors({})
            setFormError(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
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
            <div className="grid gap-4">
              {formError ? (
                <p className="text-destructive text-sm" role="alert">
                  {formError}
                </p>
              ) : null}
              <p className="text-sm">
                {dialogProject?.name} — current {dialogProgress}%
              </p>
              <div>
                <Label>Progress: {toPct}%</Label>
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
              </div>
              <div>
                <Label htmlFor="update-notes">Update notes</Label>
                <Textarea
                  id="update-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <DocumentUploadField
                id="site-photo"
                label="Site photo (required)"
                accept={IMAGE_UPLOAD_ACCEPT}
                helperText="JPG, PNG, WebP"
                dropZoneText="Click to upload or drag an image here"
                multiple
                files={photos}
                onChange={setPhotos}
                error={fieldErrors.sitePhoto}
              />
              {toPct >= 100 ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm font-medium">Completion documents</p>
                  <p className="text-xs text-muted-foreground">
                    Required before saving a 100% progress update.
                  </p>
                  {REQUIRED_COMPLETION_DOCUMENTS.map((doc) => {
                    const value = completionDocs[doc.field]
                    const files = Array.isArray(value)
                      ? value
                      : value
                        ? [value]
                        : []
                    return (
                      <DocumentUploadField
                        key={doc.field}
                        id={`completion-${doc.field}`}
                        label={doc.label}
                        multiple={doc.multiple}
                        files={files}
                        onChange={(files) =>
                          setCompletionDocument(doc.field, files)
                        }
                        error={fieldErrors[doc.field]}
                      />
                    )
                  })}
                </div>
              ) : null}
            </div>
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
