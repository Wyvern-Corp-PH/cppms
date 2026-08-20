import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const xlsxState = {
  rows: [] as Array<Record<string, unknown>>,
  workbooks: [] as Array<Array<Record<string, unknown>>>,
}

const store = {
  projects: [] as Array<Record<string, unknown>>,
  progressUpdates: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  projectStatusOptions: [] as Array<Record<string, unknown>>,
  projectCategoryOptions: [] as Array<Record<string, unknown>>,
  denied: new Set<string>(),
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
      getFullList: vi.fn(async () => {
        if (store.denied.has(name)) {
          throw Object.assign(new Error("The request failed with 403"), {
            status: 403,
          })
        }
        return name === "projects"
          ? store.projects
          : name === "progress_updates"
            ? store.progressUpdates
            : name === "locations"
              ? store.locations
              : name === "project_status_options"
                ? store.projectStatusOptions
                : name === "project_category_options"
                  ? store.projectCategoryOptions
                  : []
      }),
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

async function fillOwnedFundSource(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText(/^funding year$/i))
  await user.click(
    await screen.findByRole("option", { name: String(new Date().getFullYear()) })
  )
  await user.click(screen.getByLabelText(/^main account$/i))
  await user.click(
    await screen.findByRole("option", { name: "Special Education Fund" })
  )
}

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
    store.progressUpdates = []
    store.denied.clear()
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

  it("shows the LGU/DPWH start-within-15-days note under Period of Implementation", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))

    const period = await screen.findByLabelText(/period of implementation/i)
    expect(period).toHaveAttribute("id", "project-period")
    expect(period.tagName).toBe("INPUT")
    expect(period).not.toHaveAttribute("type", "date")
    expect(
      screen.getByText(
        "Per standard LGU/DPWH guidelines, the project must officially start within 15 calendar days from the approval/issuance of the MOA."
      )
    ).toBeInTheDocument()
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
    expect(screen.getByText(/required headers:/i)).toHaveTextContent(
      "Required headers: Project Name, Description, Location."
    )
  })

  it("downloads an Excel template with exact project import headers", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByRole("button", { name: /^import$/i }))
    await user.click(
      await screen.findByRole("button", { name: /download template/i })
    )

    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([
      ["Project Name", "Description", "Location"],
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
        "Bid Price": "1500000",
      },
      {
        "Project Name": "",
        Description: "No name",
        Location: "Lasam",
        Contractor: "Contractor",
        "Bid Price": "250000",
      },
      {
        "Project Name": "School Repair",
        Description: "Roofing",
        Location: "Lasam",
        Contractor: "FixCo",
        "Bid Price": "500000",
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
        bid_price: 1500000,
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

  it("imports Excel rows without Contractor or Bid Price columns", async () => {
    const user = userEvent.setup()
    xlsxState.rows = [
      {
        "Project Name": "Road Widening",
        Description: "Phase 1",
        Location: "Tuguegarao City",
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
    await user.click(screen.getByRole("button", { name: /^import projects$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
    })
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Road Widening",
        description: "Phase 1",
        location: "Tuguegarao City",
      })
    )
    const payload = createMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload).not.toHaveProperty("contractor")
    expect(payload).not.toHaveProperty("bid_price")
    expect(payload).not.toHaveProperty("fund_source")
    expect(payload).not.toHaveProperty("funding_year")
    expect(
      screen.queryByText(/Bid Price is required/i)
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/main account is required/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/funding year is required/i)).not.toBeInTheDocument()
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
          "Bid Price": "1500000",
        },
      ],
      [
        {
          "Project Name": "",
          Description: "No name",
          Location: "Lasam",
          Contractor: "Contractor",
          "Bid Price": "250000",
        },
        {
          "Project Name": "School Repair",
          Description: "Roofing",
          Location: "Lasam",
          Contractor: "FixCo",
          "Bid Price": "500000",
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
      bid_price: 1500000,
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
    await user.type(screen.getByLabelText(/^description$/i), "Span repair")
    await user.click(screen.getByRole("combobox", { name: /^municipality$/i }))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByRole("combobox", { name: /^barangay$/i }))
    await user.click(
      await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" })
    )
    await user.type(screen.getByLabelText(/^location$/i), "East bank approach")
    await fillOwnedFundSource(user)
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
    expect(list?.className).not.toContain("no-scrollbar")
  })

  it.each(["Super Admin", "Province"] as const)(
    "hides Change status in the card menu for %s",
    async (role) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: `${role}-status-menu`,
        role,
        account_status: "Active",
      }
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
      expect(
        screen.queryByRole("menuitem", { name: /change status/i })
      ).not.toBeInTheDocument()
      expect(await screen.findByRole("menuitem", { name: /^edit$/i })).toBeInTheDocument()
    }
  )

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

  it("blocks create save and names empty required fields the actor owns", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    expect(await screen.findByText(/project name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/description is required/i)).toBeInTheDocument()
    expect(screen.getByText(/location is required/i)).toBeInTheDocument()
    expect(screen.getByText(/funding year is required/i)).toBeInTheDocument()
    expect(screen.getByText(/main account is required/i)).toBeInTheDocument()
    expect(screen.queryByText(/contractor is required/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/bid price is required/i)).not.toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  it("does not block municipality edit when PPDO-owned fields are empty", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        description: "",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        location: "",
        contractor: "Build Co",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 25,
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
    ]
    store.authRecord = {
      id: "m1",
      role: "Municipality",
      account_status: "Active",
      municipality: "Tuguegarao City",
    }
    updateMock.mockResolvedValue({})

    render(<ProjectsModule />)

    await user.click(await screen.findByRole("button", { name: /actions for bridge/i }))
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
    await user.clear(screen.getByLabelText(/^contractor$/i))
    await user.type(screen.getByLabelText(/^contractor$/i), "Local Builders")
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ contractor: "Local Builders" })
      )
    })
    expect(screen.queryByText(/description is required/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/location is required/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/main account is required/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/funding year is required/i)).not.toBeInTheDocument()
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

  const awaitingDetailsCopy =
    "Awaiting your details — please complete the required fields for this project"

  it("should show awaiting-details copy on the project card for Municipality when a required field is empty", async () => {
    store.authRecord = {
      id: "m1",
      role: "Municipality",
      account_status: "Active",
      municipality: "Tuguegarao City",
    }
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
        contractor: "",
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 25,
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
        created_by: "sa1",
      },
    ]

    render(<ProjectsModule />)

    const card = await screen.findByTestId("project-card-p1")
    expect(card).toHaveTextContent(awaitingDetailsCopy)
  })

  it("should hide awaiting-details copy on the project card when Municipality has all five fields filled", async () => {
    store.authRecord = {
      id: "m1",
      role: "Municipality",
      account_status: "Active",
      municipality: "Tuguegarao City",
    }
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
        contractor: "Build Co",
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 25,
      },
    ]

    render(<ProjectsModule />)

    const card = await screen.findByTestId("project-card-p1")
    expect(card).not.toHaveTextContent(awaitingDetailsCopy)
  })

  it("should not show awaiting-details copy on Super Admin project cards", async () => {
    store.authRecord = {
      id: "sa1",
      role: "Super Admin",
      account_status: "Active",
    }
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
        contractor: "",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 25,
      },
    ]

    render(<ProjectsModule />)

    const card = await screen.findByTestId("project-card-p1")
    expect(card).not.toHaveTextContent(awaitingDetailsCopy)
  })

  it("lets scoped Barangay edit LGU-owned fields but not delete or change status from the menu", async () => {
    const user = userEvent.setup()
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
        bid_price: 200_000,
        progress_pct: 25,
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
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
    expect(screen.queryByTestId("create-project")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /actions for bridge/i }))
    expect(await screen.findByRole("menuitem", { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: /change status/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: /^delete$/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole("menuitem", { name: /^edit$/i }))
    expect(screen.getByLabelText(/project name/i)).toBeDisabled()
    expect(screen.getByLabelText(/^contractor$/i)).not.toBeDisabled()
    expect(screen.getByLabelText(/bid price/i)).not.toBeDisabled()
    expect(screen.queryByLabelText(/^start date$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^end date$/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/period of implementation/i)).toBeDisabled()
  })

  it("lets scoped Municipality edit LGU-owned fields including status", async () => {
    const user = userEvent.setup()
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
        contractor: "Build Co",
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 25,
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
    ]
    store.authRecord = {
      id: "m1",
      role: "Municipality",
      account_status: "Active",
      municipality: "Tuguegarao City",
    }

    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /actions for bridge/i }))
    expect(screen.queryByRole("menuitem", { name: /change status/i })).not.toBeInTheDocument()
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
    expect(screen.getByLabelText(/project name/i)).toBeDisabled()
    expect(screen.getByRole("combobox", { name: /^status$/i })).not.toBeDisabled()
    expect(screen.getByLabelText(/^contractor$/i)).not.toBeDisabled()
    expect(screen.getByLabelText(/bid price/i)).not.toBeDisabled()
    expect(screen.queryByLabelText(/^start date$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^end date$/i)).not.toBeInTheDocument()
  })

  it("shows Edit in ⋮ and saves project updates for Province (V1/V2)", async () => {
    const user = userEvent.setup()
    store.authRecord = {
      id: "province-1",
      role: "Province",
      account_status: "Active",
    }
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
        contractor: "Build Co",
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 25,
        funding_year: 2025,
        fund_source: "Special Education Fund",
      },
    ]
    updateMock.mockResolvedValue({})

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", { name: /actions for bridge/i })
    )
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))

    expect(screen.getByRole("heading", { name: /edit project/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/project name/i)).not.toBeDisabled()
    expect(screen.getByRole("combobox", { name: /^status$/i })).toBeDisabled()
    expect(screen.getByLabelText(/^contractor$/i)).toBeDisabled()
    expect(screen.getByLabelText(/bid price/i)).toBeDisabled()
    expect(screen.queryByLabelText(/^start date$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^end date$/i)).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText(/project name/i))
    await user.type(screen.getByLabelText(/project name/i), "Bridge Renamed")
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ name: "Bridge Renamed" })
      )
    })
  })

  it("shows Edit and surfaces save errors for Super Admin (V2)", async () => {
    const user = userEvent.setup()
    store.authRecord = {
      id: "sa1",
      role: "Super Admin",
      account_status: "Active",
    }
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
        contractor: "Build Co",
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 25,
        funding_year: 2025,
        fund_source: "Special Education Fund",
      },
    ]
    updateMock.mockRejectedValueOnce(new Error("Failed to update record."))

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", { name: /actions for bridge/i })
    )
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
    expect(screen.getByRole("combobox", { name: /^status$/i })).toBeDisabled()
    expect(screen.getByLabelText(/^contractor$/i)).toBeDisabled()
    expect(screen.getByLabelText(/bid price/i)).toBeDisabled()
    expect(screen.queryByLabelText(/^start date$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^end date$/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    expect(
      await screen.findByText(/failed to update record/i)
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /edit project/i })).toBeInTheDocument()
  })

  it("should show latest progress update percent when project progress_pct is stale", async () => {
    store.projects = [
      {
        id: "vm00o40loqw6i10",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "SK Scholarship",
        description: "Barangay Scholars",
        category: "Scholarship",
        status: "Ongoing",
        municipality: "Abulug",
        barangay: "Alinunu",
        location: "Abulug",
        lgu_level: "Barangay",
        contractor: "Sa tabi tabi",
        start_date: "2026-07-12",
        target_end_date: "2026-07-16",
        budget_year: 2026,
        bid_price: 100_000,
        progress_pct: 0,
        number_of_students: 5,
      },
    ]
    store.progressUpdates = [
      {
        id: "older",
        collectionId: "pu",
        collectionName: "progress_updates",
        created: "2026-07-10 02:56:07.875Z",
        updated: "2026-07-10 02:56:07.875Z",
        project: "vm00o40loqw6i10",
        from_pct: 0,
        to_pct: 40,
        notes: "Midway",
        updated_at: "2026-07-10 02:56:07.875Z",
      },
      {
        id: "500a4qb5btctsij",
        collectionId: "pu",
        collectionName: "progress_updates",
        created: "2026-07-16 02:56:07.875Z",
        updated: "2026-07-16 02:56:07.875Z",
        project: "vm00o40loqw6i10",
        from_pct: 0,
        to_pct: 86,
        notes: "Almost complete!",
        updated_at: "2026-07-16 02:56:07.875Z",
      },
    ]

    render(<ProjectsModule />)

    const card = await screen.findByTestId("project-card-vm00o40loqw6i10")
    expect(card).toHaveTextContent("86%")
    expect(card).not.toHaveTextContent("40%")
    expect(
      screen.getByRole("progressbar", { name: /sk scholarship progress/i })
    ).toBeInTheDocument()
  })

  it("locks LGU-owned fields for PPDO and keeps Period of Implementation without start/end dates", async () => {
    const user = userEvent.setup()
    store.authRecord = {
      id: "pp1",
      role: "PPDO",
      account_status: "Active",
    }

    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))

    expect(screen.getByLabelText(/project name/i)).not.toBeDisabled()
    expect(screen.getByLabelText(/period of implementation/i)).not.toBeDisabled()
    expect(screen.getByLabelText(/^contractor$/i)).toBeDisabled()
    expect(screen.getAllByText(/filled by lgu\/barangay/i).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/^start date$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^end date$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/total budget/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/moa details/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/bid price/i)).toBeDisabled()

    await user.type(screen.getByLabelText(/project name/i), "Charter Road")
    await user.type(screen.getByLabelText(/^description$/i), "Charter encoding")
    await user.type(screen.getByLabelText(/^location$/i), "Provincial hall")
    await fillOwnedFundSource(user)
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Charter Road",
          status: "Planning",
          description: "Charter encoding",
          location: "Provincial hall",
        })
      )
    })
    expect(createMock.mock.calls[0]?.[0]).not.toHaveProperty("contractor")
    expect(createMock.mock.calls[0]?.[0]).not.toHaveProperty("total_budget")
  })

  it("matches Released Amount fund source year, main, and sub on New Project", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))

    expect(screen.getByLabelText(/^funding year$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^budget year$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^main account$/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^fund source$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^sub account$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^other purpose$/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/^main account$/i))
    expect(
      await screen.findByRole("option", { name: "General Fund" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Special Education Fund" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Special Health Fund" })
    ).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Trust Fund" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Others" })).toBeInTheDocument()
    await user.click(await screen.findByRole("option", { name: "General Fund" }))

    expect(screen.getByLabelText(/^sub account$/i)).toBeInTheDocument()
    await user.click(screen.getByLabelText(/^sub account$/i))
    expect(
      await screen.findByRole("option", { name: "GF - Proper" })
    ).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "20% DF" })).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Hospital Serv." })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Econ. Enterp." })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Bayanihan Fund" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "SA - Excise Tax" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "GT - Proper" })
    ).not.toBeInTheDocument()
    await user.click(await screen.findByRole("option", { name: "GF - Proper" }))

    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(await screen.findByRole("option", { name: "Trust Fund" }))
    expect(screen.getByLabelText(/^sub account$/i)).not.toHaveTextContent(
      "GF - Proper"
    )
    await user.click(screen.getByLabelText(/^sub account$/i))
    expect(
      await screen.findByRole("option", { name: "Trust Fund - Proper" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "LDRRMF - SA" })
    ).toBeInTheDocument()
    await user.keyboard("{Escape}")

    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(
      await screen.findByRole("option", { name: "Special Education Fund" })
    )
    expect(screen.queryByLabelText(/^sub account$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^other purpose$/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(
      await screen.findByRole("option", { name: "Special Health Fund" })
    )
    expect(screen.queryByLabelText(/^sub account$/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(await screen.findByRole("option", { name: "Others" }))
    expect(screen.queryByLabelText(/^sub account$/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^other purpose$/i)).toBeInTheDocument()
  })

  it("persists funding year, main account, and sub account separately from budget year", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))
    await user.type(screen.getByLabelText(/project name/i), "Funded Road")
    await user.type(screen.getByLabelText(/^description$/i), "Funded span")
    await user.type(screen.getByLabelText(/^location$/i), "Provincial hall")
    await user.click(screen.getByLabelText(/^funding year$/i))
    await user.click(await screen.findByRole("option", { name: "2024" }))
    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(await screen.findByRole("option", { name: "General Fund" }))
    await user.click(screen.getByLabelText(/^sub account$/i))
    await user.click(await screen.findByRole("option", { name: "GF - Proper" }))
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Funded Road",
          funding_year: 2024,
          fund_source: "General Fund",
          sub_account: "GF - Proper",
          budget_year: new Date().getFullYear(),
        })
      )
    })
    expect(createMock.mock.calls[0]?.[0]).not.toHaveProperty("main_account")
  })

  it("locks status for PPDO after LGU encoding and keeps name editable", async () => {
    const user = userEvent.setup()
    store.authRecord = {
      id: "pp1",
      role: "PPDO",
      account_status: "Active",
    }
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Charter Road",
        description: "",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Lasam",
        barangay: "Centro",
        location: "Poblacion",
        budget_year: 2026,
        bid_price: 1000,
        progress_pct: 10,
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
    ]

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", { name: /actions for charter road/i })
    )
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))

    expect(screen.getByLabelText(/project name/i)).not.toBeDisabled()
    const statusTrigger = screen.getByRole("combobox", { name: /^status$/i })
    expect(statusTrigger).toBeDisabled()
  })

  function catalogProject(overrides: Record<string, unknown> = {}) {
    return {
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
      contractor: "Build Co",
      start_date: "2026-06-01",
      target_end_date: "2026-12-01",
      budget_year: 2026,
      bid_price: 200_000,
      progress_pct: 25,
      funding_year: 2025,
      fund_source: "Special Education Fund",
      ...overrides,
    }
  }

  it.each([
    { role: "Super Admin", progress_pct: 50, status: "Ongoing" },
    { role: "Super Admin", progress_pct: 100, status: "Completed" },
    { role: "Province", progress_pct: 50, status: "Ongoing" },
    { role: "Province", progress_pct: 100, status: "Completed" },
  ])(
    "lets $role save project details at $progress_pct% completion",
    async ({ role, progress_pct, status }) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: `${role}-1`,
        role,
        account_status: "Active",
      }
      store.projects = [catalogProject({ progress_pct, status })]
      updateMock.mockResolvedValue({})

      render(<ProjectsModule />)

      await user.click(
        await screen.findByRole("button", { name: /actions for bridge/i })
      )
      await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
      await user.clear(screen.getByLabelText(/project name/i))
      await user.type(screen.getByLabelText(/project name/i), "Bridge Corrected")
      await user.click(screen.getByRole("button", { name: /^save$/i }))

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          "p1",
          expect.objectContaining({ name: "Bridge Corrected" })
        )
      })
    }
  )

  it.each([50, 100])(
    "lets PPDO save owned fields at %s%% completion",
    async (progress_pct) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: "pp1",
        role: "PPDO",
        account_status: "Active",
      }
      store.projects = [
        catalogProject({
          progress_pct,
          lgu_encoded_at: "2026-08-01 00:00:00.000Z",
        }),
      ]
      updateMock.mockResolvedValue({})

      render(<ProjectsModule />)

      await user.click(
        await screen.findByRole("button", { name: /actions for bridge/i })
      )
      await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
      await user.clear(screen.getByLabelText(/project name/i))
      await user.type(screen.getByLabelText(/project name/i), "Charter Bridge")
      await user.click(screen.getByRole("button", { name: /^save$/i }))

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          "p1",
          expect.objectContaining({ name: "Charter Bridge" })
        )
      })
      const payload = updateMock.mock.calls[0]?.[1] as Record<string, unknown>
      expect(payload).not.toHaveProperty("contractor")
      expect(payload).not.toHaveProperty("progress_pct")
      expect(payload).not.toHaveProperty("start_date")
    }
  )

  it.each([50, 100])(
    "lets Barangay save LGU-owned fields at %s%% completion",
    async (progress_pct) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: "b1",
        role: "Barangay",
        account_status: "Active",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      }
      store.projects = [
        catalogProject({
          progress_pct,
          lgu_level: "Barangay",
          lgu_encoded_at: "2026-08-01 00:00:00.000Z",
        }),
      ]
      updateMock.mockResolvedValue({})

      render(<ProjectsModule />)

      await user.click(
        await screen.findByRole("button", { name: /actions for bridge/i })
      )
      await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
      await user.clear(screen.getByLabelText(/^contractor$/i))
      await user.type(screen.getByLabelText(/^contractor$/i), "Local Builders")
      await user.click(screen.getByRole("button", { name: /^save$/i }))

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          "p1",
          expect.objectContaining({ contractor: "Local Builders" })
        )
      })
      const payload = updateMock.mock.calls[0]?.[1] as Record<string, unknown>
      expect(payload).not.toHaveProperty("name")
      expect(payload).not.toHaveProperty("budget_year")
    }
  )

  it("lets PPDO edit student count after switching the form category to Scholarship", async () => {
    const user = userEvent.setup()
    store.authRecord = {
      id: "pp1",
      role: "PPDO",
      account_status: "Active",
    }
    store.projectCategoryOptions = [
      {
        id: "cat-infra",
        collectionId: "project_category_options",
        collectionName: "project_category_options",
        name: "Infrastructure",
        active: true,
        sort_order: 1,
      },
      {
        id: "cat-sch",
        collectionId: "project_category_options",
        collectionName: "project_category_options",
        name: "Scholarship",
        active: true,
        sort_order: 2,
      },
    ]
    store.projects = [catalogProject({ category: "Infrastructure" })]

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", { name: /actions for bridge/i })
    )
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
    await user.click(screen.getByRole("combobox", { name: /^category$/i }))
    await user.click(await screen.findByRole("option", { name: "Scholarship" }))

    const students = await screen.findByLabelText(/number of students/i)
    expect(students).not.toBeDisabled()
  })

  it("loads the PPDO catalog when progress_updates is denied", async () => {
    store.authRecord = {
      id: "pp1",
      role: "PPDO",
      account_status: "Active",
    }
    store.denied.add("progress_updates")
    store.projects = [catalogProject()]

    render(<ProjectsModule />)

    expect(
      await screen.findByRole("button", { name: /actions for bridge/i })
    ).toBeInTheDocument()
  })

  it("strips LGU-owned columns from PPDO Excel import", async () => {
    const user = userEvent.setup()
    store.authRecord = {
      id: "pp1",
      role: "PPDO",
      account_status: "Active",
    }
    xlsxState.rows = [
      {
        "Project Name": "Road Widening",
        Description: "Phase 1",
        Location: "Tuguegarao City",
        Contractor: "BuildCo",
        "Bid Price": "1500000",
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
      expect(createMock).toHaveBeenCalledTimes(1)
    })
    const payload = createMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload).toMatchObject({
      name: "Road Widening",
      description: "Phase 1",
      location: "Tuguegarao City",
    })
    expect(payload).not.toHaveProperty("contractor")
    expect(payload).not.toHaveProperty("bid_price")
    expect(payload).not.toHaveProperty("total_budget")
  })

  it.each(["PPDO", "Province", "Super Admin"] as const)(
    "should keep MOA upload enabled for %s when project is For Revision",
    async (role) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: `${role}-moa`,
        role,
        account_status: "Active",
      }
      store.projects = [
        catalogProject({
          status: "For Revision",
          lgu_encoded_at: "2026-08-01 00:00:00.000Z",
          moa_file: ["old-moa.pdf"],
        }),
      ]

      render(<ProjectsModule />)

      await user.click(
        await screen.findByRole("button", { name: /actions for bridge/i })
      )
      await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))

      expect(screen.getByText(/on record: old-moa\.pdf/i)).toBeInTheDocument()
      expect(
        screen.getByTestId("document-upload-input-moa-file")
      ).not.toBeDisabled()
    }
  )

  it.each(["Super Admin", "Province", "PPDO"] as const)(
    "should list existing MOA files when Edit Project opens for %s",
    async (role) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: `${role}-moa-list`,
        role,
        account_status: "Active",
      }
      store.projects = [
        catalogProject({
          moa_file: ["old-moa.pdf", "addendum.pdf"],
        }),
      ]

      render(<ProjectsModule />)

      await user.click(
        await screen.findByRole("button", { name: /actions for bridge/i })
      )
      await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))

      expect(screen.getByText(/on record: old-moa\.pdf/i)).toBeInTheDocument()
      expect(screen.getByText(/on record: addendum\.pdf/i)).toBeInTheDocument()
    }
  )

  it.each(["Super Admin", "Province", "PPDO"] as const)(
    "should keep existing MOA filenames on save for %s when none are removed",
    async (role) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: `${role}-moa-keep`,
        role,
        account_status: "Active",
      }
      store.projects = [
        catalogProject({
          moa_file: ["old-moa.pdf"],
        }),
      ]
      updateMock.mockResolvedValue({})

      render(<ProjectsModule />)

      await user.click(
        await screen.findByRole("button", { name: /actions for bridge/i })
      )
      await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
      await user.click(screen.getByRole("button", { name: /^save$/i }))

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalled()
      })
      const payload = updateMock.mock.calls[0]?.[1]
      if (payload instanceof FormData) {
        expect(payload.getAll("moa_file")).toContain("old-moa.pdf")
        expect(payload.getAll("moa_file")).not.toContain("-old-moa.pdf")
        return
      }
      expect(payload).not.toHaveProperty("moa_file")
    }
  )

  it.each(["Super Admin", "Province"] as const)(
    "should keep existing MOA files when %s saves project text without removing attachments",
    async (role) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: `${role}-moa-text`,
        role,
        account_status: "Active",
      }
      store.projects = [
        catalogProject({
          moa_file: ["old-moa.pdf"],
        }),
      ]
      updateMock.mockResolvedValue({})

      render(<ProjectsModule />)

      await user.click(
        await screen.findByRole("button", { name: /actions for bridge/i })
      )
      await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
      await user.clear(screen.getByLabelText(/project name/i))
      await user.type(screen.getByLabelText(/project name/i), "Bridge Corrected")
      await user.click(screen.getByRole("button", { name: /^save$/i }))

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalled()
      })
      const payload = updateMock.mock.calls[0]?.[1]
      if (payload instanceof FormData) {
        expect(payload.getAll("moa_file")).toContain("old-moa.pdf")
        expect(payload.getAll("moa_file")).not.toContain("-old-moa.pdf")
        return
      }
      expect(payload).toEqual(expect.objectContaining({ name: "Bridge Corrected" }))
      expect(payload).not.toHaveProperty("moa_file")
    }
  )

  it.each(["Super Admin", "Province", "PPDO"] as const)(
    "should drop only the MOA file %s removes on save",
    async (role) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: `${role}-moa-drop`,
        role,
        account_status: "Active",
      }
      store.projects = [
        catalogProject({
          moa_file: ["old-moa.pdf", "keep-moa.pdf"],
        }),
      ]
      updateMock.mockResolvedValue({})

      render(<ProjectsModule />)

      await user.click(
        await screen.findByRole("button", { name: /actions for bridge/i })
      )
      await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
      await user.click(screen.getByRole("button", { name: /remove old-moa\.pdf/i }))
      await user.click(screen.getByRole("button", { name: /^save$/i }))

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalled()
      })
      const payload = updateMock.mock.calls[0]?.[1]
      expect(payload).toBeInstanceOf(FormData)
      const moaValues = (payload as FormData).getAll("moa_file")
      expect(moaValues).toContain("keep-moa.pdf")
      expect(moaValues).toContain("-old-moa.pdf")
      expect(moaValues).not.toContain("old-moa.pdf")
    }
  )

  it("should omit MOA files when Municipality saves so existing attachments stay on the record", async () => {
    const user = userEvent.setup()
    store.authRecord = {
      id: "m1-moa-skip",
      role: "Municipality",
      account_status: "Active",
      municipality: "Tuguegarao City",
    }
    store.projects = [
      catalogProject({
        moa_file: ["old-moa.pdf"],
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      }),
    ]
    updateMock.mockResolvedValue({})

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", { name: /actions for bridge/i })
    )
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
    await user.upload(screen.getByTestId("document-upload-input-project-photos"), [
      new File(["photo"], "site.jpg", { type: "image/jpeg" }),
    ])
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled()
    })
    const payload = updateMock.mock.calls[0]?.[1]
    expect(payload).toBeInstanceOf(FormData)
    expect((payload as FormData).getAll("moa_file")).toEqual([])
  })

  it("should keep existing MOA files when another document is uploaded", async () => {
    const user = userEvent.setup()
    store.authRecord = {
      id: "sa1",
      role: "Super Admin",
      account_status: "Active",
    }
    store.projects = [
      catalogProject({
        moa_file: ["old-moa.pdf"],
        resolution_file: ["old-res.pdf"],
      }),
    ]
    updateMock.mockResolvedValue({})

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", { name: /actions for bridge/i })
    )
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
    await user.upload(screen.getByTestId("document-upload-input-resolution-file"), [
      new File(["res"], "new-res.pdf", { type: "application/pdf" }),
    ])
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled()
    })
    const payload = updateMock.mock.calls[0]?.[1]
    expect(payload).toBeInstanceOf(FormData)
    expect((payload as FormData).getAll("moa_file")).toContain("old-moa.pdf")
    const resolution = (payload as FormData).getAll("resolution_file")
    expect(resolution).toContain("old-res.pdf")
    expect(
      resolution.some(
        (value) => value instanceof File && value.name === "new-res.pdf"
      )
    ).toBe(true)
  })

  it("should submit retained MOA names plus new files when PPDO uploads on For Revision", async () => {
    const user = userEvent.setup()
    store.authRecord = {
      id: "pp1",
      role: "PPDO",
      account_status: "Active",
    }
    store.projects = [
      catalogProject({
        status: "For Revision",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
        moa_file: ["old-moa.pdf"],
      }),
    ]
    updateMock.mockResolvedValue({})

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", { name: /actions for bridge/i })
    )
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))
    await user.upload(screen.getByTestId("document-upload-input-moa-file"), [
      new File(["revised"], "revised-moa.pdf", { type: "application/pdf" }),
    ])
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled()
    })
    const payload = updateMock.mock.calls[0]?.[1]
    expect(payload).toBeInstanceOf(FormData)
    const moaValues = (payload as FormData).getAll("moa_file")
    expect(moaValues).toContain("old-moa.pdf")
    expect(
      moaValues.some(
        (value) => value instanceof File && value.name === "revised-moa.pdf"
      )
    ).toBe(true)
  })
})
