import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const xlsxState = {
  rows: [] as Array<Record<string, unknown>>,
  workbooks: [] as Array<Array<Record<string, unknown>>>,
}

const store = {
  projects: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  projectStatusOptions: [] as Array<Record<string, unknown>>,
  projectCategoryOptions: [] as Array<Record<string, unknown>>,
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
            : name === "project_status_options"
              ? store.projectStatusOptions
              : name === "project_category_options"
                ? store.projectCategoryOptions
            : []
      ),
      create: createMock,
      update: updateMock,
      delete: vi.fn(),
    }),
  }),
}))

vi.mock("xlsx", () => ({
  read: vi.fn(() => ({
    SheetNames: ["Projects"],
    Sheets: { Projects: {} },
  })),
  utils: {
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    sheet_to_json: vi.fn(() => xlsxState.workbooks.shift() ?? xlsxState.rows),
  },
  writeFile: vi.fn(),
}))

import * as XLSX from "xlsx"
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
    store.projectStatusOptions = [
      {
        id: "status1",
        collectionId: "project_status_options",
        collectionName: "project_status_options",
        name: "PB Custom Status",
        active: true,
        sort_order: 1,
      },
    ]
    store.projectCategoryOptions = [
      {
        id: "category1",
        collectionId: "project_category_options",
        collectionName: "project_category_options",
        name: "PB Custom Category",
        active: true,
        sort_order: 1,
      },
    ]
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
    vi.mocked(XLSX.read).mockClear()
    vi.mocked(XLSX.utils.aoa_to_sheet).mockClear()
    vi.mocked(XLSX.utils.book_new).mockClear()
    vi.mocked(XLSX.utils.book_append_sheet).mockClear()
    vi.mocked(XLSX.utils.sheet_to_json).mockClear()
    vi.mocked(XLSX.writeFile).mockClear()
    xlsxState.rows = []
    xlsxState.workbooks = []
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

  it("loads project status and category dropdown options from PocketBase fields", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByLabelText(/filter by status/i))
    expect(
      await screen.findByRole("option", { name: "PB Custom Status" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Planning" })
    ).not.toBeInTheDocument()

    await user.keyboard("{Escape}")
    await user.click(screen.getByLabelText(/filter by category/i))
    expect(
      await screen.findByRole("option", { name: "PB Custom Category" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Infrastructure" })
    ).not.toBeInTheDocument()
  })

  it("opens an Excel import dialog with the expected file types", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByRole("button", { name: /^import$/i }))

    const input = await screen.findByLabelText(/excel file/i)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(input).toHaveAttribute("type", "file")
    expect(input).toHaveAttribute("accept", ".xlsx,.xls")
    expect(input).toHaveAttribute("multiple")
    expect(
      screen.getByRole("button", { name: /download template/i })
    ).toBeInTheDocument()
  })

  it("downloads an Excel template with exact project import headers", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByRole("button", { name: /^import$/i }))
    await user.click(
      await screen.findByRole("button", { name: /download template/i })
    )

    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      [
        "Project Name",
        "Description",
        "Location",
        "Contractor",
        "Total Budget",
      ],
    ])
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "cppms-project-import-template.xlsx"
    )
  })

  it("imports valid Excel rows and reports row-level errors", async () => {
    const user = userEvent.setup()
    xlsxState.rows = [
      {
        "Project Name": "Road Widening",
        Description: "Phase 1",
        Location: "Tuguegarao City",
        Contractor: "BuildCo",
        "Total Budget": "1500000",
      },
      {
        "Project Name": "",
        Description: "No name",
        Location: "Lasam",
        Contractor: "Contractor",
        "Total Budget": "250000",
      },
      {
        "Project Name": "School Repair",
        Description: "Roofing",
        Location: "Lasam",
        Contractor: "FixCo",
        "Total Budget": "500000",
      },
    ]
    render(<ProjectsModule />)

    await user.click(await screen.findByRole("button", { name: /^import$/i }))
    await user.upload(
      await screen.findByLabelText(/excel file/i),
      new File(["workbook"], "projects.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    )
    await user.click(await screen.findByRole("button", { name: /^import projects$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(2)
    })
    expect(createMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: "Road Widening",
        description: "Phase 1",
        location: "Tuguegarao City",
        contractor: "BuildCo",
        total_budget: 1500000,
        category: "Infrastructure",
        status: "Planning",
        progress_pct: 0,
      })
    )
    expect(
      await screen.findByText("2 of 3 projects imported successfully. 1 row had errors.")
    ).toBeInTheDocument()
    expect(screen.getByText(/Row 3: Project Name is required/i)).toBeInTheDocument()
  })

  it("imports multiple Excel files and reports filename row errors", async () => {
    const user = userEvent.setup()
    xlsxState.workbooks = [
      [
        {
          "Project Name": "Road Widening",
          Description: "Phase 1",
          Location: "Tuguegarao City",
          Contractor: "BuildCo",
          "Total Budget": "1500000",
        },
      ],
      [
        {
          "Project Name": "",
          Description: "No name",
          Location: "Lasam",
          Contractor: "Contractor",
          "Total Budget": "250000",
        },
        {
          "Project Name": "School Repair",
          Description: "Roofing",
          Location: "Lasam",
          Contractor: "FixCo",
          "Total Budget": "500000",
        },
      ],
    ]
    render(<ProjectsModule />)

    await user.click(await screen.findByRole("button", { name: /^import$/i }))
    await user.upload(await screen.findByLabelText(/excel file/i), [
      new File(["workbook-1"], "projects-a.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      new File(["workbook-2"], "projects-b.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ])
    await user.click(await screen.findByRole("button", { name: /^import projects$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(2)
    })
    expect(XLSX.read).toHaveBeenCalledTimes(2)
    expect(
      await screen.findByText("2 of 3 projects imported successfully. 1 row had errors.")
    ).toBeInTheDocument()
    expect(
      screen.getByText(/projects-b\.xlsx Row 2: Project Name is required/i)
    ).toBeInTheDocument()
  })

  it("does not derive edit municipality or barangay from imported free-text location", async () => {
    const user = userEvent.setup()
    store.projects.push({
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Imported Road",
      description: "Imported from Excel",
      category: "Infrastructure",
      status: "Planning",
      budget_year: 2026,
      total_budget: 1500000,
      location: "Tuguegarao City / Centro 01 (Bagumbayan)",
      progress_pct: 0,
    })

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", { name: /actions for imported road/i })
    )
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))

    expect(screen.getByLabelText(/^location$/i)).toHaveValue(
      "Tuguegarao City / Centro 01 (Bagumbayan)"
    )
    expect(
      screen.getByRole("combobox", { name: /^municipality$/i })
    ).not.toHaveTextContent("Tuguegarao City")
    expect(screen.getByRole("combobox", { name: /^barangay$/i })).not.toHaveTextContent(
      "Centro 01 (Bagumbayan)"
    )
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

  it("uses the shared date range picker instead of standalone date inputs", async () => {
    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /pick date range/i })).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/^filter from date$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^filter to date$/i)).not.toBeInTheDocument()
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

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveClass("w-[calc(100vw-2rem)]")
    expect(dialog.className).toContain("max-h-[calc(100dvh-2rem)]")
    expect(dialog).toHaveClass("overflow-y-auto")
    expect(dialog).toHaveClass("sm:max-w-lg")

    await user.click(
      await screen.findByRole("combobox", { name: /^municipality$/i })
    )

    const list = document.querySelector('[data-slot="command-list"]')
    expect(list).toHaveClass("overscroll-contain")
    expect(list?.className).toContain("max-h-[min(")
    expect(list).toHaveClass("overflow-y-auto")
  })

  it("keeps status change dialog responsive at zoomed viewports", async () => {
    const user = userEvent.setup()
    store.projects.push({
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Bridge",
      category: "Infrastructure",
      status: "Planning",
      budget_year: 2026,
      progress_pct: 0,
    })

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", { name: /actions for bridge/i })
    )
    await user.click(await screen.findByRole("menuitem", { name: /change status/i }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveClass("w-[calc(100vw-2rem)]")
    expect(dialog.className).toContain("max-h-[calc(100dvh-2rem)]")
    expect(dialog).toHaveClass("overflow-y-auto")
    expect(dialog).toHaveClass("sm:max-w-xs")
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
      role: "Municipality",
      account_status: "Active",
    }

    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.queryByTestId("create-project")).not.toBeInTheDocument()
    })
    expect(createMock).not.toHaveBeenCalled()
  })

  it("hides edit, status, and delete controls from scoped local admins", async () => {
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        description: "Road bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        location: "Tuguegarao City, Cagayan",
        lgu_level: "Barangay",
        contractor: "Build Co",
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
        budget_year: 2026,
        total_budget: 200_000,
        progress_pct: 25,
      },
    ]
    store.authRecord = {
      id: "b1",
      role: "Barangay",
      account_status: "Active",
      municipality: "Tuguegarao City",
      barangay: "Centro 01 (Bagumbayan)",
    }

    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })
    expect(
      screen.queryByRole("button", { name: /actions for bridge/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Edit")).not.toBeInTheDocument()
    expect(screen.queryByText("Change status")).not.toBeInTheDocument()
    expect(screen.queryByText("Delete")).not.toBeInTheDocument()
  })
})
