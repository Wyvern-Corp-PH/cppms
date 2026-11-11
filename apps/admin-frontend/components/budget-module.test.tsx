import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  allocations: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  fundSources: [] as Array<Record<string, unknown>>,
  fundingYears: [] as Array<Record<string, unknown>>,
  fundMainAccounts: [] as Array<Record<string, unknown>>,
  fundSubAccounts: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
  deniedCollections: [] as string[],
  listOptions: {} as Record<string, unknown>,
  authRecord: {
    id: "current-user",
    email: "current@example.test",
    name: "Current Province User",
    role: "Province",
    account_status: "Active",
  } as Record<string, unknown> | null,
}

const createMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: store.authRecord,
    },
    collection: (name: string) => ({
      getFullList: vi.fn(async (options?: unknown) => {
        store.listOptions[name] = options
        if (store.deniedCollections.includes(name)) {
          throw new Error("Only superusers can perform this action.")
        }
        if (name === "projects") {
          return store.projects.map((project) => ({
            contractor: "Build Co",
            start_date: "2026-06-01",
            target_end_date: "2026-12-01",
            ...project,
          }))
        }
        if (name === "budget_allocations") return store.allocations
        if (name === "budget_expenses") return store.expenses
        if (name === "locations") return store.locations
        if (name === "budget_fund_sources") return store.fundSources
        if (name === "budget_funding_years") return store.fundingYears
        if (name === "budget_fund_main_accounts") return store.fundMainAccounts
        if (name === "budget_fund_sub_accounts") return store.fundSubAccounts
        if (name === "users") return store.users
        return []
      }),
      create: createMock,
    }),
  }),
}))

import { BudgetModule } from "./budget-module"

async function chooseDateRange(user: ReturnType<typeof userEvent.setup>, from: string, to: string) {
  await user.click(screen.getByRole("button", { name: /pick date range/i }))
  await user.type(screen.getByLabelText(/from date/i), from)
  await user.type(screen.getByLabelText(/to date/i), to)
}

describe("BudgetModule (V9, V10, V24)", () => {
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
    store.allocations = []
    store.expenses = []
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
    store.fundSources = []
    store.fundingYears = []
    store.fundMainAccounts = []
    store.fundSubAccounts = []
    store.users = []
    store.deniedCollections = []
    store.listOptions = {}
    store.authRecord = {
      id: "current-user",
      email: "current@example.test",
      name: "Current Province User",
      role: "Province",
      account_status: "Active",
    }
    createMock.mockClear()
  })

  it("should hide + Allocate for Provincial Admin and keep existing allocations", async () => {
    store.authRecord = {
      id: "current-user",
      email: "current@example.test",
      name: "Current Province User",
      role: "Province",
      account_status: "Active",
    }
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 200_000,
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
        description: "FY2026 allocation",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /^allocations$/i })).toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /\+ allocate/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId("allocate-budget")).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog", { name: /allocate budget/i })).not.toBeInTheDocument()

    const table = screen.getByRole("table")
    expect(within(table).getByText("Bridge")).toBeInTheDocument()
    expect(within(table).getByText("+100,000")).toBeInTheDocument()
    expect(within(table).getByText("FY2026 allocation")).toBeInTheDocument()
  })

  function seedReleasedAmountTable() {
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
        budget_year: 2026,
        bid_price: 200_000,
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
        date: "2026-06-17",
      },
    ]
  }

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
        bid_price: 200_000,
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
        year: 2026,
        main_account: "General Fund",
        sub_account: "Road materials",
        date: "2026-06-17",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByText("+100,000")).toBeInTheDocument()
      expect(screen.queryByText(/\+100,000\s+₱100,000/)).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole("tab", { name: /released amount/i }))

    await waitFor(() => {
      expect(screen.getByText("-100,000")).toBeInTheDocument()
      expect(screen.queryByText(/-100,000\s+₱100,000/)).not.toBeInTheDocument()
    })
  })

  it("shows released amount values in the summary and table", async () => {
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
        bid_price: 200_000,
      },
    ]
    store.expenses = [
      {
        id: "e1",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p1",
        amount: "25,000",
        year: "2026",
        main_account: "General Fund",
        sub_account: "20% DF",
        date: "2026-06-17",
        description: "Release for road work",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getAllByText("Amount released").length).toBeGreaterThan(0)
      expect(screen.getByTestId("budget-spent")).toHaveTextContent("₱25,000")
      expect(screen.getByText(/Amount released\s+₱25,000/)).toBeInTheDocument()
      expect(screen.queryByText("Spent")).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole("tab", { name: /released amount/i }))

    await waitFor(() => {
      expect(screen.getByText("-25,000")).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /description/i })).toBeInTheDocument()
      expect(screen.getByText("Release for road work")).toBeInTheDocument()
    })
  })

  it("should sum released amounts from progress updates when PocketBase leaves account fields blank", async () => {
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 10_000,
      },
    ]
    store.expenses = [
      {
        id: "e1",
        collectionId: "pbc_2635419501",
        collectionName: "budget_expenses",
        created: "2026-06-15 00:00:00.000Z",
        updated: "2026-06-15 00:00:00.000Z",
        project: "p1",
        amount: 1500,
        year: 2026,
        main_account: "",
        sub_account: "",
        date: "2026-06-15 00:00:00.000Z",
        receipt_number: "",
        description: "",
        progress_update: "pu-1",
      },
      {
        id: "e2",
        collectionId: "pbc_2635419501",
        collectionName: "budget_expenses",
        created: "2026-07-01 00:00:00.000Z",
        updated: "2026-07-01 00:00:00.000Z",
        project: "p1",
        amount: 2500,
        year: 2026,
        main_account: "",
        sub_account: "",
        date: "2026-07-01 00:00:00.000Z",
        receipt_number: "",
        description: "",
        progress_update: "pu-2",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByTestId("budget-total")).toHaveTextContent("₱10,000")
      expect(screen.getByTestId("budget-spent")).toHaveTextContent("₱4,000")
      expect(screen.getByTestId("budget-remaining")).toHaveTextContent("₱6,000")
    })

    const breakdown = screen.getByTestId("budget-breakdown")
    expect(breakdown).toHaveTextContent("Amount released ₱4,000")
    expect(breakdown).toHaveTextContent("Rem ₱6,000")
  })

  it("should show the project source of fund on released amounts and omit account columns", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "p-general",
        collectionId: "p",
        collectionName: "projects",
        name: "General Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 200_000,
        source_of_fund: "General Fund",
      },
      {
        id: "p-ldf",
        collectionId: "p",
        collectionName: "projects",
        name: "LDF Road",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 200_000,
        source_of_fund: "20% LDF (Local Development Fund)",
      },
      {
        id: "p-other",
        collectionId: "p",
        collectionName: "projects",
        name: "Other Hall",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 200_000,
        source_of_fund: "Others",
        source_of_fund_other: "  Congressional fund  ",
      },
      {
        id: "p-other-blank",
        collectionId: "p",
        collectionName: "projects",
        name: "Blank Other",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 200_000,
        source_of_fund: "Others",
        source_of_fund_other: "   ",
      },
      {
        id: "p-none",
        collectionId: "p",
        collectionName: "projects",
        name: "Legacy School",
        category: "Education",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 200_000,
        fund_source: "Special Education Fund",
      },
    ]
    store.expenses = [
      {
        id: "e-general",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p-general",
        amount: 10_000,
        year: 2026,
        main_account: "Trust Fund",
        sub_account: "Road materials",
        receipt_number: "OR-1",
        date: "2026-06-17",
        description: "General release",
      },
      {
        id: "e-ldf",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p-ldf",
        amount: 20_000,
        year: 2026,
        main_account: "General Fund",
        sub_account: "20% DF",
        receipt_number: "OR-2",
        date: "2026-06-17",
        description: "LDF release",
      },
      {
        id: "e-other",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p-other",
        amount: 30_000,
        year: 2026,
        main_account: "Others",
        sub_account: "Calamity reserve",
        receipt_number: "OR-3",
        date: "2026-06-17",
        description: "Other release",
      },
      {
        id: "e-other-blank",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p-other-blank",
        amount: 40_000,
        year: 2026,
        main_account: "Special Education Fund",
        sub_account: "School supplies",
        receipt_number: "OR-4",
        date: "2026-06-17",
        description: "Blank release",
      },
      {
        id: "e-none",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p-none",
        amount: 50_000,
        year: 2026,
        main_account: "Special Health Fund",
        sub_account: "Hospital Serv.",
        receipt_number: "OR-9",
        date: "2026-06-17",
        description: "Legacy release",
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByRole("tab", { name: /released amount/i }))

    const table = await screen.findByRole("table")
    expect(within(table).getByRole("columnheader", { name: "Project" })).toBeInTheDocument()
    expect(within(table).getByRole("columnheader", { name: "Amount" })).toBeInTheDocument()
    expect(within(table).getByRole("columnheader", { name: "Year" })).toBeInTheDocument()
    expect(within(table).getByRole("columnheader", { name: "Fund Source" })).toBeInTheDocument()
    expect(within(table).getByRole("columnheader", { name: "Date" })).toBeInTheDocument()
    expect(within(table).getByRole("columnheader", { name: "Description" })).toBeInTheDocument()
    expect(within(table).queryByRole("columnheader", { name: /main account/i })).not.toBeInTheDocument()
    expect(within(table).queryByRole("columnheader", { name: /sub account/i })).not.toBeInTheDocument()
    expect(within(table).queryByRole("columnheader", { name: /receipt/i })).not.toBeInTheDocument()

    function rowFor(projectName: string) {
      const row = within(table).getByRole("cell", { name: projectName }).closest("tr")
      expect(row).toBeTruthy()
      return within(row as HTMLElement)
    }

    const general = rowFor("General Bridge")
    expect(general.getByText("General Fund")).toBeInTheDocument()
    expect(general.queryByText("Trust Fund")).not.toBeInTheDocument()
    expect(general.queryByText("Road materials")).not.toBeInTheDocument()
    expect(general.queryByText("OR-1")).not.toBeInTheDocument()
    expect(general.getByText("General release")).toBeInTheDocument()

    const ldf = rowFor("LDF Road")
    expect(ldf.getByText("20% LDF", { exact: true })).toBeInTheDocument()
    expect(ldf.queryByText("20% LDF (Local Development Fund)")).not.toBeInTheDocument()
    expect(ldf.queryByText("General Fund")).not.toBeInTheDocument()
    expect(ldf.queryByText("20% DF")).not.toBeInTheDocument()
    expect(ldf.getByText("LDF release")).toBeInTheDocument()

    const other = rowFor("Other Hall")
    expect(other.getByText("Others: Congressional fund")).toBeInTheDocument()
    expect(other.queryByText("Calamity reserve")).not.toBeInTheDocument()
    expect(other.getByText("Other release")).toBeInTheDocument()

    const blank = rowFor("Blank Other")
    expect(blank.getByText("Others", { exact: true })).toBeInTheDocument()
    expect(blank.queryByText(/^Others:/)).not.toBeInTheDocument()
    expect(blank.queryByText("Special Education Fund")).not.toBeInTheDocument()
    expect(blank.getByText("Blank release")).toBeInTheDocument()

    const legacy = rowFor("Legacy School")
    expect(legacy.getByText("—")).toBeInTheDocument()
    expect(legacy.queryByText("Special Health Fund")).not.toBeInTheDocument()
    expect(legacy.queryByText("Special Education Fund")).not.toBeInTheDocument()
    expect(legacy.queryByText("Hospital Serv.")).not.toBeInTheDocument()
    expect(legacy.queryByText("OR-9")).not.toBeInTheDocument()
    expect(legacy.getByText("Legacy release")).toBeInTheDocument()
  })

  it("keeps released amount records visible when auxiliary lookups are denied", async () => {
    const user = userEvent.setup()
    store.deniedCollections = [
      "budget_funding_years",
      "budget_fund_main_accounts",
      "budget_fund_sub_accounts",
      "users",
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
        bid_price: 200_000,
      },
    ]
    store.expenses = [
      {
        id: "e1",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 25_000,
        main_account: "General Fund",
        sub_account: "20% DF",
        date: "2026-06-17",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByTestId("budget-spent")).toHaveTextContent("₱25,000")
      expect(screen.getByText(/Amount released\s+₱25,000/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole("tab", { name: /released amount/i }))

    await waitFor(() => {
      expect(screen.getByText("-25,000")).toBeInTheDocument()
    })
  })

  it("renders budget transaction tables through the shared table primitive", async () => {
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
        bid_price: 200_000,
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

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByRole("table")).toHaveAttribute("data-slot", "table")
      expect(screen.getByRole("columnheader", { name: /allocated by/i })).toHaveAttribute(
        "data-slot",
        "table-head"
      )
    })

    await user.click(screen.getByRole("tab", { name: /released amount/i }))
    expect(screen.getByRole("table")).toHaveAttribute("data-slot", "table")
    expect(screen.getByRole("columnheader", { name: "Fund Source" })).toHaveAttribute(
      "data-slot",
      "table-head"
    )
  })

  it("filters allocations and expenses by municipality and scoped barangay", async () => {
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
      {
        id: "a2",
        collectionId: "a",
        collectionName: "budget_allocations",
        project: "p2",
        amount: 50_000,
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
        sub_account: "Road materials",
        date: "2026-06-17",
      },
      {
        id: "e2",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p2",
        amount: 10_000,
        year: 2026,
        main_account: "Special Education Fund",
        sub_account: "School supplies",
        date: "2026-06-17",
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByLabelText(/filter by municipality/i))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByLabelText(/filter by barangay/i))

    expect(await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Centro" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("option", { name: "Centro 01 (Bagumbayan)" }))

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole("tab", { name: /released amount/i }))

    await waitFor(() => {
      expect(screen.getByText("-25,000")).toBeInTheDocument()
      expect(screen.queryByText("-10,000")).not.toBeInTheDocument()
    })
  })

  it("filters budget summaries, allocations, and released amounts by date range", async () => {
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
        bid_price: 500_000,
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
        date: "2026-06-10",
      },
      {
        id: "a2",
        collectionId: "a",
        collectionName: "budget_allocations",
        project: "p1",
        amount: 300_000,
        year: 2026,
        date: "2026-07-10",
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
        sub_account: "Road materials",
        date: "2026-06-12",
      },
      {
        id: "e2",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 150_000,
        year: 2026,
        main_account: "Special Education Fund",
        sub_account: "School supplies",
        date: "2026-07-12",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByTestId("budget-allocated")).toHaveTextContent("₱400,000")
      expect(screen.getByTestId("budget-spent")).toHaveTextContent("₱175,000")
    })

    await chooseDateRange(user, "2026-06-01", "2026-06-30")

    await waitFor(() => {
      expect(screen.getByTestId("budget-allocated")).toHaveTextContent("₱100,000")
      expect(screen.getByTestId("budget-spent")).toHaveTextContent("₱25,000")
      expect(screen.getByText("+100,000")).toBeInTheDocument()
      expect(screen.queryByText("+300,000")).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole("tab", { name: /released amount/i }))

    await waitFor(() => {
      expect(screen.getByText("-25,000")).toBeInTheDocument()
      expect(screen.queryByText("-150,000")).not.toBeInTheDocument()
    })
  })

  it("keeps year on released amounts and drops account columns", async () => {
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
        bid_price: 200_000,
      },
    ]
    store.expenses = [
      {
        id: "e1",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 100_000,
        year: 2026,
        main_account: "Others",
        sub_account: "Calamity reserve",
        date: "2026-06-17",
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByRole("tab", { name: /released amount/i }))

    expect(screen.queryByRole("tab", { name: /^expenses$/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /\+ released amount/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", {
        name: new RegExp(`\\+ ${"record"} ${"expense"}`, "i"),
      })
    ).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole("columnheader", { name: /category/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /funding years/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /fund type/i })).not.toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /^year$/i })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: "Fund Source" })).toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /main account/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /sub account/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /receipt/i })).not.toBeInTheDocument()
      expect(screen.getAllByText("2026").length).toBeGreaterThan(0)
      expect(screen.queryByText("Calamity reserve")).not.toBeInTheDocument()
    })
  })

  it("loads budget year filter options from PocketBase funding years", async () => {
    const user = userEvent.setup()
    store.fundingYears = [
      {
        id: "fy1",
        collectionId: "funding_years",
        collectionName: "budget_funding_years",
        name: "2031",
        active: true,
        sort_order: 1,
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByLabelText(/filter by year/i))

    expect(await screen.findByRole("option", { name: "2031" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "2026" })).not.toBeInTheDocument()
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
        bid_price: 200_000,
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
        role: "Province",
        account_status: "Active",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByText("Ana Santos")).toBeInTheDocument()
      expect(screen.queryByText("u1")).not.toBeInTheDocument()
    })
  })

  it("should resolve Allocated By from expanded user when the users list is forbidden", async () => {
    store.deniedCollections = ["users"]
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 200_000,
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
        allocated_by: "other-allocator",
        expand: {
          allocated_by: {
            id: "other-allocator",
            name: "Other Allocator",
          },
        },
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(store.listOptions.budget_allocations).toEqual({
        expand: "allocated_by",
      })
      expect(screen.getByText("Other Allocator")).toBeInTheDocument()
      expect(screen.queryByText("other-allocator")).not.toBeInTheDocument()
    })
  })

  it.each(["Municipality", "Barangay"] as const)(
    "should show Allocated By name from expand for %s when users list is forbidden",
    async (role) => {
      store.authRecord = {
        id: "current-user",
        email: "current@example.test",
        name: "Current Local Officer",
        role,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        account_status: "Active",
      }
      store.deniedCollections = ["users"]
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
          budget_year: 2026,
          bid_price: 200_000,
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
          allocated_by: "other-allocator",
          expand: {
            allocated_by: {
              id: "other-allocator",
              name: "Other Allocator",
            },
          },
        },
      ]

      render(<BudgetModule />)

      await waitFor(() => {
        expect(screen.getByText("Other Allocator")).toBeInTheDocument()
        expect(screen.queryByText("other-allocator")).not.toBeInTheDocument()
      })
    }
  )

  it("should show Allocated By email from expand when name is empty", async () => {
    store.deniedCollections = ["users"]
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 200_000,
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
        allocated_by: "other-allocator",
        expand: {
          allocated_by: {
            id: "other-allocator",
            email: "allocator@example.test",
          },
        },
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByText("allocator@example.test")).toBeInTheDocument()
      expect(screen.queryByText("other-allocator")).not.toBeInTheDocument()
    })
  })

  it("should keep Super Admin Allocated By names when the users list succeeds", async () => {
    store.authRecord = {
      id: "current-user",
      email: "current@example.test",
      name: "Current Super Admin",
      role: "Super Admin",
      account_status: "Active",
    }
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 200_000,
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
        role: "Province",
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
        bid_price: 200_000,
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
      expect(screen.getByText("Current Province User")).toBeInTheDocument()
      expect(screen.queryByText("current-user")).not.toBeInTheDocument()
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

  it("should cap spend progress at 100 percent and show Over Budget when released exceeds total budget", async () => {
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 100_000,
      },
    ]
    store.expenses = [
      {
        id: "e1",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 150_000,
        year: 2026,
        main_account: "General Fund",
        date: "2026-06-17",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByTestId("budget-total")).toHaveTextContent("₱100,000")
      expect(screen.getByTestId("budget-spent")).toHaveTextContent("₱150,000")
    })

    expect(screen.getAllByText("Over Budget").length).toBeGreaterThan(0)
    expect(screen.getByTestId("budget-remaining")).toHaveTextContent("50,000")

    const spentCard = screen.getByTestId("budget-spent").closest("div")
    expect(
      spentCard?.querySelector("[data-slot=progress-indicator]")
    ).toHaveStyle({ transform: "translateX(-0%)" })

    const breakdown = screen.getByTestId("budget-breakdown")
    expect(breakdown).toHaveTextContent("₱150,000")
    expect(breakdown).toHaveTextContent("Over Budget")
    expect(breakdown.querySelector("[data-slot=progress-indicator]")).toHaveStyle({
      transform: "translateX(-0%)",
    })
  })

  it("should hide Over Budget when released is within total budget", async () => {
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 100_000,
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
        date: "2026-06-17",
      },
    ]

    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByTestId("budget-spent")).toHaveTextContent("₱25,000")
    })

    expect(screen.queryByText("Over Budget")).not.toBeInTheDocument()
    expect(screen.getByTestId("budget-total")).toHaveTextContent("₱100,000")

    const spentCard = screen.getByTestId("budget-spent").closest("div")
    expect(
      spentCard?.querySelector("[data-slot=progress-indicator]")
    ).toHaveStyle({ transform: "translateX(-75%)" })
  })

  it.each(["Province", "Super Admin"] as const)(
    "should hide header + Released Amount for %s and keep the table free of a Released Amount row action",
    async (role) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: "current-user",
        email: "current@example.test",
        name: `Current ${role}`,
        role,
        account_status: "Active",
      }
      seedReleasedAmountTable()

      render(<BudgetModule />)

      await user.click(await screen.findByRole("tab", { name: /released amount/i }))

      await waitFor(() => {
        expect(screen.getByText("Bridge")).toBeInTheDocument()
      })

      expect(screen.queryByTestId("released-amount")).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: /\+ released amount/i })
      ).not.toBeInTheDocument()

      const table = screen.getByRole("table")
      expect(
        within(table).queryByRole("button", { name: /released amount/i })
      ).not.toBeInTheDocument()
      expect(within(table).queryByTestId("released-amount")).not.toBeInTheDocument()
      expect(
        screen.queryByRole("columnheader", { name: /actions/i })
      ).not.toBeInTheDocument()
    }
  )

  it.each(["Municipality", "Barangay"] as const)(
    "should hide header + Released Amount for %s and keep the table free of a Released Amount row action",
    async (role) => {
      const user = userEvent.setup()
      store.authRecord = {
        id: "current-user",
        email: "current@example.test",
        name: "Current Local Officer",
        role,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        account_status: "Active",
      }
      seedReleasedAmountTable()

      render(<BudgetModule />)

      await user.click(await screen.findByRole("tab", { name: /released amount/i }))

      await waitFor(() => {
        expect(screen.getByText("Bridge")).toBeInTheDocument()
      })

      expect(screen.queryByTestId("released-amount")).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: /\+ released amount/i })
      ).not.toBeInTheDocument()

      const table = screen.getByRole("table")
      expect(
        within(table).queryByRole("button", { name: /released amount/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole("columnheader", { name: /actions/i })
      ).not.toBeInTheDocument()
    }
  )
})

describe("budget remaining and released amount writers", () => {
  it("should not write project status from remaining or released amount", () => {
    const source = readFileSync(resolve(__dirname, "budget-module.tsx"), "utf8")

    expect(source).not.toMatch(/collection\(["']projects["']\)\.(update|create)/)
    expect(source).not.toMatch(/\bstatus\s*:/)
  })
})
