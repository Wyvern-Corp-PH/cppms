import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"

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
  logs: [] as Array<Record<string, unknown>>,
  deniedCollections: [] as string[],
  listOptions: {} as Record<string, unknown>,
}

const DEFAULT_ACTIVITY_LOG = {
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
      getFullList: vi.fn(async (options?: unknown) => {
        store.listOptions[name] = options
        if (store.deniedCollections.includes(name)) {
          throw new Error("Only superusers can perform this action.")
        }
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

function asSuperAdmin() {
  authState.user = {
    id: "u1",
    name: "Current Admin",
    email: "current@example.test",
    role: "Super Admin",
    account_status: "Active",
  }
}

function seedActivityLogs() {
  store.users = [
    { id: "u-ana", name: "Ana Santos", email: "ana@example.test" },
    { id: "u-ben", name: "Ben Cruz", email: "ben@example.test" },
  ]
  store.logs = [
    {
      ...DEFAULT_ACTIVITY_LOG,
      id: "log-ana-create",
      actor_user: "u-ana",
      action: "create",
      resource: "projects",
      created: "2026-06-20 00:00:00.000Z",
    },
    {
      ...DEFAULT_ACTIVITY_LOG,
      id: "log-ana-approve",
      actor_user: "u-ana",
      action: "approve",
      resource: "approval_actions",
      created: "2026-06-23 00:00:00.000Z",
    },
    {
      ...DEFAULT_ACTIVITY_LOG,
      id: "log-ben-delete",
      actor_user: "u-ben",
      action: "delete",
      resource: "users",
      created: "2026-06-25 00:00:00.000Z",
    },
  ]
}

async function activityLogsSection() {
  await waitFor(() => {
    expect(screen.getByText("Activity Logs")).toBeInTheDocument()
  })
  const section = screen.getByText("Activity Logs").closest("section")
  expect(section).toBeTruthy()
  return within(section as HTMLElement)
}

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
    store.deniedCollections = []
    store.listOptions = {}
    store.logs = [{ ...DEFAULT_ACTIVITY_LOG }]
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

  it("should show Updated By as the submitter full name on the Progress tab", async () => {
    const user = userEvent.setup()
    store.users = [
      {
        id: "officer-user",
        name: "Barangay Officer",
        email: "officer@example.test",
      },
    ]
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
        updated_by: "officer-user",
      },
    ]

    render(<ReportsModule />)
    await user.click(await screen.findByRole("tab", { name: /^progress/i }))

    await waitFor(() => {
      expect(screen.getByText("Barangay Officer")).toBeInTheDocument()
    })
    expect(screen.queryByText("officer-user")).not.toBeInTheDocument()
  })

  it("should export the same Approved By and Updated By names as the table", async () => {
    const user = userEvent.setup()
    store.users = [
      {
        id: "province-user",
        name: "Province Reviewer",
        email: "province@example.test",
      },
      {
        id: "officer-user",
        name: "Barangay Officer",
        email: "officer@example.test",
      },
    ]
    store.projects = [
      {
        id: "p-approved",
        collectionId: "p",
        collectionName: "projects",
        name: "Approved Bridge",
        category: "Infrastructure",
        status: "Completed",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        lgu_level: "Barangay",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 100,
        approval_status: "approved",
        approved_at: "2026-08-19",
        approved_by: "province-user",
      },
    ]
    store.updates = [
      {
        id: "upd1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-23 00:00:00.000Z",
        project: "p-approved",
        from_pct: 25,
        to_pct: 100,
        site_photo: [],
        updated_by: "officer-user",
      },
    ]

    render(<ReportsModule />)
    await user.click(await screen.findByRole("tab", { name: /^approvals/i }))
    await waitFor(() => {
      expect(screen.getByText("Province Reviewer")).toBeInTheDocument()
    })
    await user.click(screen.getByTestId("export-current-tab"))

    const approvalRows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >
    expect(approvalRows[0]?.approved_by).toBe("Province Reviewer")
    expect(approvalRows[0]?.approved_by).not.toBe("province-user")

    vi.mocked(XLSX.utils.json_to_sheet).mockClear()
    await user.click(screen.getByRole("tab", { name: /^progress/i }))
    await waitFor(() => {
      expect(screen.getByText("Barangay Officer")).toBeInTheDocument()
    })
    await user.click(screen.getByTestId("export-current-tab"))

    const progressRows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >
    expect(progressRows[0]?.updated_by).toBe("Barangay Officer")
    expect(progressRows[0]?.updated_by).not.toBe("officer-user")
  })

  it("should hide known relation ids in table and excel when the user row exists", async () => {
    const user = userEvent.setup()
    const approverId = "rel-user-aaaa-bbbb-ccccdddd"
    const submitterId = "rel-user-eeee-ffff-gggghhhh"
    store.users = [
      { id: approverId, name: "Ana Santos", email: "ana@example.test" },
      { id: submitterId, name: "Ben Cruz", email: "ben@example.test" },
    ]
    store.projects = [
      {
        id: "p-audit",
        collectionId: "p",
        collectionName: "projects",
        name: "Audit Bridge",
        category: "Infrastructure",
        status: "Completed",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        lgu_level: "Barangay",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 100,
        target_end_date: "2026-12-31",
        approval_status: "approved",
        approved_at: "2026-08-19",
        approved_by: approverId,
      },
    ]
    store.updates = [
      {
        id: "upd-audit",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-23 00:00:00.000Z",
        updated_at: "2026-06-23 00:00:00.000Z",
        project: "p-audit",
        from_pct: 25,
        to_pct: 100,
        site_photo: [],
        updated_by: submitterId,
      },
    ]

    render(<ReportsModule />)
    await waitFor(() => {
      expect(screen.getByText("Audit Bridge")).toBeInTheDocument()
    })
    expect(screen.queryByText(approverId)).not.toBeInTheDocument()
    expect(screen.queryByText(submitterId)).not.toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: /^approvals/i }))
    await waitFor(() => {
      expect(screen.getByText("Ana Santos")).toBeInTheDocument()
    })
    expect(screen.queryByText(approverId)).not.toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: /^progress/i }))
    await waitFor(() => {
      expect(screen.getByText("Ben Cruz")).toBeInTheDocument()
    })
    expect(screen.queryByText(submitterId)).not.toBeInTheDocument()

    await user.click(screen.getByTestId("export-all-sheets"))
    const sheets = vi.mocked(XLSX.utils.json_to_sheet).mock.calls.map(
      (call) => call[0] as Array<Record<string, unknown>>
    )
    const exported = JSON.stringify(sheets)
    expect(exported).not.toContain(approverId)
    expect(exported).not.toContain(submitterId)
    expect(exported).not.toContain("p-audit")
    expect(sheets[2]?.[0]?.updated_by).toBe("Ben Cruz")
    expect(sheets[3]?.[0]?.approved_by).toBe("Ana Santos")
  })

  it("should show Approved By as the approving admin name and Pending when unapproved", async () => {
    const user = userEvent.setup()
    store.users = [
      {
        id: "province-user",
        name: "Province Reviewer",
        email: "province@example.test",
      },
    ]
    store.projects = [
      {
        id: "p-approved",
        collectionId: "p",
        collectionName: "projects",
        name: "Approved Bridge",
        category: "Infrastructure",
        status: "Completed",
        budget_year: 2026,
        progress_pct: 100,
        approval_status: "approved",
        approved_at: "2026-08-19",
        approved_by: "province-user",
      },
      {
        id: "p-pending",
        collectionId: "p",
        collectionName: "projects",
        name: "Pending School",
        category: "Education",
        status: "For Completion",
        budget_year: 2026,
        progress_pct: 100,
        approval_status: "pending",
      },
    ]

    render(<ReportsModule />)
    await user.click(await screen.findByRole("tab", { name: /^approvals/i }))

    await waitFor(() => {
      expect(screen.getByText("Approved Bridge")).toBeInTheDocument()
      expect(screen.getByText("Province Reviewer")).toBeInTheDocument()
      expect(screen.getByText("Pending School")).toBeInTheDocument()
      expect(screen.getAllByText("Pending").length).toBeGreaterThan(0)
    })
    expect(screen.queryByText("province-user")).not.toBeInTheDocument()
  })

  it("should resolve Approved By from expanded user when the users list is empty", async () => {
    const user = userEvent.setup()
    store.users = []
    store.projects = [
      {
        id: "p-approved",
        collectionId: "p",
        collectionName: "projects",
        name: "Approved Bridge",
        category: "Infrastructure",
        status: "Completed",
        budget_year: 2026,
        progress_pct: 100,
        approval_status: "approved",
        approved_at: "2026-08-19",
        approved_by: "province-user",
        expand: {
          approved_by: {
            id: "province-user",
            name: "Province Reviewer",
          },
        },
      },
    ]

    render(<ReportsModule />)
    await user.click(await screen.findByRole("tab", { name: /^approvals/i }))

    await waitFor(() => {
      expect(screen.getByText("Province Reviewer")).toBeInTheDocument()
    })
    expect(screen.queryByText("province-user")).not.toBeInTheDocument()

    await user.click(screen.getByTestId("export-current-tab"))
    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >
    expect(rows[0]?.approved_by).toBe("Province Reviewer")
  })

  it("should request user expands and resolve names when the users list is forbidden", async () => {
    const user = userEvent.setup()
    store.deniedCollections = ["users"]
    store.users = []
    store.projects = [
      {
        id: "p-approved",
        collectionId: "p",
        collectionName: "projects",
        name: "Approved Bridge",
        category: "Infrastructure",
        status: "Completed",
        budget_year: 2026,
        progress_pct: 100,
        approval_status: "approved",
        approved_at: "2026-08-19",
        approved_by: "province-user",
        expand: {
          approved_by: {
            id: "province-user",
            name: "Province Reviewer",
          },
        },
      },
    ]
    store.updates = [
      {
        id: "upd1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-23 00:00:00.000Z",
        project: "p-approved",
        from_pct: 25,
        to_pct: 100,
        site_photo: [],
        updated_by: "officer-user",
        expand: {
          updated_by: {
            id: "officer-user",
            name: "Barangay Officer",
          },
        },
      },
    ]

    render(<ReportsModule />)

    await waitFor(() => {
      expect(store.listOptions.projects).toEqual({ expand: "approved_by" })
      expect(store.listOptions.progress_updates).toEqual({
        expand: "updated_by",
      })
    })

    await user.click(await screen.findByRole("tab", { name: /^approvals/i }))
    await waitFor(() => {
      expect(screen.getByText("Province Reviewer")).toBeInTheDocument()
    })
    expect(screen.queryByText("province-user")).not.toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: /^progress/i }))
    await waitFor(() => {
      expect(screen.getByText("Barangay Officer")).toBeInTheDocument()
    })
    expect(screen.queryByText("officer-user")).not.toBeInTheDocument()
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
    })
    expect(screen.queryByText(/^projects$/)).not.toBeInTheDocument()
  })

  it("should show Actor, Action type, and Date range filters to Super Admin", async () => {
    asSuperAdmin()
    seedActivityLogs()

    render(<ReportsModule />)

    const logs = await activityLogsSection()
    expect(logs.getByLabelText(/filter by actor/i)).toBeInTheDocument()
    expect(logs.getByLabelText(/filter by action type/i)).toBeInTheDocument()
    expect(logs.getByRole("button", { name: /pick date range/i })).toBeInTheDocument()
  })

  it("should hide Activity Logs from Province, Municipality, and Barangay", async () => {
    for (const role of ["Province", "Municipality", "Barangay"] as const) {
      authState.user = {
        id: "u1",
        name: "Current Admin",
        email: "current@example.test",
        role,
        account_status: "Active",
      }
      seedActivityLogs()
      const { unmount } = render(<ReportsModule />)

      await waitFor(() => {
        expect(screen.getByText("Generate and export reports as Excel files")).toBeInTheDocument()
      })
      expect(screen.queryByText("Activity Logs")).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/filter by actor/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/filter by action type/i)).not.toBeInTheDocument()
      unmount()
    }
  })

  it("should narrow Activity Logs when Actor, Action type, or Date range changes", async () => {
    const user = userEvent.setup()
    asSuperAdmin()
    seedActivityLogs()

    render(<ReportsModule />)
    const logs = await activityLogsSection()

    expect(logs.getByText("Projects")).toBeInTheDocument()
    expect(logs.getByText("Approvals")).toBeInTheDocument()
    expect(logs.getByText("Users")).toBeInTheDocument()

    await user.click(logs.getByLabelText(/filter by actor/i))
    await user.click(await screen.findByRole("option", { name: "Ana Santos" }))
    expect(logs.getByText("Projects")).toBeInTheDocument()
    expect(logs.getByText("Approvals")).toBeInTheDocument()
    expect(logs.queryByText("Users")).not.toBeInTheDocument()

    await user.click(logs.getByLabelText(/filter by actor/i))
    await user.click(await screen.findByRole("option", { name: /all actors/i }))
    await user.click(logs.getByLabelText(/filter by action type/i))
    await user.click(await screen.findByRole("option", { name: "Deleted" }))
    expect(logs.getByText("Users")).toBeInTheDocument()
    expect(logs.queryByText("Projects")).not.toBeInTheDocument()
    expect(logs.queryByText("Approvals")).not.toBeInTheDocument()

    await user.click(logs.getByLabelText(/filter by action type/i))
    await user.click(await screen.findByRole("option", { name: /all actions/i }))
    await user.click(logs.getByRole("button", { name: /pick date range/i }))
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2026-06-22" },
    })
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2026-06-24" },
    })
    expect(logs.getByText("Approvals")).toBeInTheDocument()
    expect(logs.queryByText("Projects")).not.toBeInTheDocument()
    expect(logs.queryByText("Users")).not.toBeInTheDocument()
  })

  it("should AND Activity Log filters and restore the full list when cleared", async () => {
    const user = userEvent.setup()
    asSuperAdmin()
    seedActivityLogs()

    render(<ReportsModule />)
    const logs = await activityLogsSection()

    await user.click(logs.getByLabelText(/filter by actor/i))
    await user.click(await screen.findByRole("option", { name: "Ana Santos" }))
    await user.click(logs.getByLabelText(/filter by action type/i))
    await user.click(await screen.findByRole("option", { name: "Approved" }))
    await user.click(logs.getByRole("button", { name: /pick date range/i }))
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2026-06-22" },
    })
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2026-06-24" },
    })

    expect(logs.getByText("Approvals")).toBeInTheDocument()
    expect(logs.queryByText("Projects")).not.toBeInTheDocument()
    expect(logs.queryByText("Users")).not.toBeInTheDocument()

    await user.click(logs.getByLabelText(/filter by actor/i))
    await user.click(await screen.findByRole("option", { name: /all actors/i }))
    await user.click(logs.getByLabelText(/filter by action type/i))
    await user.click(await screen.findByRole("option", { name: /all actions/i }))
    await user.click(logs.getByRole("button", { name: /jun 22, 2026/i }))
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("To date"), { target: { value: "" } })

    expect(logs.getByText("Projects")).toBeInTheDocument()
    expect(logs.getByText("Approvals")).toBeInTheDocument()
    expect(logs.getByText("Users")).toBeInTheDocument()
  })

  it("should show a human-readable activity log resource when Super Admin views logs", async () => {
    const liveProjectId = "proj-live-9f3a2c1b0e8d7a6"
    const deletedProjectId = "gone-uuid-aaaa-bbbb-ccccdddd"
    const locationId = "loc-uuid-1111-2222-33334444"

    authState.user = {
      id: "u1",
      name: "Current Admin",
      email: "current@example.test",
      role: "Super Admin",
      account_status: "Active",
    }
    store.projects = [
      {
        id: liveProjectId,
        collectionId: "p",
        collectionName: "projects",
        name: "Cagayan Bridge Rehab",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 40,
      },
    ]
    store.logs = [
      {
        ...DEFAULT_ACTIVITY_LOG,
        id: "log-live",
        resource: "projects",
        resource_id: liveProjectId,
      },
      {
        ...DEFAULT_ACTIVITY_LOG,
        id: "log-gone",
        resource: "projects",
        resource_id: deletedProjectId,
      },
      {
        ...DEFAULT_ACTIVITY_LOG,
        id: "log-locations",
        resource: "locations",
        resource_id: locationId,
      },
    ]

    render(<ReportsModule />)

    await waitFor(() => {
      expect(screen.getByText("Activity Logs")).toBeInTheDocument()
    })

    const logsSection = screen.getByText("Activity Logs").closest("section")
    expect(logsSection).toBeTruthy()
    const logs = within(logsSection as HTMLElement)

    expect(logs.getByText("Cagayan Bridge Rehab")).toBeInTheDocument()
    expect(logs.getByText("Projects")).toBeInTheDocument()
    expect(logs.getByText("Locations")).toBeInTheDocument()
    expect(logs.queryByText(liveProjectId)).not.toBeInTheDocument()
    expect(logs.queryByText(deletedProjectId)).not.toBeInTheDocument()
    expect(logs.queryByText(locationId)).not.toBeInTheDocument()
    expect(logs.queryByText(`projects:${liveProjectId}`)).not.toBeInTheDocument()
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
        bid_price: 200_000,
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
        category: "Infrastructure",
        lgu: "Barangay",
        location: "Tuguegarao City / Centro 01 (Bagumbayan)",
        totalBudget: formatPhp(200_000),
        allocated: formatPhp(100_000),
        spent: formatPhp(25_000),
        remaining: formatPhp(175_000),
        main_accounts: "General Fund",
        sub_accounts: "20% DF",
      }),
    ])

    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >
    expect(rows[0]).not.toHaveProperty("projectId")
    expect(rows[0]).not.toHaveProperty("category_material")
    expect(rows[0]).not.toHaveProperty("fund_type")
    expect(rows[0]).not.toHaveProperty("funding_years")
  })

  it("should include category, lgu, and location in progress excel when exporting current tab", async () => {
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
        bid_price: 200_000,
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
      },
    ]

    render(<ReportsModule />)
    await user.click(await screen.findByRole("tab", { name: /^progress/i }))
    await user.click(screen.getByTestId("export-current-tab"))

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      expect.objectContaining({
        project: "Bridge",
        category: "Infrastructure",
        lgu: "Barangay",
        location: "Tuguegarao City / Centro 01 (Bagumbayan)",
        from: "25%",
        to: "75%",
        change: "+50%",
      }),
    ])
  })

  it("should include category, lgu, location, spent, and savings in approvals excel when exporting current tab", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Completed",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        lgu_level: "Barangay",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 100,
        approval_status: "approved",
        approved_at: "2026-08-19",
        approved_by: "u1",
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
        date: "2026-06-18",
      },
    ]

    render(<ReportsModule />)
    await user.click(await screen.findByRole("tab", { name: /^approvals/i }))
    await user.click(screen.getByTestId("export-current-tab"))

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Bridge",
        category: "Infrastructure",
        lgu: "Barangay",
        location: "Tuguegarao City / Centro 01 (Bagumbayan)",
        spent: formatPhp(25_000),
        savings: formatPhp(175_000),
      }),
    ])
  })

  it("should include project table fields in projects excel when exporting current tab", async () => {
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
        bid_price: 200_000,
        progress_pct: 75,
        target_end_date: "2026-12-31",
      },
    ]

    render(<ReportsModule />)
    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })
    await user.click(screen.getByTestId("export-current-tab"))

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        lgu: "Barangay",
        location: "Tuguegarao City / Centro 01 (Bagumbayan)",
        budget: formatPhp(200_000),
        progress: "75%",
      }),
    ])
  })

  it("should export only filtered rows on all sheets when municipality filter is applied", async () => {
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
        lgu_level: "Barangay",
        budget_year: 2026,
        bid_price: 200_000,
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
        lgu_level: "Municipality",
        budget_year: 2026,
        bid_price: 300_000,
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
    await user.click(await screen.findByLabelText(/filter by municipality/i))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))

    await waitFor(() => {
      expect(screen.getByTestId("reports-projects")).toHaveTextContent("1")
    })

    await user.click(screen.getByTestId("export-all-sheets"))

    const sheets = vi.mocked(XLSX.utils.json_to_sheet).mock.calls.map(
      (call) => call[0] as Array<Record<string, unknown>>
    )
    expect(sheets).toHaveLength(4)
    expect(sheets[0]).toEqual([
      expect.objectContaining({ name: "City Bridge" }),
    ])
    expect(sheets[1]).toEqual([
      expect.objectContaining({ name: "City Bridge" }),
    ])
    expect(sheets[2]).toEqual([
      expect.objectContaining({ project: "City Bridge" }),
    ])
    expect(sheets[3]).toEqual([
      expect.objectContaining({ name: "City Bridge" }),
    ])
    expect(JSON.stringify(sheets)).not.toContain("Lasam School")
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
        bid_price: 200_000,
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
        bid_price: 300_000,
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

  it("renders report preview tables through the shared table primitive", async () => {
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
        bid_price: 200_000,
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

    await waitFor(() => {
      expect(screen.getByRole("table")).toHaveAttribute("data-slot", "table")
      expect(screen.getByRole("columnheader", { name: /deadline/i })).toHaveAttribute(
        "data-slot",
        "table-head"
      )
    })

    await user.click(screen.getByRole("tab", { name: /^budget/i }))
    expect(screen.getByRole("table")).toHaveAttribute("data-slot", "table")
    expect(screen.getByRole("columnheader", { name: /util %/i })).toHaveAttribute(
      "data-slot",
      "table-head"
    )
  })
})
