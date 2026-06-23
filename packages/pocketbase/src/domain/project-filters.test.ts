import { describe, expect, it } from "vitest"

import {
  filterProjects,
  formatProjectDateRange,
  isApprovalEligible,
  normalizeLocationSlug,
  projectInDateRange,
} from "./project-filters"
import type { ProjectRecord } from "../types"

const sampleProjects: ProjectRecord[] = [
  {
    id: "1",
    collectionId: "p",
    collectionName: "projects",
    created: "",
    updated: "",
    name: "Bridge Repair",
    category: "Infrastructure",
    status: "Ongoing",
    budget_year: 2026,
    location: "Tuguegarao",
    lgu_level: "Municipality",
    start_date: "2026-01-01",
    target_end_date: "2026-12-31",
  },
  {
    id: "2",
    collectionId: "p",
    collectionName: "projects",
    created: "",
    updated: "",
    name: "School Supplies",
    category: "Education",
    status: "Completed",
    budget_year: 2026,
    lgu_level: "Barangay",
    start_date: "2025-06-01",
    target_end_date: "2025-12-01",
  },
]

describe("filterProjects (V73)", () => {
  it("filters by query, category, and status", () => {
    expect(
      filterProjects(sampleProjects, {
        query: "bridge",
        category: "Infrastructure",
        status: "Ongoing",
      })
    ).toHaveLength(1)

    expect(filterProjects(sampleProjects, { category: "Education" })).toHaveLength(1)
  })

  it("filters by lgu_level and date range", () => {
    expect(filterProjects(sampleProjects, { lgu_level: "Municipality" })).toHaveLength(1)
    expect(
      filterProjects(sampleProjects, { dateFrom: "2026-01-01", dateTo: "2026-12-31" })
    ).toHaveLength(1)
  })

  it("filters by normalized location slug", () => {
    expect(normalizeLocationSlug("Tuguegarao City")).toBe("tuguegarao-city")
    expect(
      filterProjects(sampleProjects, { locationSlug: "tuguegarao" })
    ).toHaveLength(1)
    expect(
      filterProjects(sampleProjects, { locationSlug: "lasam" })
    ).toHaveLength(0)
  })

  it("filters by normalized barangay hierarchy slug", () => {
    const barangayProject = {
      ...sampleProjects[0]!,
      location: "Tuguegarao City / Centro 01 (Bagumbayan)",
    }

    expect(
      filterProjects([barangayProject], {
        locationSlug: "tuguegarao-city/centro-01-bagumbayan",
      })
    ).toHaveLength(1)
  })
})

describe("projectInDateRange", () => {
  it("excludes projects outside range", () => {
    expect(
      projectInDateRange(sampleProjects[1]!, "2026-01-01", "2026-12-31")
    ).toBe(false)
  })
})

describe("formatProjectDateRange", () => {
  it("formats start and end", () => {
    expect(formatProjectDateRange("2026-01-01", "2026-12-31")).toBe(
      "Jan 1, 2026 → Dec 31, 2026"
    )
  })
})

describe("isApprovalEligible (V4)", () => {
  it("only allows Completed projects", () => {
    expect(isApprovalEligible(sampleProjects[1]!)).toBe(true)
    expect(isApprovalEligible(sampleProjects[0]!)).toBe(false)
  })
})
