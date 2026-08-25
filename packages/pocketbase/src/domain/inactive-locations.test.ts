import { describe, expect, it } from "vitest"

import { CAGAYAN_LOCATION_TREE } from "../seed/cagayan-locations"
import {
  buildInactiveLocations,
  TOTAL_BARANGAYS,
  TOTAL_MUNICIPALITIES,
} from "./inactive-locations"

const santaPraxedes = CAGAYAN_LOCATION_TREE.find(
  (municipality) => municipality.name === "Santa Praxedes"
)

if (!santaPraxedes) {
  throw new Error("Santa Praxedes missing from Cagayan location tree")
}

describe("buildInactiveLocations", () => {
  it("should keep a municipality inactive when only some barangays have projects", () => {
    const result = buildInactiveLocations([
      {
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ])

    expect(TOTAL_MUNICIPALITIES).toBe(29)
    expect(TOTAL_BARANGAYS).toBe(820)
    expect(result.inactiveMunicipalities).toContain("Tuguegarao City")
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

  it("should omit a covered barangay even when the parent municipality stays inactive", () => {
    const result = buildInactiveLocations([
      {
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ])

    expect(result.inactiveMunicipalities).toContain("Tuguegarao City")
    expect(
      result.inactiveBarangays.some(
        (row) =>
          row.municipality === "Tuguegarao City" &&
          row.barangay === "Centro 01 (Bagumbayan)"
      )
    ).toBe(false)

    const emptyBarangayCount = result.inactiveBarangays.filter(
      (row) => row.municipality === "Tuguegarao City"
    ).length
    expect(emptyBarangayCount).toBeGreaterThan(1)
  })

  it("should keep a municipality inactive when it only has a municipality-level project", () => {
    const result = buildInactiveLocations([{ municipality: "Abulug" }])

    expect(result.inactiveMunicipalities).toContain("Abulug")
    expect(
      result.inactiveBarangays.some((row) => row.municipality === "Abulug")
    ).toBe(true)
  })

  it("should omit a municipality when every barangay has at least one project", () => {
    const projects = santaPraxedes.barangays.map((barangay) => ({
      municipality: "Santa Praxedes",
      barangay,
    }))
    const result = buildInactiveLocations(projects)

    expect(result.inactiveMunicipalities).not.toContain("Santa Praxedes")
    expect(
      result.inactiveBarangays.some(
        (row) => row.municipality === "Santa Praxedes"
      )
    ).toBe(false)
    expect(result.inactiveMunicipalities).toContain("Abulug")
  })

  it("should omit a municipality with zero barangays in the location tree", () => {
    const result = buildInactiveLocations([], [
      { name: "Ghost LGU", barangays: [] },
    ])

    expect(result.inactiveMunicipalities).not.toContain("Ghost LGU")
    expect(result.inactiveBarangays).toEqual([])
  })
})
