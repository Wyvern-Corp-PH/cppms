import { describe, expect, it } from "vitest"

import { buildParticipationStats, TOTAL_BARANGAYS } from "./barangay-participation"

describe("buildParticipationStats (V218, V219)", () => {
  it("counts unique barangays with projects against the 820 baseline", () => {
    const stats = buildParticipationStats([
      {
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        status: "Ongoing",
        budget_year: 2024,
      },
      {
        municipality: "Lasam",
        barangay: "Centro",
        status: "Planning",
        budget_year: 2022,
      },
    ])

    expect(TOTAL_BARANGAYS).toBe(820)
    expect(stats.participation.totalBarangays).toBe(820)
    expect(stats.participation.withProjects).toBe(2)
    expect(stats.participation.withoutProjects).toBe(818)
    expect(stats.participation.rate).toBe(0)
    expect(stats.fundingYearBreakdown).toEqual([
      {
        year: 2024,
        count: 1,
        copy: "1 barangay still utilizing 2024 funds",
      },
      {
        year: 2022,
        count: 1,
        copy: "1 barangay still utilizing 2022 funds",
      },
    ])
  })
})
