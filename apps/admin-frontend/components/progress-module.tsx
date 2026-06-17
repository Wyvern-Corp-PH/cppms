"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { formatDisplayDateTime } from "@workspace/pocketbase/domain/format-display-date"
import { formatProjectDateRange } from "@workspace/pocketbase/domain/project-filters"
import { buildProgressSummaryCards } from "@workspace/pocketbase/domain/progress-summary"
import {
  fieldErrorsFromZod,
  parseRecordList,
  progressUpdateFormSchema,
  progressUpdateRecordSchema,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type { ProgressUpdateRecord, ProjectRecord } from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import { Progress } from "@workspace/ui/components/progress"
import { Slider } from "@workspace/ui/components/slider"
import { Textarea } from "@workspace/ui/components/textarea"

import { DocumentUploadField, IMAGE_UPLOAD_ACCEPT } from "@/components/document-upload-field"
import { PageHeaderBand } from "@/components/page-header-band"
import { SitePhoto } from "@/components/site-photo"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

const SLIDER_MARKERS = [0, 25, 50, 75, 100]

function lastUpdatedLabel(updates: ProgressUpdateRecord[]): string {
  const latest = updates[0]
  if (!latest) return "—"
  return formatDisplayDateTime(latest.updated_at ?? latest.created)
}

export function ProgressModule() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [updates, setUpdates] = useState<ProgressUpdateRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogProjectId, setDialogProjectId] = useState("")
  const [toPct, setToPct] = useState(50)
  const [notes, setNotes] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()
      const [projectRows, updateRows] = await Promise.all([
        pb.collection("projects").getFullList(),
        pb.collection("progress_updates").getFullList(),
      ])
      const parsedUpdates = parseRecordList(progressUpdateRecordSchema, updateRows)
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

  const { live } = usePocketBaseRealtime(["projects", "progress_updates"], () => {
    void load()
  })

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
    setDialogProjectId(project.id)
    setToPct(project.progress_pct ?? 0)
    setNotes("")
    setPhoto(null)
    setFieldErrors({})
    setDialogOpen(true)
  }

  async function saveUpdate() {
    const parsed = progressUpdateFormSchema.safeParse({
      projectId: dialogProjectId,
      toPct,
      notes,
      sitePhoto: photo,
    })

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    setFieldErrors({})
    const pb = getPocketBase()
    const project = projects.find((row) => row.id === parsed.data.projectId)
    if (!project) return

    const formData = new FormData()
    formData.append("project", parsed.data.projectId)
    formData.append("from_pct", String(project.progress_pct ?? 0))
    formData.append("to_pct", String(parsed.data.toPct))
    if (parsed.data.notes) formData.append("notes", parsed.data.notes)
    formData.append("site_photo", parsed.data.sitePhoto)

    await pb.collection("progress_updates").create(formData)
    await pb.collection("projects").update(parsed.data.projectId, {
      progress_pct: parsed.data.toPct,
      status: parsed.data.toPct >= 100 ? "Completed" : project.status,
    })

    setDialogOpen(false)
    setPhoto(null)
    await load()
  }

  const dialogProject = projects.find((p) => p.id === dialogProjectId)

  if (loading) {
    return <div className="bg-muted h-32 animate-pulse rounded-md" data-testid="progress-skeleton" />
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
          { label: "Active projects", value: String(summary.activeProjects), testId: "progress-active" },
          { label: "On track", value: String(summary.onTrack), testId: "progress-on-track" },
          { label: "Needs attention", value: String(summary.needsAttention), testId: "progress-needs-attention" },
          { label: "Updates today", value: String(summary.updatesToday), testId: "progress-updates-today" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ul className="space-y-3">
          {projects.map((project) => {
            const projectUpdates = updates.filter((u) => u.project === project.id)
            const recent = projectUpdates.slice(0, 3)
            return (
              <li
                key={project.id}
                className="rounded-[var(--radius-lg)] border border-border bg-card p-4"
                data-testid={`progress-row-${project.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">{project.name}</h2>
                      <Badge variant="secondary">{project.status}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {[project.location, project.lgu_level].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{project.progress_pct ?? 0}%</span>
                </div>
                <Progress className="mt-2" value={project.progress_pct ?? 0} />
                <p className="text-muted-foreground mt-2 text-xs">
                  {formatProjectDateRange(project.start_date, project.target_end_date)} · Contractor:{" "}
                  {project.contractor ?? "—"} · Updated {lastUpdatedLabel(projectUpdates)}
                </p>
                {recent.length > 0 ? (
                  <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
                    {recent.map((update) => (
                      <li key={update.id}>
                        {update.from_pct}% → {update.to_pct}%
                        {update.notes ? ` — ${update.notes}` : ""} · {formatDisplayDateTime(update.updated_at ?? update.created)}
                      </li>
                    ))}
                    {projectUpdates.length > 3 ? (
                      <li>
                        <button
                          type="button"
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={() => setSelectedId(project.id)}
                        >
                          View all {projectUpdates.length} updates
                        </button>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(project.id)}>
                    View details
                  </Button>
                  <Button type="button" size="sm" onClick={() => openUpdateModal(project)}>
                    Update progress
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="rounded-[var(--radius-lg)] border border-border bg-card p-4" data-testid="progress-detail-panel">
          <h2 className="font-semibold">Project detail</h2>
          {selected ? (
            <div className="mt-3 space-y-3 text-sm">
              <p className="font-medium">{selected.name}</p>
              <p className="text-muted-foreground">
                {[selected.location, selected.category, selected.lgu_level].filter(Boolean).join(" · ")}
              </p>
              <p>{formatProjectDateRange(selected.start_date, selected.target_end_date)} · {selected.status}</p>
              <div>
                <p className="mb-1">Overall progress: {selected.progress_pct ?? 0}%</p>
                <Progress value={selected.progress_pct ?? 0} />
              </div>
              <div>
                <h3 className="font-medium">Progress update history</h3>
                <ul className="mt-2 space-y-2">
                  {selectedUpdates.map((update) => (
                    <li key={update.id} className="border-b border-border pb-2 last:border-b-0">
                      <p>
                        {update.from_pct}% → {update.to_pct}%
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDisplayDateTime(update.updated_at ?? update.created)} · {update.updated_by ?? "Admin"}
                      </p>
                      {update.notes ? <p className="text-xs">{update.notes}</p> : null}
                      <SitePhoto
                        update={update}
                        alt={`${selected.name} progress update`}
                        className="mt-1 h-24 w-full max-w-xs"
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <Button type="button" className="w-full" onClick={() => openUpdateModal(selected)}>
                Update progress
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-sm">Select a project to view history.</p>
          )}
        </aside>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Update progress</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <p className="text-sm">
              {dialogProject?.name} — current {dialogProject?.progress_pct ?? 0}%
            </p>
            <div>
              <Label>Progress: {toPct}%</Label>
              <Slider value={[toPct]} onValueChange={(value) => setToPct(value[0] ?? 0)} max={100} step={1} />
              <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                {SLIDER_MARKERS.map((marker) => (
                  <span key={marker}>{marker}%</span>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="update-notes">Update notes</Label>
              <Textarea id="update-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DocumentUploadField
              id="site-photo"
              label="Site photo (required)"
              accept={IMAGE_UPLOAD_ACCEPT}
              helperText="JPG, PNG, WebP"
              dropZoneText="Click to upload or drag an image here"
              files={photo ? [photo] : []}
              onChange={(files) => setPhoto(files[0] ?? null)}
              error={fieldErrors.sitePhoto}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveUpdate()}>
              Save update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
