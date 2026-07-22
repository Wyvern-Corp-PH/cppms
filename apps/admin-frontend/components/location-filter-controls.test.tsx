import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { LocationRecord } from "@workspace/pocketbase/types"

import { LocationFilterControls } from "./location-filter-controls"

const locations: LocationRecord[] = [
  {
    id: "loc1",
    collectionId: "locations",
    collectionName: "locations",
    name: "Tuguegarao City",
    slug: "tuguegarao-city",
    level: "Municipality",
    municipality_name: "Tuguegarao City",
    active: true,
  },
  {
    id: "loc2",
    collectionId: "locations",
    collectionName: "locations",
    name: "Tuguegarao City / Centro 01 (Bagumbayan)",
    slug: "tuguegarao-city/centro-01-bagumbayan",
    level: "Barangay",
    municipality_name: "Tuguegarao City",
    barangay_name: "Centro 01 (Bagumbayan)",
    active: true,
  },
]

describe("LocationFilterControls", () => {
  it("should keep municipality and barangay selects compact without visible Mun/Barangay FieldLabels", () => {
    render(
      <LocationFilterControls
        locations={locations}
        value={{ municipality: "", barangay: "" }}
        onChange={vi.fn()}
      />
    )

    expect(
      screen.queryByText("Municipality", { selector: "[data-slot=field-label]" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("Barangay", { selector: "[data-slot=field-label]" })
    ).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="field"]')).toHaveLength(0)

    const municipality = screen.getByRole("combobox", {
      name: /filter by municipality/i,
    })
    const barangay = screen.getByRole("combobox", {
      name: /filter by barangay/i,
    })
    expect(municipality).toBeInTheDocument()
    expect(barangay).toBeInTheDocument()
    expect(municipality).toHaveAttribute("aria-label", "Filter by municipality")
    expect(barangay).toHaveAttribute("aria-label", "Filter by barangay")
  })
})
