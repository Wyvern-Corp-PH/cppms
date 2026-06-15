import type { ProjectRecord } from "../types"

import { filterProjects, type ProjectFilters } from "./project-filters"

export type ReportFilters = {
  status?: ProjectRecord["status"] | "all"
  category?: ProjectRecord["category"] | "all"
  lgu_level?: ProjectRecord["lgu_level"] | "all"
  dateFrom?: string
  dateTo?: string
}

export function toProjectFilters(filters: ReportFilters): ProjectFilters {
  return {
    status: filters.status && filters.status !== "all" ? filters.status : undefined,
    category:
      filters.category && filters.category !== "all" ? filters.category : undefined,
    lgu_level:
      filters.lgu_level && filters.lgu_level !== "all"
        ? filters.lgu_level
        : undefined,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  }
}

export function filterReportProjects(
  projects: readonly ProjectRecord[],
  filters: ReportFilters
): ProjectRecord[] {
  return filterProjects(projects, toProjectFilters(filters))
}

export function countApprovedProjects(
  projects: readonly Pick<ProjectRecord, "status" | "approval_status">[]
): number {
  return projects.filter(
    (project) =>
      project.status === "Approved" || project.approval_status === "approved"
  ).length
}
