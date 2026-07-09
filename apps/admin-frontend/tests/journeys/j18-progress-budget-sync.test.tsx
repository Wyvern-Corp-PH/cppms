import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
  fundingYears: [
    {
      id: "fy1",
      collectionId: "budget_funding_years",
      collectionName: "budget_funding_years",
      name: "2026",
      active: true,
      sort_order: 1,
    },
  ] as Array<Record<string, unknown>>,
  mainAccounts: [
    {
      id: "ma1",
      collectionId: "budget_fund_main_accounts",
      collectionName: "budget_fund_main_accounts",
      name: "General Fund",
      active: true,
      sort_order: 1,
    },
  ] as Array<Record<string, unknown>>,
  subAccounts: [
    {
      id: "sa1",
      collectionId: "budget_fund_sub_accounts",
      collectionName: "budget_fund_sub_accounts",
      name: "GF - Proper",
      main_account: "General Fund",
      active: true,
      sort_order: 1,
    },
  ] as Array<Record<string, unknown>>,
  authRecord: {
    id: "barangay-user",
    email: "barangay@example.test",
    name: "Current Barangay User",
    role: "Barangay",
    account_status: "Active",
    municipality: "Tuguegarao City",
    barangay: "Centro 01 (Bagumbayan)",
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
        if (name === "progress_updates") return store.updates
        if (name === "budget_expenses") return store.expenses
        if (name === "locations") return store.locations
        if (name === "users") return store.users
        if (name === "budget_funding_years") return store.fundingYears
        if (name === "budget_fund_main_accounts") return store.mainAccounts
        if (name === "budget_fund_sub_accounts") return store.subAccounts
        return []
      }),
      create: vi.fn(async (payload: Record<string, unknown> | FormData) => {
        if (name === "budget_expenses") {
          const record = {
            id: "e-sync",
            collectionId: "e",
            collectionName: "budget_expenses",
            created: "2026-07-09T00:00:00.000Z",
            updated: "2026-07-09T00:00:00.000Z",
            ...(payload as Record<string, unknown>),
            amount: String((payload as Record<string, unknown>).amount),
            year: String((payload as Record<string, unknown>).year),
          }
          store.expenses.push(record)
          return record
        }

        const progressRecord = {
          id: "pu-sync",
          collectionId: "updates",
          collectionName: "progress_updates",
          created: "2026-07-09T00:00:00.000Z",
          updated: "2026-07-09T00:00:00.000Z",
          project: (payload as FormData).get("project"),
          from_pct: Number((payload as FormData).get("from_pct")),
          to_pct: Number((payload as FormData).get("to_pct")),
          site_photo: [],
        }
        store.updates.unshift(progressRecord)
        return progressRecord
      }),
      update: vi.fn(async (id: string, payload: Record<string, unknown>) => {
        const index = store.projects.findIndex((row) => row.id === id)
        if (index >= 0) {
          store.projects[index] = { ...store.projects[index], ...payload }
        }
        return store.projects[index]
      }),
      delete: vi.fn(),
    }),
  }),
}))

import { BudgetModule } from "@/components/budget-module"
import { ProgressModule } from "@/components/progress-module"

function makeFile(name: string, type = "application/pdf") {
  return new File(["content"], name, { type })
}

describe("J18 progress update syncs released amount to budget module", () => {
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
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Barangay Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        total_budget: 200_000,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = []
    store.expenses = []
    store.locations = []
    store.users = []
    store.authRecord = {
      id: "barangay-user",
      email: "barangay@example.test",
      name: "Current Barangay User",
      role: "Barangay",
      account_status: "Active",
      municipality: "Tuguegarao City",
      barangay: "Centro 01 (Bagumbayan)",
    }
  })

  it("shows synced released amount in the Budget module after a progress update save", async () => {
    const user = userEvent.setup()

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "2500")
    await user.type(screen.getByLabelText(/^receipt number$/i), "RCPT-18")
    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(screen.getByRole("option", { name: "General Fund" }))
    await user.click(screen.getByLabelText(/^sub account$/i))
    await user.click(screen.getByRole("option", { name: "GF - Proper" }))
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(store.expenses).toHaveLength(1)
      expect(store.expenses[0]).toMatchObject({
        project: "p1",
        amount: "2500",
        receipt_number: "RCPT-18",
        main_account: "General Fund",
        sub_account: "GF - Proper",
      })
    })

    cleanup()
    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByTestId("budget-spent")).toHaveTextContent("₱2,500")
    })

    await user.click(screen.getByRole("tab", { name: /released amount/i }))

    await waitFor(() => {
      expect(screen.getByText("-2,500")).toBeInTheDocument()
      expect(screen.getByText("RCPT-18")).toBeInTheDocument()
      expect(screen.getAllByText("Barangay Bridge").length).toBeGreaterThan(0)
    })
  })
})
