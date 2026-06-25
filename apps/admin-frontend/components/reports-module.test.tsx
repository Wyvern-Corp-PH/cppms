import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const authState = {
  user: {
    id: "u1",
    name: "Current Admin",
    email: "current@example.test",
    role: "Province",
    account_status: "Active",
  },
}

const store = {
  projects: [] as Array<Record<string, unknown>>,
  allocations: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
  projectStatusOptions: [] as Array<Record<string, unknown>>,
  projectCategoryOptions: [] as Array<Record<string, unknown>>,
  logs: [
    {
      id: "log1",
      collectionId: "logs",
      collectionName: "activity_logs",
      created: "2026-06-23 00:00:00.000Z",
      updated: "",
      actor_user: "u1",
      actor_role: "Super Admin",
      action: "update",
      resource: "projects",
      outcome: "success",
      duration_ms: 4,
    },
  ] as Array<Record<string, unknown>>,
}

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

import * as XLSX from "xlsx"

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "budget_allocations") return store.allocations
        if (name === "budget_expenses") return store.expenses
        if (name === "progress_updates") return store.updates
        if (name === "locations") return store.locations
        if (name === "activity_logs") return store.logs
        if (name === "users") return store.users
        if (name === "project_status_options") return store.projectStatusOptions
        if (name === "project_category_options") return store.projectCategoryOptions
        return []
      }),
    }),
  }),
}))

vi.mock("@/lib/auth", () => ({
  useAuth: () => authState,
}))

vi.mock("@/hooks/use-pocketbase-realtime", () => ({
  usePocketBaseRealtime: () => ({ live: true }),
}))

import { ReportsModule } from "./reports-module"

describe("ReportsModule (V12)", () => {
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
    authState.user = {
      id: "u1",
      name: "Current Admin",
      email: "current@example.test",
      role: "Province",
      account_status: "Active",
    }
    store.projects = []
    store.allocations = []
    store.expenses = []
    store.updates = []
    store.projectStatusOptions = [
      {
        id: "status1",
        collectionId: "project_status_options",
        collectionName: "project_status_options",
        name: "PB Report Status",
        active: true,
        sort_order: 1,
      },
    ]
    store.projectCategoryOptions = [
      {
        id: "category1",
        collectionId: "project_category_options",
        collectionName: "project_category_options",
        name: "PB Report Category",
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
        active: true,
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
        active: true,
      },
      {
        id: "loc3",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Tuguegarao City / Centro 01 (Bagumbayan)",
        slug: "tuguegarao-city/centro-01-bagumbayan",
        level: "Barangay",
        municipality_name: "Tuguegarao City",
        barangay_name: "Centro 01 (Bagumbayan)",
        active: true,
      },
      {
        id: "loc4",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Lasam / Centro",
        slug: "lasam/centro",
        level: "Barangay",
        municipality_name: "Lasam",
        barangay_name: "Centro",
        active: true,
      },
    ]
    store.users = []
    vi.mocked(XLSX.utils.json_to_sheet).mockClear()
    vi.mocked(XLSX.utils.book_append_sheet).mockClear()
    vi.mocked(XLSX.writeFile).mockClear()
  })

  it("exposes admin export buttons and reports subtitle", async () => {
    render(<ReportsModule />)

    await waitFor(() => {
      expect(screen.getByText("Generate and export reports as Excel files")).toBeInTheDocument()
      expect(screen.getByTestId("export-all-sheets")).toBeInTheDocument()
      expect(screen.getByTestId("export-current-tab")).toBeInTheDocument()
    })
  })

  it("renders a visible Live pill in the page header when subscribed", async () => {
    render(<ReportsModule />)

    await waitFor(() => {
      expect(screen.getByTestId("live-pill")).toHaveTextContent("Live")
    })
  })

  it("loads report status and category filter options from PocketBase fields", async () => {
    const user = userEvent.setup()
    render(<ReportsModule />)

    await user.click(await screen.findByLabelText(/filter by status/i))
    expect(
      await screen.findByRole("option", { name: "PB Report Status" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Planning" })
    ).not.toBeInTheDocument()

    await user.keyboard("{Escape}")
    await user.click(screen.getByLabelText(/filter by category/i))
    expect(
      await screen.findByRole("option", { name: "PB Report Category" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Infrastructure" })
    ).not.toBeInTheDocument()
  })

  it("uses the shared date range picker instead of standalone date inputs", async () => {
    render(<ReportsModule />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /pick date range/i })).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/^filter from date$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^filter to date$/i)).not.toBeInTheDocument()
  })

  it("shows activity logs only to Super Admin", async () => {
    authState.user = {
      id: "u1",
      name: "Current Admin",
      email: "current@example.test",
      role: "Super Admin",
      account_status: "Active",
    }

    render(<ReportsModule />)

    await waitFor(() => {
      expect(screen.getByText("Activity Logs")).toBeInTheDocument()
      expect(screen.getByText("projects")).toBeInTheDocument()
    })
  })

  it("exports budget rows with released amount fund source data", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        lgu_level: "Barangay",
        budget_year: 2026,
        total_budget: 200_000,
        progress_pct: 75,
      },
    ]
    store.allocations = [
      {
        id: "a1",
        collectionId: "a",
        collectionName: "budget_allocations",
        project: "p1",
        amount: 100_000,
        year: 2026,
        date: "2026-06-17",
      },
    ]
    store.expenses = [
      {
        id: "e1",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 25_000,
        year: 2026,
        main_account: "General Fund",
        sub_account: "20% DF",
        date: "2026-06-18",
      },
    ]

    render(<ReportsModule />)

    await user.click(await screen.findByRole("tab", { name: /^budget/i }))
    await user.click(screen.getByTestId("export-current-tab"))

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Bridge",
        main_accounts: "General Fund",
        sub_accounts: "20% DF",
      }),
    ])

    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >
    expect(rows[0]).not.toHaveProperty("category_material")
    expect(rows[0]).not.toHaveProperty("fund_type")
    expect(rows[0]).not.toHaveProperty("funding_years")
  })

  it("renders current-user ids as names when the users list is unavailable", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 75,
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-23 00:00:00.000Z",
        project: "p1",
        from_pct: 25,
        to_pct: 75,
        site_photo: [],
        updated_by: "u1",
      },
    ]

    render(<ReportsModule />)

    await user.click(await screen.findByRole("tab", { name: /^progress/i }))

    await waitFor(() => {
      expect(screen.getByText("Current Admin")).toBeInTheDocument()
      expect(screen.queryByText(/^u1$/)).not.toBeInTheDocument()
    })
  })

  it("filters all report tabs by municipality and barangay instead of LGU", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        total_budget: 200_000,
        progress_pct: 75,
      },
      {
        id: "p2",
        collectionId: "p",
        collectionName: "projects",
        name: "Lasam School",
        category: "Education",
        status: "Ongoing",
        municipality: "Lasam",
        barangay: "Centro",
        budget_year: 2026,
        total_budget: 300_000,
        progress_pct: 40,
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-23 00:00:00.000Z",
        project: "p1",
        from_pct: 25,
        to_pct: 75,
        site_photo: [],
      },
      {
        id: "u2",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-23 00:00:00.000Z",
        project: "p2",
        from_pct: 20,
        to_pct: 40,
        site_photo: [],
      },
    ]

    render(<ReportsModule />)

    expect(screen.queryByLabelText(/filter by lgu/i)).not.toBeInTheDocument()
    await user.click(await screen.findByLabelText(/filter by municipality/i))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByLabelText(/filter by barangay/i))

    expect(await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Centro" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("option", { name: "Centro 01 (Bagumbayan)" }))

    await waitFor(() => {
      expect(screen.getByTestId("reports-projects")).toHaveTextContent("1")
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole("tab", { name: /^progress/i }))

    await waitFor(() => {
      expect(screen.getByTestId("reports-progress-count")).toHaveTextContent("1")
    })
  })

  it("renders other relation user ids from minimal users list rows", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 75,
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-23 00:00:00.000Z",
        project: "p1",
        from_pct: 25,
        to_pct: 75,
        site_photo: [],
        updated_by: "sample-admin",
      },
    ]
    store.users = [
      {
        id: "sample-admin",
        name: "Sample Admin",
      },
    ]

    render(<ReportsModule />)

    await user.click(await screen.findByRole("tab", { name: /^progress/i }))

    await waitFor(() => {
      expect(screen.getByText("Sample Admin")).toBeInTheDocument()
      expect(screen.queryByText("sample-admin")).not.toBeInTheDocument()
    })
  })
})
