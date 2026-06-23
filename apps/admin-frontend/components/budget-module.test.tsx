import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  allocations: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
  authRecord: {
    id: "current-user",
    email: "current@example.test",
    name: "Current Admin",
    role: "Admin",
    account_status: "Active",
  } as Record<string, unknown> | null,
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: store.authRecord,
    },
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "budget_allocations") return store.allocations
        if (name === "budget_expenses") return store.expenses
        if (name === "users") return store.users
        return []
      }),
    }),
  }),
}))

import { BudgetModule } from "./budget-module"

describe("BudgetModule (V9, V10, V24)", () => {
  beforeEach(() => {
    store.projects = []
    store.allocations = []
    store.expenses = []
    store.users = []
    store.authRecord = {
      id: "current-user",
      email: "current@example.test",
      name: "Current Admin",
      role: "Admin",
      account_status: "Active",
    }
  })

  it("renders allocation and expense amounts as signed single values", async () => {
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
        total_budget: 200_000,
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
        amount: 100_000,
        category: "Materials",
        date: "2026-06-17",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByText("+100,000")).toBeInTheDocument()
      expect(screen.queryByText(/\+100,000\s+₱100,000/)).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole("tab", { name: /expenses/i }))

    await waitFor(() => {
      expect(screen.getByText("-100,000")).toBeInTheDocument()
      expect(screen.queryByText(/-100,000\s+₱100,000/)).not.toBeInTheDocument()
    })
  })

  it("renders allocation user ids as user names", async () => {
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        total_budget: 200_000,
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
        allocated_by: "u1",
      },
    ]
    store.users = [
      {
        id: "u1",
        collectionId: "users",
        collectionName: "users",
        email: "ana@example.test",
        name: "Ana Santos",
        role: "Admin",
        account_status: "Active",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByText("Ana Santos")).toBeInTheDocument()
      expect(screen.queryByText("u1")).not.toBeInTheDocument()
    })
  })

  it("renders the current auth user name when user list is unavailable", async () => {
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        total_budget: 200_000,
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
        allocated_by: "current-user",
      },
    ]
    store.users = []

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByText("Current Admin")).toBeInTheDocument()
      expect(screen.queryByText("current-user")).not.toBeInTheDocument()
    })
  })

  it("clears selected files when the allocate modal closes", async () => {
    const user = userEvent.setup()
    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByTestId("budget-total")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("allocate-budget"))
    const input = screen.getByTestId("document-upload-input-allocation-moa")
    await user.upload(input, new File(["moa"], "moa.pdf", { type: "application/pdf" }))

    expect(screen.getByText("moa.pdf")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /close/i }))

    await waitFor(() => {
      expect(screen.queryByText("moa.pdf")).not.toBeInTheDocument()
    })

    await user.click(screen.getByTestId("allocate-budget"))

    await waitFor(() => {
      expect(screen.queryByText("moa.pdf")).not.toBeInTheDocument()
    })
  })

  it("shows document labels in the allocate budget modal", async () => {
    const user = userEvent.setup()
    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByTestId("budget-total")).toBeInTheDocument()
    })

    await user.click(screen.getByTestId("allocate-budget"))

    await waitFor(() => {
      expect(screen.getByText("Memorandum of Agreement")).toBeInTheDocument()
      expect(screen.getByText("Resolution")).toBeInTheDocument()
      expect(
        screen.queryByText("Province/Barangay Agreement")
      ).not.toBeInTheDocument()
      expect(screen.getByText("Supporting project documents")).toBeInTheDocument()
    })
  })

  it("renders summary cards and breakdown after skeleton load", async () => {
    render(<BudgetModule />)

    expect(screen.getByTestId("budget-skeleton")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId("budget-total")).toBeInTheDocument()
      expect(screen.getByTestId("budget-remaining")).toBeInTheDocument()
      expect(screen.getByTestId("budget-breakdown")).toBeInTheDocument()
    })
  })
})
