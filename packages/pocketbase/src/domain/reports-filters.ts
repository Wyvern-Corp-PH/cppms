import type { ProjectRecord } from "../types"

import { filterProjects, type ProjectFilters } from "./project-filters"

export type ReportFilters = {
  status?: ProjectRecord["status"] | "all"
  category?: ProjectRecord["category"] | "all"
  municipality?: string | "all"
  barangay?: string | "all"
  dateFrom?: string
  dateTo?: string
}

export function toProjectFilters(filters: ReportFilters): ProjectFilters {
  return {
    status: filters.status && filters.status !== "all" ? filters.status : undefined,
    category:
      filters.category && filters.category !== "all" ? filters.category : undefined,
    municipality:
      filters.municipality && filters.municipality !== "all"
        ? filters.municipality
        : undefined,
    barangay:
      filters.barangay && filters.barangay !== "all"
        ? filters.barangay
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
