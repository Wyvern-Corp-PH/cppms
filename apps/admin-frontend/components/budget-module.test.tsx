import { render, screen, waitFor } from "@testing-library/react"
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
      getFullList: vi.fn(async () => {
        if (store.deniedCollections.includes(name)) {
          throw new Error("Only superusers can perform this action.")
        }
        if (name === "projects") return store.projects
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
    store.authRecord = {
      id: "current-user",
      email: "current@example.test",
      name: "Current Province User",
      role: "Province",
      account_status: "Active",
    }
    createMock.mockClear()
  })

  async function fillAllocationForm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByTestId("allocate-budget"))
    await user.click((await screen.findAllByRole("combobox"))[0]!)
    await user.click(await screen.findByRole("option", { name: "Bridge" }))
    await user.clear(screen.getByLabelText(/total allocated budget amount/i))
    await user.type(screen.getByLabelText(/total allocated budget amount/i), "100000")
  }

  it("creates allocation payloads with the current auth user", async () => {
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

    render(<BudgetModule />)

    await fillAllocationForm(user)
    await user.click(screen.getByRole("button", { name: /^allocate budget$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "p1",
          amount: 100000,
          allocated_by: "current-user",
        })
      )
    })
  })

  it("creates allocation FormData uploads with the current auth user", async () => {
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

    render(<BudgetModule />)

    await fillAllocationForm(user)
    await user.upload(screen.getByTestId("document-upload-input-allocation-moa"), [
      new File(["moa"], "moa.pdf", { type: "application/pdf" }),
      new File(["moa 2"], "moa-2.pdf", { type: "application/pdf" }),
    ])
    await user.click(screen.getByRole("button", { name: /^allocate budget$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalled()
    })
    const payload = createMock.mock.calls[0]?.[0]
    expect(payload).toBeInstanceOf(FormData)
    expect((payload as FormData).get("project")).toBe("p1")
    expect((payload as FormData).get("amount")).toBe("100000")
    expect((payload as FormData).get("allocated_by")).toBe("current-user")
    expect((payload as FormData).getAll("moa_file")).toHaveLength(2)
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
        total_budget: 200_000,
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

  it("shows the canonical sub account for legacy General Fund releases with a blank child value", async () => {
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
    store.expenses = [
      {
        id: "e1",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 25_000,
        year: 2026,
        main_account: "General Fund",
        sub_account: "",
        date: "2026-06-17",
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByRole("tab", { name: /released amount/i }))

    expect(await screen.findByText("GF - Proper")).toBeInTheDocument()
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
        total_budget: 200_000,
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
    expect(screen.getByRole("columnheader", { name: /main account/i })).toHaveAttribute(
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
        total_budget: 200_000,
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
        total_budget: 500_000,
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

  it("uses Released Amount year, main account, and sub account fields", async () => {
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

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ released amount/i })).toBeInTheDocument()
      expect(
        screen.queryByRole("button", {
          name: new RegExp(`\\+ ${"record"} ${"expense"}`, "i"),
        })
      ).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /category/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /fund source/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /funding years/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /fund type/i })).not.toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /^year$/i })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /main account/i })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /sub account/i })).toBeInTheDocument()
      expect(screen.getAllByText("2026").length).toBeGreaterThan(0)
      expect(screen.getByText("Calamity reserve")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /\+ released amount/i }))

    expect(screen.getAllByText("Fund Source").length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/^fund source$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/funding years/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^fund type$/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^year$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/main account/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/sub account/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/main account/i))
    expect(await screen.findByRole("option", { name: "General Fund" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Special Education Fund" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Special Health Fund" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Trust Fund" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Others" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /^Other$/ })).not.toBeInTheDocument()
    await user.click(await screen.findByRole("option", { name: "Others" }))

    expect(screen.queryByLabelText(/sub account/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/other/i)).toBeInTheDocument()
  })

  it("creates released amount payload with fund source fields only", async () => {
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
        date: "2026-01-01",
      },
    ]
    store.fundingYears = [
      {
        id: "fy1",
        collectionId: "funding_years",
        collectionName: "budget_funding_years",
        name: "2027",
        active: true,
        sort_order: 1,
      },
    ]
    store.fundMainAccounts = [
      {
        id: "ma1",
        collectionId: "fund_main_accounts",
        collectionName: "budget_fund_main_accounts",
        name: "General Fund",
        active: true,
        sort_order: 1,
      },
    ]
    store.fundSubAccounts = [
      {
        id: "sa1",
        collectionId: "fund_sub_accounts",
        collectionName: "budget_fund_sub_accounts",
        main_account: "General Fund",
        name: "20% DF",
        active: true,
        sort_order: 1,
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByRole("tab", { name: /released amount/i }))
    await user.click(await screen.findByTestId("released-amount"))
    await user.click(screen.getByLabelText(/expense project/i))
    await user.click(await screen.findByRole("option", { name: "Bridge" }))
    await user.clear(screen.getByLabelText(/^amount \(php\)$/i))
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "25000")
    await user.click(screen.getByLabelText(/^year$/i))
    await user.click(await screen.findByRole("option", { name: "2027" }))
    await user.click(screen.getByLabelText(/main account/i))
    await user.click(await screen.findByRole("option", { name: "General Fund" }))
    await user.click(screen.getByLabelText(/sub account/i))
    await user.click(await screen.findByRole("option", { name: "20% DF" }))
    await user.type(screen.getByLabelText(/receipt number/i), "OR-100")
    await user.click(screen.getByRole("button", { name: /^released amount$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({
        project: "p1",
        amount: 25000,
        year: 2027,
        main_account: "General Fund",
        sub_account: "20% DF",
        date: expect.any(String),
        receipt_number: "OR-100",
      })
    })

    const payload = createMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload).not.toHaveProperty("category")
    expect(payload).not.toHaveProperty("fund_source")
    expect(payload).not.toHaveProperty("fund_type")
    expect(payload).not.toHaveProperty("funding_years")
  })

  it("requires sub account before creating General Fund released amounts", async () => {
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

    render(<BudgetModule />)

    await user.click(await screen.findByRole("tab", { name: /released amount/i }))
    await user.click(await screen.findByTestId("released-amount"))
    await user.click(screen.getByLabelText(/expense project/i))
    await user.click(await screen.findByRole("option", { name: "Bridge" }))
    await user.clear(screen.getByLabelText(/^amount \(php\)$/i))
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "25000")
    await user.click(screen.getByLabelText(/main account/i))
    await user.click(await screen.findByRole("option", { name: "General Fund" }))
    await user.click(screen.getByRole("button", { name: /^released amount$/i }))

    expect(await screen.findByText("Sub account is required.")).toHaveAttribute(
      "data-slot",
      "field-error"
    )
    expect(createMock).not.toHaveBeenCalled()
  })

  it("renders released amount validation with Field primitives", async () => {
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

    render(<BudgetModule />)

    await user.click(await screen.findByRole("tab", { name: /released amount/i }))
    await user.click(await screen.findByTestId("released-amount"))
    await user.click(screen.getByRole("button", { name: /^released amount$/i }))

    expect(await screen.findByText("Project is required.")).toHaveAttribute(
      "data-slot",
      "field-error"
    )
    expect(screen.getByText("Amount must be greater than zero.")).toHaveAttribute(
      "data-slot",
      "field-error"
    )
    expect(screen.getByText("Main account is required.")).toHaveAttribute(
      "data-slot",
      "field-error"
    )
    expect(screen.getByLabelText(/^amount \(php\)$/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(screen.getAllByRole("group").some((node) => node.getAttribute("data-slot") === "field")).toBe(
      true
    )
    expect(createMock).not.toHaveBeenCalled()
  })

  it("loads released amount fund source dropdown options from PocketBase collections", async () => {
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
    store.fundingYears = [
      {
        id: "fy1",
        collectionId: "funding_years",
        collectionName: "budget_funding_years",
        name: "2027",
        active: true,
        sort_order: 1,
      },
    ]
    store.fundMainAccounts = [
      {
        id: "ft1",
        collectionId: "fund_main_accounts",
        collectionName: "budget_fund_main_accounts",
        name: "Special Education Fund",
        active: true,
        sort_order: 1,
      },
      {
        id: "ft2",
        collectionId: "fund_main_accounts",
        collectionName: "budget_fund_main_accounts",
        name: "Other",
        active: true,
        sort_order: 2,
      },
    ]
    store.fundSubAccounts = [
      {
        id: "sa1",
        collectionId: "fund_sub_accounts",
        collectionName: "budget_fund_sub_accounts",
        main_account: "Special Education Fund",
        name: "PB SEF Program",
        active: true,
        sort_order: 1,
      },
      {
        id: "sa2",
        collectionId: "fund_sub_accounts",
        collectionName: "budget_fund_sub_accounts",
        main_account: "General Fund",
        name: "PB General Program",
        active: true,
        sort_order: 1,
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByRole("tab", { name: /released amount/i }))
    await user.click(await screen.findByTestId("released-amount"))

    await user.click(screen.getByLabelText(/^year$/i))
    expect(await screen.findByRole("option", { name: "2027" })).toBeInTheDocument()

    await user.keyboard("{Escape}")
    await user.click(screen.getByLabelText(/main account/i))
    expect(await screen.findByRole("option", { name: "Special Education Fund" })).toBeInTheDocument()
    await user.click(await screen.findByRole("option", { name: "Special Education Fund" }))

    expect(screen.queryByLabelText(/sub account/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/main account/i))
    expect(await screen.findByRole("option", { name: "Others" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /^Other$/ })).not.toBeInTheDocument()
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
      expect(screen.getByText("Current Province User")).toBeInTheDocument()
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

  it("keeps allocate budget content responsive at zoomed viewports", async () => {
    const user = userEvent.setup()
    render(<BudgetModule />)

    await user.click(await screen.findByTestId("allocate-budget"))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveClass("w-[calc(100vw-2rem)]")
    expect(dialog.className).toContain("max-h-[calc(100dvh-2rem)]")
    expect(dialog).toHaveClass("overflow-y-auto")
    expect(dialog).toHaveClass("sm:max-w-lg")
  })

  it("keeps released amount content responsive at zoomed viewports", async () => {
    const user = userEvent.setup()
    render(<BudgetModule />)

    await user.click(await screen.findByRole("tab", { name: /released amount/i }))
    await user.click(await screen.findByTestId("released-amount"))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveClass("w-[calc(100vw-2rem)]")
    expect(dialog.className).toContain("max-h-[calc(100dvh-2rem)]")
    expect(dialog).toHaveClass("overflow-y-auto")
    expect(dialog).toHaveClass("sm:max-w-lg")
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

  it("should omit Completed projects from Allocate Budget options", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Active Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        total_budget: 200_000,
      },
      {
        id: "p2",
        collectionId: "p",
        collectionName: "projects",
        name: "Finished Road",
        category: "Infrastructure",
        status: "Completed",
        budget_year: 2026,
        total_budget: 100_000,
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByTestId("allocate-budget"))
    await user.click((await screen.findAllByRole("combobox"))[0]!)

    expect(
      await screen.findByRole("option", { name: "Active Bridge" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Finished Road" })
    ).not.toBeInTheDocument()
  })

  it("should reject released amount create that exceeds allocated budget", async () => {
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
        amount: 50_000,
        year: 2026,
        date: "2026-01-01",
      },
    ]
    store.expenses = [
      {
        id: "e1",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 40_000,
        year: 2026,
        main_account: "Special Education Fund",
        date: "2026-06-01",
      },
    ]
    store.fundMainAccounts = [
      {
        id: "ma1",
        collectionId: "fund_main_accounts",
        collectionName: "budget_fund_main_accounts",
        name: "Special Education Fund",
        active: true,
        sort_order: 1,
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByRole("tab", { name: /released amount/i }))
    await user.click(await screen.findByTestId("released-amount"))
    await user.click(screen.getByLabelText(/expense project/i))
    await user.click(await screen.findByRole("option", { name: "Bridge" }))
    await user.clear(screen.getByLabelText(/^amount \(php\)$/i))
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "15000")
    await user.click(screen.getByLabelText(/main account/i))
    await user.click(
      await screen.findByRole("option", { name: "Special Education Fund" })
    )
    await user.click(screen.getByRole("button", { name: /^released amount$/i }))

    expect(
      await screen.findByText(
        "Released amount cannot exceed the allocated budget."
      )
    ).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })
})
