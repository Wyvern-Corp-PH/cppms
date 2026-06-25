import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  failLocations: false,
  projectStatusOptions: [] as Array<Record<string, unknown>>,
  projectCategoryOptions: [] as Array<Record<string, unknown>>,
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
      category: "Infrastructure",
      status: "Ongoing",
      budget_year: 2026,
      municipality: "Lasam",
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
  ] as Array<Record<string, unknown>>,
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "locations") {
          if (store.failLocations) throw new Error("locations unavailable")
          return store.locations
        }
        if (name === "project_status_options") return store.projectStatusOptions
        if (name === "project_category_options") return store.projectCategoryOptions
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
    store.projectStatusOptions = [
      {
        id: "status1",
        collectionId: "project_status_options",
        collectionName: "project_status_options",
        name: "PB Public Status",
        active: true,
        sort_order: 1,
      },
    ]
    store.projectCategoryOptions = [
      {
        id: "category1",
        collectionId: "project_category_options",
        collectionName: "project_category_options",
        name: "PB Public Category",
        active: true,
        sort_order: 1,
      },
    ]
    store.projects = [
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
        lgu_level: "Barangay",
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
        municipality: "Lasam",
        location: "Municipal hall grounds",
        lgu_level: "Municipality",
      },
    ]
    store.locations = [
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
    ]
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

  it("filters projects by municipality and barangay from PocketBase locations", async () => {
    const user = userEvent.setup()
    render(<PublicProjects />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
      expect(screen.getByText("Water System")).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/filter by location/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/filter by municipality/i))
    await user.click(
      await screen.findByRole("option", {
        name: "Tuguegarao City",
      })
    )
    await user.click(screen.getByLabelText(/filter by barangay/i))
    await user.click(
      await screen.findByRole("option", {
        name: "Centro 01 (Bagumbayan)",
      })
    )

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Water System")).not.toBeInTheDocument()
    })
  })

  it("loads public status and category filter options from PocketBase fields", async () => {
    const user = userEvent.setup()
    render(<PublicProjects />)

    await user.click(await screen.findByLabelText(/filter by status/i))
    expect(
      await screen.findByRole("option", { name: "PB Public Status" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Planning" })
    ).not.toBeInTheDocument()

    await user.keyboard("{Escape}")
    await user.click(screen.getByLabelText(/filter by category/i))
    expect(
      await screen.findByRole("option", { name: "PB Public Category" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Infrastructure" })
    ).not.toBeInTheDocument()
  })

  it("matches admin location display by omitting LGU level", async () => {
    render(<PublicProjects />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/filter by lgu level/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(
        /Tuguegarao City \/ Centro 01 \(Bagumbayan\) · East bank approach · Infrastructure/
      )
    ).toBeInTheDocument()
    expect(screen.queryByText(/Barangay/)).not.toBeInTheDocument()
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
