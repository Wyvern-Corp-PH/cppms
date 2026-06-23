import type { ProjectRecord } from "../types"

export type ProjectFilters = {
  query?: string
  category?: ProjectRecord["category"]
  status?: ProjectRecord["status"]
  lgu_level?: ProjectRecord["lgu_level"]
  municipality?: string
  barangay?: string
  dateFrom?: string
  dateTo?: string
}

function parseDate(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null
  }
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

export function projectInDateRange(
  project: Pick<ProjectRecord, "start_date" | "target_end_date">,
  dateFrom?: string,
  dateTo?: string
): boolean {
  const fromMs = parseDate(dateFrom)
  const toMs = parseDate(dateTo)
  const startMs = parseDate(project.start_date)
  const endMs = parseDate(project.target_end_date)

  if (fromMs !== null) {
    const anchor = endMs ?? startMs
    if (anchor === null || anchor < fromMs) {
      return false
    }
  }

  if (toMs !== null) {
    const anchor = startMs ?? endMs
    if (anchor === null || anchor > toMs) {
      return false
    }
  }

  return true
}

export function filterProjects(
  projects: readonly ProjectRecord[],
  filters: ProjectFilters
): ProjectRecord[] {
  const query = filters.query?.trim().toLowerCase()
  const municipality = normalizeLocationSlug(filters.municipality)
  const barangay = normalizeLocationSlug(filters.barangay)

  return projects.filter((project) => {
    if (filters.category && project.category !== filters.category) {
      return false
    }

    if (filters.status && project.status !== filters.status) {
      return false
    }

    if (filters.lgu_level && project.lgu_level !== filters.lgu_level) {
      return false
    }

    if (
      municipality &&
      normalizeLocationSlug(project.municipality) !== municipality
    ) {
      return false
    }

    if (barangay && normalizeLocationSlug(project.barangay) !== barangay) {
      return false
    }

    if (!projectInDateRange(project, filters.dateFrom, filters.dateTo)) {
      return false
    }

    if (!query) {
      return true
    }

    const haystack = [
      project.name,
      project.description,
      project.municipality,
      project.barangay,
      project.location,
      project.contractor,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return haystack.includes(query)
  })
}

export function normalizeLocationSlug(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function formatProjectLocationContext(
  project: Pick<ProjectRecord, "municipality" | "barangay" | "location">
): string | undefined {
  if (project.municipality) {
    return project.barangay
      ? `${project.municipality} / ${project.barangay}`
      : project.municipality
  }
  return project.location
}

export function projectLocationDisplayParts(
  project: Pick<ProjectRecord, "municipality" | "barangay" | "location">
): string[] {
  const context = formatProjectLocationContext(project)
  const location =
    project.location &&
    normalizeLocationSlug(project.location) !== normalizeLocationSlug(context)
      ? project.location
      : undefined

  return [context, location].filter((value): value is string => Boolean(value))
}

export function isApprovalEligible(
  project: Pick<ProjectRecord, "status">
): boolean {
  return project.status === "Completed"
}

import { formatDisplayDate } from "./format-display-date"

export function formatProjectDateRange(
  start?: string,
  end?: string
): string {
  if (!start && !end) {
    return "—"
  }
  if (start && end) {
    return `${formatDisplayDate(start)} → ${formatDisplayDate(end)}`
  }
  return formatDisplayDate(start ?? end)
}
