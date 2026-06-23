import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  authRecord: {
    id: "sa1",
    role: "Super Admin",
    account_status: "Active",
  } as Record<string, unknown> | null,
}

const createMock = vi.fn(async (payload: Record<string, unknown>) => {
  const record = {
    id: String(store.projects.length + 1),
    collectionId: "p",
    collectionName: "projects",
    created: "",
    updated: "",
    progress_pct: 0,
    ...payload,
  }
  store.projects.push(record)
  return record
})
const updateMock = vi.fn()

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: store.authRecord,
    },
    collection: (name: string) => ({
      getFullList: vi.fn(async () =>
        name === "projects"
          ? store.projects
          : name === "locations"
            ? store.locations
            : []
      ),
      create: createMock,
      update: updateMock,
      delete: vi.fn(),
    }),
  }),
}))

import { ProjectsModule } from "./projects-module"

describe("ProjectsModule (J4)", () => {
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
    store.projects = []
    store.locations = [
      {
        id: "loc1",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Tuguegarao City",
        slug: "tuguegarao-city",
        level: "Municipality",
        municipality_name: "Tuguegarao City",
        municipality_slug: "tuguegarao-city",
        active: true,
        sort_order: 1,
      },
      {
        id: "loc2",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Lasam",
        slug: "lasam",
        level: "Municipality",
        municipality_name: "Lasam",
        municipality_slug: "lasam",
        active: true,
        sort_order: 2,
      },
      {
        id: "loc3",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Inactive Town",
        slug: "inactive-town",
        level: "Municipality",
        municipality_name: "Inactive Town",
        municipality_slug: "inactive-town",
        active: false,
        sort_order: 3,
      },
      {
        id: "loc4",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Tuguegarao City / Centro 01 (Bagumbayan)",
        slug: "tuguegarao-city/centro-01-bagumbayan",
        level: "Barangay",
        municipality_name: "Tuguegarao City",
        municipality_slug: "tuguegarao-city",
        barangay_name: "Centro 01 (Bagumbayan)",
        active: true,
        sort_order: 4,
      },
      {
        id: "loc5",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Lasam / Centro",
        slug: "lasam/centro",
        level: "Barangay",
        municipality_name: "Lasam",
        municipality_slug: "lasam",
        barangay_name: "Centro",
        active: true,
        sort_order: 5,
      },
    ]
    store.authRecord = {
      id: "sa1",
      role: "Super Admin",
      account_status: "Active",
    }
    createMock.mockClear()
    updateMock.mockClear()
  })

  it("opens the create project modal with save affordance", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /^save$/i })
      ).toBeInTheDocument()
    })
  })

  it("uses Resolution as the project agreement document label", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))

    await waitFor(() => {
      expect(screen.getByText("Resolution")).toBeInTheDocument()
      expect(
        screen.queryByText("Province/Barangay Agreement")
      ).not.toBeInTheDocument()
    })
  })

  it("shows From and To labels on date range filters", async () => {
    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.getByLabelText(/^from:$/i)).toHaveAttribute(
        "id",
        "filter-date-from"
      )
      expect(screen.getByLabelText(/^to:$/i)).toHaveAttribute(
        "id",
        "filter-date-to"
      )
      expect(screen.getByLabelText(/^filter from date$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^filter to date$/i)).toBeInTheDocument()
    })
  })

  it("filters admin projects by active municipalities", async () => {
    const user = userEvent.setup()
    store.projects.push(
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Planning",
        budget_year: 2026,
        municipality: "Tuguegarao City",
        location: "East bank approach",
        progress_pct: 0,
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Planning",
        budget_year: 2026,
        municipality: "Lasam",
        location: "Municipal hall grounds",
        progress_pct: 0,
      }
    )

    render(<ProjectsModule />)

    expect(screen.queryByLabelText(/filter by location/i)).not.toBeInTheDocument()
    await user.click(await screen.findByLabelText(/filter by municipality/i))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
      expect(screen.queryByRole("option", { name: "Inactive Town" })).not.toBeInTheDocument()
    })
  })

  it("uses active municipality and barangay choices in the project dialog", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /^municipality$/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("combobox", { name: /^barangay$/i })
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole("combobox", { name: /^municipality$/i }))
    expect(
      await screen.findByRole("option", { name: "Tuguegarao City" })
    ).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Lasam" })).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Inactive Town" })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByRole("combobox", { name: /^barangay$/i }))
    expect(
      await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Centro" })
    ).not.toBeInTheDocument()
  })

  it("saves municipality, barangay, and location as separate project fields", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))
    await user.type(screen.getByLabelText(/project name/i), "City Bridge")
    await user.click(screen.getByRole("combobox", { name: /^municipality$/i }))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByRole("combobox", { name: /^barangay$/i }))
    await user.click(
      await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" })
    )
    await user.type(screen.getByLabelText(/^location$/i), "East bank approach")
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          municipality: "Tuguegarao City",
          barangay: "Centro 01 (Bagumbayan)",
          location: "East bank approach",
        })
      )
    })
  })

  it("keeps long municipality and barangay lists scrollable in the dialog", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))
    await user.click(
      await screen.findByRole("combobox", { name: /^municipality$/i })
    )

    const list = document.querySelector('[data-slot="command-list"]')
    expect(list).toHaveClass("overscroll-contain")
    expect(list?.className).toContain("max-h-[min(")
    expect(list).toHaveClass("overflow-y-auto")
  })

  it("derives municipality choices from hierarchy-only barangay rows", async () => {
    const user = userEvent.setup()
    store.locations = [
      {
        id: "loc4",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Tuguegarao City / Centro 01 (Bagumbayan)",
        slug: "tuguegarao-city/centro-01-bagumbayan",
        level: "",
        active: true,
        sort_order: 4,
      },
    ]

    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))
    await user.click(
      await screen.findByRole("combobox", { name: /^municipality$/i })
    )
    await user.click(
      await screen.findByRole("option", { name: "Tuguegarao City" })
    )
    await user.click(screen.getByRole("combobox", { name: /^barangay$/i }))

    expect(
      await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" })
    ).toBeInTheDocument()
  })

  it("searches project dialog municipalities and barangays before selecting", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))
    await user.click(
      await screen.findByRole("combobox", { name: /^municipality$/i })
    )

    const search = await screen.findByPlaceholderText(/search municipalities/i)
    await user.type(search, "Las")

    expect(
      screen.queryByRole("option", { name: "Tuguegarao City" })
    ).not.toBeInTheDocument()
    await user.click(await screen.findByRole("option", { name: "Lasam" }))

    expect(
      screen.getByRole("combobox", { name: /^municipality$/i })
    ).toHaveTextContent("Lasam")
    await user.click(screen.getByRole("combobox", { name: /^barangay$/i }))
    await user.type(await screen.findByPlaceholderText(/search barangays/i), "Cen")
    await user.click(await screen.findByRole("option", { name: "Centro" }))
    expect(
      screen.getByRole("combobox", { name: /^barangay$/i })
    ).toHaveTextContent("Centro")
  })

  it("omits LGU level controls from projects UI", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.queryByLabelText(/filter by lgu level/i)).not.toBeInTheDocument()
    })

    await user.click(await screen.findByTestId("create-project"))
    expect(screen.queryByText(/^LGU level$/i)).not.toBeInTheDocument()
  })

  it("persists a created project to the list", async () => {
    store.projects.push({
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "New Bridge",
      category: "Infrastructure",
      status: "Planning",
      budget_year: 2026,
      progress_pct: 0,
    })

    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.getByText("New Bridge")).toBeInTheDocument()
    })
  })

  it("requires number of students when editing a Scholarship project", async () => {
    const user = userEvent.setup()
    store.projects.push({
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Scholarship Batch",
      category: "Scholarship",
      status: "Planning",
      budget_year: 2026,
      progress_pct: 0,
    })

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", {
        name: /actions for scholarship batch/i,
      })
    )
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))

    expect(screen.getByLabelText(/number of students/i)).toHaveAttribute(
      "type",
      "number"
    )

    await user.click(screen.getByRole("button", { name: /^save$/i }))

    expect(
      await screen.findByText(/number of students is required/i)
    ).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("hides project mutation controls for users without project policy", async () => {
    store.authRecord = {
      id: "u1",
      role: "User",
      account_status: "Active",
    }

    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.queryByTestId("create-project")).not.toBeInTheDocument()
    })
    expect(createMock).not.toHaveBeenCalled()
  })
})
