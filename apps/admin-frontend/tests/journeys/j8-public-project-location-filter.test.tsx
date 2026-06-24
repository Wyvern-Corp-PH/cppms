import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

const store = {
  projects: [
    {
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Bridge",
      category: "Infrastructure",
      status: "Ongoing",
      budget_year: 2026,
      municipality: "Tuguegarao City",
      barangay: "Centro 01 (Bagumbayan)",
      location: "East bank approach",
    },
    {
      id: "2",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Water System",
      category: "Health",
      status: "Planning",
      budget_year: 2026,
      municipality: "Lasam",
      barangay: "Centro",
      location: "Municipal hall grounds",
    },
  ] as Array<Record<string, unknown>>,
  locations: [
    {
      id: "l1",
      collectionId: "l",
      collectionName: "locations",
      created: "",
      updated: "",
      name: "Tuguegarao City",
      slug: "tuguegarao-city",
      active: true,
      level: "Municipality",
      municipality_name: "Tuguegarao City",
    },
    {
      id: "l2",
      collectionId: "l",
      collectionName: "locations",
      created: "",
      updated: "",
      name: "Tuguegarao City / Centro 01 (Bagumbayan)",
      slug: "tuguegarao-city/centro-01-bagumbayan",
      active: true,
      level: "Barangay",
      municipality_name: "Tuguegarao City",
      barangay_name: "Centro 01 (Bagumbayan)",
    },
    {
      id: "l3",
      collectionId: "l",
      collectionName: "locations",
      created: "",
      updated: "",
      name: "Lasam",
      slug: "lasam",
      active: true,
      level: "Municipality",
      municipality_name: "Lasam",
    },
  ] as Array<Record<string, unknown>>,
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () =>
        name === "locations" ? store.locations : store.projects
      ),
    }),
  }),
}))

import { PublicProjects } from "../../../public-frontend/components/public-projects"

describe("J8 public project location filter journey", () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => false),
    })
    Object.defineProperty(window.HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(window.HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    })
  })

  it("combines municipality and barangay filters with public project browsing", async () => {
    const user = userEvent.setup()
    render(<PublicProjects />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
      expect(screen.getByText("Water System")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText(/filter by municipality/i))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByLabelText(/filter by barangay/i))
    await user.click(
      await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" })
    )

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Water System")).not.toBeInTheDocument()
    })
  })
})
