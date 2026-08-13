import { describe, expect, it } from "vitest"

import {
  buildInactiveLocations,
  TOTAL_BARANGAYS,
  TOTAL_MUNICIPALITIES,
} from "./inactive-locations"

describe("buildInactiveLocations (V221)", () => {
  it("lists municipalities and barangays without any projects", () => {
    const result = buildInactiveLocations([
      {
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ])

    expect(TOTAL_MUNICIPALITIES).toBe(29)
    expect(TOTAL_BARANGAYS).toBe(820)
    expect(result.inactiveMunicipalities).not.toContain("Tuguegarao City")
    expect(result.inactiveMunicipalities).toContain("Abulug")
    expect(
      result.inactiveBarangays.some(
        (row) =>
          row.municipality === "Tuguegarao City" &&
          row.barangay === "Centro 02"
      )
    ).toBe(true)
    expect(
      result.inactiveBarangays.some(
        (row) =>
          row.municipality === "Tuguegarao City" &&
          row.barangay === "Centro 01 (Bagumbayan)"
      )
    ).toBe(false)
  })

  it("keeps the parent municipality active when only Barangay X is empty", () => {
    const siblingProjects = [
      {
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    const withEmptyBarangayX = buildInactiveLocations(siblingProjects)

    expect(withEmptyBarangayX.inactiveMunicipalities).not.toContain(
      "Tuguegarao City"
    )
    expect(
      withEmptyBarangayX.inactiveBarangays.some(
        (row) =>
          row.municipality === "Tuguegarao City" && row.barangay === "Centro 02"
      )
    ).toBe(true)
    expect(
      withEmptyBarangayX.inactiveBarangays.some(
        (row) =>
          row.municipality === "Tuguegarao City" &&
          row.barangay === "Centro 01 (Bagumbayan)"
      )
    ).toBe(false)

    const emptyBarangayCount = withEmptyBarangayX.inactiveBarangays.filter(
      (row) => row.municipality === "Tuguegarao City"
    ).length
    expect(emptyBarangayCount).toBeGreaterThan(1)
  })

  it("treats a municipality with a municipal-level project as with projects", () => {
    const result = buildInactiveLocations([{ municipality: "Abulug" }])

    expect(result.inactiveMunicipalities).not.toContain("Abulug")
    expect(
      result.inactiveBarangays.some((row) => row.municipality === "Abulug")
    ).toBe(true)
  })
})
