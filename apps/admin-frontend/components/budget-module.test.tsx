import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  allocations: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
  authRecord: {
    id: "current-user",
    email: "current@example.test",
    name: "Current Province User",
    role: "Province",
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
        if (name === "locations") return store.locations
        if (name === "users") return store.users
        return []
      }),
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
    store.users = []
    store.authRecord = {
      id: "current-user",
      email: "current@example.test",
      name: "Current Province User",
      role: "Province",
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
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
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
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
        date: "2026-06-17",
      },
      {
        id: "e2",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p2",
        amount: 10_000,
        fund_source: "National Grant",
        funding_years: "2026",
        fund_type: "National",
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

    await user.click(screen.getByRole("tab", { name: /expenses/i }))

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
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
        date: "2026-06-12",
      },
      {
        id: "e2",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 150_000,
        fund_source: "National Grant",
        funding_years: "2026",
        fund_type: "National",
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

    await user.click(screen.getByRole("tab", { name: /expenses/i }))

    await waitFor(() => {
      expect(screen.getByText("-25,000")).toBeInTheDocument()
      expect(screen.queryByText("-150,000")).not.toBeInTheDocument()
    })
  })

  it("uses Released Amount fund source fields instead of expense category", async () => {
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
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Other",
        fund_type_other: "Calamity reserve",
        date: "2026-06-17",
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByRole("tab", { name: /expenses/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ released amount/i })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /\+ record expense/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /category/i })).not.toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /fund source/i })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /funding years/i })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /fund type/i })).toBeInTheDocument()
      expect(screen.getByText("General Fund")).toBeInTheDocument()
      expect(screen.getAllByText("2026").length).toBeGreaterThan(0)
      expect(screen.getByText("Calamity reserve")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /\+ released amount/i }))

    expect(screen.getAllByText("Fund Source").length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/^fund source$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/funding years/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^fund type$/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/other fund type/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/^fund type$/i))
    await user.click(await screen.findByRole("option", { name: "Other" }))

    expect(screen.getByLabelText(/other fund type/i)).toBeInTheDocument()
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

    await user.click(await screen.findByRole("tab", { name: /expenses/i }))
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
})
