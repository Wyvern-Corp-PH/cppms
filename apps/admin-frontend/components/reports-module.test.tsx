import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const authState = {
  user: {
    id: "u1",
    name: "Current Admin",
    email: "current@example.test",
    role: "Admin",
    account_status: "Active",
  },
}

const store = {
  projects: [] as Array<Record<string, unknown>>,
  allocations: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
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

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "budget_allocations") return store.allocations
        if (name === "budget_expenses") return store.expenses
        if (name === "progress_updates") return store.updates
        if (name === "activity_logs") return store.logs
        if (name === "users") return store.users
        return []
      }),
    }),
  }),
}))

vi.mock("@/lib/auth", () => ({
  useAuth: () => authState,
}))

import { ReportsModule } from "./reports-module"

describe("ReportsModule (V12)", () => {
  beforeEach(() => {
    authState.user = {
      id: "u1",
      name: "Current Admin",
      email: "current@example.test",
      role: "Admin",
      account_status: "Active",
    }
    store.projects = []
    store.allocations = []
    store.expenses = []
    store.updates = []
    store.users = []
  })

  it("exposes admin export buttons and reports subtitle", async () => {
    render(<ReportsModule />)

    await waitFor(() => {
      expect(screen.getByText("Generate and export reports as Excel files")).toBeInTheDocument()
      expect(screen.getByTestId("export-all-sheets")).toBeInTheDocument()
      expect(screen.getByTestId("export-current-tab")).toBeInTheDocument()
    })
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
