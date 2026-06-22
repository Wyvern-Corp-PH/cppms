import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  failLocations: false,
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
      location: "Tuguegarao City",
    },
    {
      id: "2",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Water System",
      category: "Infrastructure",
      status: "Ongoing",
      budget_year: 2026,
      location: "Lasam",
    },
  ],
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
    },
    {
      id: "l2",
      collectionId: "l",
      collectionName: "locations",
      created: "",
      updated: "",
      name: "Lasam",
      slug: "lasam",
      active: true,
    },
  ],
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "locations") {
          if (store.failLocations) throw new Error("locations unavailable")
          return store.locations
        }
        return store.projects
      }),
    }),
  }),
}))

import { PublicProjects } from "./public-projects"

describe("PublicProjects (V2, J3)", () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => false),
    })
    Object.defineProperty(window.HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(
      window.HTMLElement.prototype,
      "releasePointerCapture",
      {
        configurable: true,
        value: vi.fn(),
      }
    )
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    })
  })

  beforeEach(() => {
    store.failLocations = false
  })

  it("allows browse and filter without create/edit/delete affordances", async () => {
    render(<PublicProjects />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/search projects/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /new project/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
  })

  it("filters projects by city/municipality location from PocketBase locations", async () => {
    const user = userEvent.setup()
    render(<PublicProjects />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
      expect(screen.getByText("Water System")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText(/filter by city\/municipality/i))
    await user.click(await screen.findByRole("option", { name: "Lasam" }))

    await waitFor(() => {
      expect(screen.queryByText("Bridge")).not.toBeInTheDocument()
      expect(screen.getByText("Water System")).toBeInTheDocument()
    })
  })

  it("still renders projects when the locations collection is unavailable", async () => {
    store.failLocations = true

    render(<PublicProjects />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
      expect(screen.getByText("Water System")).toBeInTheDocument()
    })
  })
})
