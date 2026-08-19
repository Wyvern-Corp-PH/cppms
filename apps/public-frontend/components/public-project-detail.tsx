"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import { formatDisplayDateTime } from "@workspace/pocketbase/domain/format-display-date"
import { formatProjectLocationContext } from "@workspace/pocketbase/domain/project-filters"
import { recordFileUrl } from "@workspace/pocketbase/files"
import {
  parseRecord,
  parseRecordList,
  progressUpdateRecordSchema,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
  ProgressUpdateRecord,
  ProjectRecord,
} from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import { Progress } from "@workspace/ui/components/progress"

import { getPocketBase } from "@/lib/pocketbase"

function fileNames(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }
  return value ? [value] : []
}

function compareByRecencyDesc(
  a: Pick<ProgressUpdateRecord, "created" | "updated_at" | "id">,
  b: Pick<ProgressUpdateRecord, "created" | "updated_at" | "id">
) {
  const key = (row: typeof a) => row.created ?? row.updated_at ?? row.id
  return key(b).localeCompare(key(a))
}

export function PublicProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectRecord | null>(null)
  const [updates, setUpdates] = useState<ProgressUpdateRecord[]>([])
  const [progressError, setProgressError] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading")

  useEffect(() => {
    let cancelled = false
    const pb = getPocketBase()

    void (async () => {
      try {
        const row = await pb.collection("projects").getOne(projectId)
        if (cancelled) return
        const parsed = parseRecord(projectRecordSchema, row)
        if (!parsed) {
          setStatus("missing")
          return
        }

        setProject(parsed)
        try {
          const updateRows = await pb
            .collection("progress_updates")
            .getFullList({
              filter: `project = "${projectId}"`,
              sort: "-created",
            })
          if (cancelled) return
          setUpdates(
            parseRecordList(progressUpdateRecordSchema, updateRows).sort(
              compareByRecencyDesc
            )
          )
          setProgressError(null)
        } catch {
          if (cancelled) return
          setUpdates([])
          setProgressError("Unable to load progress update history.")
        }
        setStatus("ready")
      } catch {
        if (!cancelled) setStatus("missing")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [projectId])

  if (status === "loading") {
    return (
      <div
        className="bg-muted h-40 animate-pulse rounded-md"
        data-testid="project-detail-skeleton"
      />
    )
  }

  if (status === "missing" || !project) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="text-muted-foreground text-sm">
          This project does not exist or the link is invalid.
        </p>
        <BackToProjects />
      </div>
    )
  }

  const progressPct = project.progress_pct ?? 0
  const photos = project.project_photos ?? []
  const municipalityBarangay = formatProjectLocationContext(project) ?? "—"

  return (
    <article className="space-y-6">
      <BackToProjects />
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <Badge variant="secondary">{project.status}</Badge>
      </div>
      <p className="text-sm leading-relaxed">{project.description || "—"}</p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <DetailField label="Category" value={project.category} />
        <DetailField label="Project Status" value={project.status} />
        <DetailField label="Municipality/Barangay" value={municipalityBarangay} />
        <DetailField label="Location" value={project.location || "—"} />
        <DetailField label="Contractor" value={project.contractor || "—"} />
        <DetailField
          label="Period of Implementation"
          value={project.period_of_implementation || "—"}
        />
        <DetailField label="Budget Year" value={String(project.budget_year)} />
        <DetailField label="Bid Price" value={formatPhp(project.bid_price ?? 0)} />
      </dl>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Fund Source</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailField
            label="Funding Year"
            value={
              project.funding_year != null ? String(project.funding_year) : "—"
            }
          />
          <DetailField label="Main Account" value={project.fund_source || "—"} />
          <DetailField label="Sub Account" value={project.sub_account || "—"} />
        </dl>
      </section>
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">Progress</p>
        <Progress value={progressPct} aria-label={`${progressPct}% progress`} />
        <p className="text-sm tabular-nums">{progressPct}%</p>
      </div>
      {project.category === "Scholarship" && project.number_of_students ? (
        <p className="text-sm">Students covered: {project.number_of_students}</p>
      ) : null}
      <DocumentDownloads
        label="MOA"
        record={project}
        names={fileNames(project.moa_file)}
      />
      <DocumentDownloads
        label="Resolution"
        record={project}
        names={fileNames(project.resolution_file)}
      />
      <DocumentDownloads
        label="Supporting project documents"
        record={project}
        names={fileNames(project.supporting_docs)}
      />
      {photos.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {photos.map((filename, index) => {
            const src = recordFileUrl(project, filename)
            if (!src) return null
            return (
              <img
                key={filename}
                src={src}
                alt={photos.length > 1 ? `Project photo ${index + 1}` : "Project photo"}
                className="rounded-md border border-border object-cover"
                loading="lazy"
              />
            )
          })}
        </div>
      ) : null}
      {progressError ? (
        <section className="space-y-2" data-testid="progress-history-error">
          <h2 className="text-base font-semibold">Progress Update History</h2>
          <p className="text-destructive text-sm" role="alert">
            {progressError}
          </p>
        </section>
      ) : updates.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Progress Update History</h2>
          <ul className="space-y-3">
            {updates.map((update) => {
              const photosOnUpdate = fileNames(update.site_photo)
              return (
                <li
                  key={update.id}
                  className="border-b border-border pb-3 last:border-b-0"
                >
                  <p className="text-sm">
                    {update.from_pct}% → {update.to_pct}%
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDisplayDateTime(update.updated_at ?? update.created)}
                  </p>
                  {update.notes ? (
                    <p className="text-xs">{update.notes}</p>
                  ) : null}
                  {photosOnUpdate.length > 0 ? (
                    <div
                      className={[
                        "mt-1 grid gap-2",
                        photosOnUpdate.length > 1 ? "sm:grid-cols-2" : "",
                      ].join(" ")}
                    >
                      {photosOnUpdate.map((filename, index) => {
                        const src = recordFileUrl(update, filename)
                        if (!src) return null
                        return (
                          <img
                            key={filename}
                            src={src}
                            alt={
                              photosOnUpdate.length > 1
                                ? `Site photo ${index + 1}`
                                : "Site photo"
                            }
                            className="h-24 w-full max-w-xs rounded-md border border-border object-cover"
                            loading="lazy"
                          />
                        )
                      })}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </article>
  )
}

function BackToProjects() {
  return (
    <Link
      href="/projects"
      className="text-primary text-sm font-medium hover:underline underline-offset-4"
    >
      Back to projects
    </Link>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

function DocumentDownloads({
  label,
  record,
  names,
}: {
  label: string
  record: Pick<ProjectRecord, "id" | "collectionId">
  names: string[]
}) {
  if (names.length === 0) return null
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <ul className="space-y-1">
        {names.map((filename) => {
          const href = recordFileUrl(record, filename)
          if (!href) return null
          return (
            <li key={filename}>
              <a
                href={href}
                className="text-primary text-sm font-medium hover:underline underline-offset-4"
                download={filename}
              >
                {filename}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
