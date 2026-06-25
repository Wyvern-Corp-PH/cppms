import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  allocations: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: { id: "1", email: "admin@cppms.local" },
      onChange: vi.fn(() => () => undefined),
      clear: vi.fn(),
    },
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "budget_allocations") return store.allocations
        if (name === "budget_expenses") return store.expenses
        if (name === "locations") return store.locations
        return []
      }),
    }),
  }),
}))

import { DashboardModule } from "@/components/dashboard-module"

describe("J12 dashboard filter journey", () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => false),
    })
    Object.defineProperty(window.HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(window.HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    })
  })

  beforeEach(() => {
    store.projects = [
      {
        id: "p1",
        collectionId: "projects",
        collectionName: "projects",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        start_date: "2026-06-01",
        target_end_date: "2026-06-30",
        budget_year: 2026,
        total_budget: 100_000,
        progress_pct: 75,
      },
      {
        id: "p2",
        collectionId: "projects",
        collectionName: "projects",
        name: "Lasam School",
        category: "Education",
        status: "Completed",
        municipality: "Lasam",
        barangay: "Centro",
        start_date: "2026-07-01",
        target_end_date: "2026-07-30",
        budget_year: 2026,
        total_budget: 300_000,
        progress_pct: 100,
        approval_status: "pending",
      },
    ]
    store.allocations = [
      {
        id: "a1",
        collectionId: "budget_allocations",
        collectionName: "budget_allocations",
        project: "p1",
        amount: 100_000,
        year: 2026,
        date: "2026-06-05",
      },
      {
        id: "a2",
        collectionId: "budget_allocations",
        collectionName: "budget_allocations",
        project: "p2",
        amount: 300_000,
        year: 2026,
        date: "2026-07-05",
      },
    ]
    store.expenses = [
      {
        id: "e1",
        collectionId: "budget_expenses",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 25_000,
        year: 2026,
        main_account: "General Fund",
        date: "2026-06-10",
      },
    ]
    store.locations = [
      {
        id: "loc1",
        collectionId: "locations",
        collectionName: "locations",
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
        name: "Tuguegarao City / Centro 01 (Bagumbayan)",
        slug: "tuguegarao-city/centro-01-bagumbayan",
        level: "Barangay",
        municipality_name: "Tuguegarao City",
        barangay_name: "Centro 01 (Bagumbayan)",
        active: true,
      },
    ]
  })

  it("date and location filters update KPI and widget data", async () => {
    const user = userEvent.setup()
    render(<DashboardModule />)

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-projects")).toHaveTextContent("1")
      expect(screen.getByTestId("dashboard-budget")).toHaveTextContent("₱400,000")
    })

    await user.click(screen.getByLabelText(/filter by municipality/i))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByLabelText(/filter by barangay/i))
    await user.click(await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" }))
    await user.click(screen.getByRole("button", { name: /pick date range/i }))
    await user.type(screen.getByLabelText(/from date/i), "2026-06-01")
    await user.type(screen.getByLabelText(/to date/i), "2026-06-30")

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-projects")).toHaveTextContent("1")
      expect(screen.getByTestId("dashboard-budget")).toHaveTextContent("₱100,000")
      expect(screen.getByTestId("dashboard-on-track")).toHaveTextContent("1")
      expect(screen.getByText("25% spent")).toBeInTheDocument()
      expect(screen.getByTitle(/City Bridge:/)).toBeInTheDocument()
      expect(screen.queryByTitle("Lasam School: Completed")).not.toBeInTheDocument()
    })
  })
})
