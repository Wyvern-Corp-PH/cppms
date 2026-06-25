import { describe, expect, it } from "vitest"

import { countApprovedProjects, filterReportProjects } from "./reports-filters"
import type { ProjectRecord } from "../types"

const projects: ProjectRecord[] = [
  {
    id: "1",
    collectionId: "p",
    collectionName: "projects",
    created: "",
    updated: "",
    name: "Bridge",
    category: "Infrastructure",
    status: "Completed",
    budget_year: 2026,
    approval_status: "approved",
    lgu_level: "Municipality",
    municipality: "Tuguegarao City",
    barangay: "Centro 01",
    start_date: "2026-01-01",
    target_end_date: "2026-12-31",
  },
  {
    id: "2",
    collectionId: "p",
    collectionName: "projects",
    created: "",
    updated: "",
    name: "School",
    category: "Education",
    status: "Planning",
    budget_year: 2026,
    lgu_level: "Barangay",
    municipality: "Lasam",
    barangay: "Centro",
  },
]

describe("filterReportProjects (V89)", () => {
  it("applies all sentinel filters", () => {
    expect(filterReportProjects(projects, { status: "all", category: "all" })).toHaveLength(2)
    expect(filterReportProjects(projects, { status: "Completed" })).toHaveLength(1)
    expect(
      filterReportProjects(projects, {
        municipality: "Lasam",
        barangay: "Centro",
      })
    ).toHaveLength(1)
  })
})

describe("countApprovedProjects (V95)", () => {
  it("counts approved status and approval_status", () => {
    expect(countApprovedProjects(projects)).toBe(1)
  })
})
