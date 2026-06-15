"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { formatDisplayDateTime } from "@workspace/pocketbase/domain/format-display-date"
import { formatProjectDateRange } from "@workspace/pocketbase/domain/project-filters"
import { buildProgressSummaryCards } from "@workspace/pocketbase/domain/progress-summary"
import {
  parseRecordList,
  progressUpdateRecordSchema,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type { ProgressUpdateRecord, ProjectRecord } from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import { Progress } from "@workspace/ui/components/progress"

import { PageHeaderBand } from "@/components/page-header-band"
import { SitePhoto } from "@/components/site-photo"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

export function PublicProgress() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [updates, setUpdates] = useState<ProgressUpdateRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
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
    setLoading(false)
  }, [])

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [load])

  const { live } = usePocketBaseRealtime(["projects", "progress_updates"], () => {
    void load()
  })

  const summary = buildProgressSummaryCards(projects, updates)
  const selected = projects.find((project) => project.id === selectedId) ?? null
  const selectedUpdates = useMemo(
    () => (selected ? updates.filter((u) => u.project === selected.id) : []),
    [selected, updates]
  )

  if (loading) {
    return <div className="bg-muted h-32 animate-pulse rounded-md" data-testid="progress-skeleton" />
  }

  return (
    <div className="space-y-6">
      <PageHeaderBand
        title="Project progress"
        context="Read-only milestone completion across provincial programs."
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
              <li key={project.id} className="rounded-[var(--radius-lg)] border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{project.name}</span>
                  <Badge variant="secondary">{project.status}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {[project.location, project.lgu_level].filter(Boolean).join(" · ")}
                </p>
                <Progress className="mt-2" value={project.progress_pct ?? 0} />
                <p className="text-muted-foreground mt-2 text-xs">
                  {formatProjectDateRange(project.start_date, project.target_end_date)} ·{" "}
                  {project.contractor ?? "—"} · Updated{" "}
                  {formatDisplayDateTime(projectUpdates[0]?.updated_at ?? projectUpdates[0]?.created)}
                </p>
                {recent.length > 0 ? (
                  <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
                    {recent.map((update) => (
                      <li key={update.id}>
                        {update.from_pct}% → {update.to_pct}%
                        {update.notes ? ` — ${update.notes}` : ""}
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
                <button
                  type="button"
                  className="text-primary mt-2 text-sm underline-offset-2 hover:underline"
                  onClick={() => setSelectedId(project.id)}
                >
                  View details
                </button>
              </li>
            )
          })}
        </ul>

        <aside className="rounded-[var(--radius-lg)] border border-border p-4" data-testid="progress-detail-panel">
          <h2 className="font-semibold">Progress history</h2>
          {selected ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-medium">{selected.name}</p>
              <p className="text-muted-foreground">
                {[selected.location, selected.category, selected.lgu_level].filter(Boolean).join(" · ")}
              </p>
              <Progress value={selected.progress_pct ?? 0} />
              <ul className="mt-2 space-y-2">
                {selectedUpdates.map((update) => (
                  <li key={update.id} className="border-b pb-2 text-xs">
                    {update.from_pct}% → {update.to_pct}% · {formatDisplayDateTime(update.updated_at ?? update.created)}
                    {update.notes ? <p>{update.notes}</p> : null}
                    <SitePhoto
                      update={update}
                      alt={`${selected.name} progress update`}
                      className="mt-1 h-24 w-full max-w-xs"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-sm">Select a project to view history.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
