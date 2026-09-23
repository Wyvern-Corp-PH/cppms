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

  async function fillAllocationForm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByTestId("allocate-budget"))
    await user.click((await screen.findAllByRole("combobox"))[0]!)
    await user.click(await screen.findByRole("option", { name: "Bridge" }))
    await user.clear(screen.getByLabelText(/total allocated budget amount/i))
    await user.type(screen.getByLabelText(/total allocated budget amount/i), "100000")
    await user.type(screen.getByLabelText(/^description$/i), "FY2026 allocation")
    await user.upload(screen.getByTestId("document-upload-input-allocation-moa"), [
      new File(["moa"], "moa.pdf", { type: "application/pdf" }),
    ])
    await user.upload(
      screen.getByTestId("document-upload-input-allocation-resolution"),
      [new File(["res"], "res.pdf", { type: "application/pdf" })]
    )
    await user.upload(
      screen.getByTestId("document-upload-input-allocation-supporting"),
      [new File(["sup"], "sup.pdf", { type: "application/pdf" })]
    )
  }

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

  it("should show allocator full name after allocate when users list includes the actor", async () => {
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
    store.users = [
      {
        id: "current-user",
        collectionId: "users",
        collectionName: "users",
        email: "current@example.test",
        name: "Current Province User",
        role: "Province",
        account_status: "Active",
      },
    ]
    createMock.mockImplementation(async (payload: FormData | Record<string, unknown>) => {
      const row: Record<string, unknown> = {
        id: "a-new",
        collectionId: "a",
        collectionName: "budget_allocations",
      }
      if (payload instanceof FormData) {
        for (const [key, value] of payload.entries()) {
          if (value instanceof File) continue
          row[key] = value
        }
      } else {
        Object.assign(row, payload)
      }
      store.allocations.push(row)
    })

    render(<BudgetModule />)

    await fillAllocationForm(user)
    await user.click(screen.getByRole("button", { name: /^allocate budget$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalled()
      const payload = createMock.mock.calls[0]?.[0]
      expect(payload).toBeInstanceOf(FormData)
      expect((payload as FormData).get("allocated_by")).toBe("current-user")
      expect(screen.getByText("Current Province User")).toBeInTheDocument()
      expect(screen.queryByText("current-user")).not.toBeInTheDocument()
    })
  })

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
        bid_price: 200_000,
      },
    ]

    render(<BudgetModule />)

    await fillAllocationForm(user)
    await user.click(screen.getByRole("button", { name: /^allocate budget$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalled()
    })
    const payload = createMock.mock.calls[0]?.[0]
    expect(payload).toBeInstanceOf(FormData)
    expect((payload as FormData).get("project")).toBe("p1")
    expect((payload as FormData).get("amount")).toBe("100000")
    expect((payload as FormData).get("description")).toBe("FY2026 allocation")
    expect((payload as FormData).get("allocated_by")).toBe("current-user")
    expect((payload as FormData).getAll("moa_file")).toHaveLength(1)
    expect((payload as FormData).getAll("resolution_file")).toHaveLength(1)
    expect((payload as FormData).getAll("supporting_docs")).toHaveLength(1)
  })

  it("should block allocate save when the amount would exceed the project's bid price", async () => {
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
        bid_price: 100_000,
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
        date: "2026-06-17",
      },
    ]

    render(<BudgetModule />)

    await fillAllocationForm(user)
    await user.click(screen.getByRole("button", { name: /^allocate budget$/i }))

    expect(
      await screen.findByText("Allocation amount exceeds the project's bid price.")
    ).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
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
        bid_price: 200_000,
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByTestId("allocate-budget"))
    await user.click((await screen.findAllByRole("combobox"))[0]!)
    await user.click(await screen.findByRole("option", { name: "Bridge" }))
    await user.clear(screen.getByLabelText(/total allocated budget amount/i))
    await user.type(screen.getByLabelText(/total allocated budget amount/i), "100000")
    await user.type(screen.getByLabelText(/^description$/i), "FY2026 allocation")
    await user.upload(screen.getByTestId("document-upload-input-allocation-moa"), [
      new File(["moa"], "moa.pdf", { type: "application/pdf" }),
      new File(["moa 2"], "moa-2.pdf", { type: "application/pdf" }),
    ])
    await user.upload(
      screen.getByTestId("document-upload-input-allocation-resolution"),
      [new File(["res"], "res.pdf", { type: "application/pdf" })]
    )
    await user.upload(
      screen.getByTestId("document-upload-input-allocation-supporting"),
      [new File(["sup"], "sup.pdf", { type: "application/pdf" })]
    )
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

  it("should show field errors when allocation description and documents are missing", async () => {
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

    render(<BudgetModule />)

    await user.click(await screen.findByTestId("allocate-budget"))
    await user.click((await screen.findAllByRole("combobox"))[0]!)
    await user.click(await screen.findByRole("option", { name: "Bridge" }))
    await user.clear(screen.getByLabelText(/total allocated budget amount/i))
    await user.type(screen.getByLabelText(/total allocated budget amount/i), "100000")
    await user.click(screen.getByRole("button", { name: /^allocate budget$/i }))

    expect(await screen.findByText("Description is required.")).toBeInTheDocument()
    expect(screen.getByText("MOA document is required.")).toBeInTheDocument()
    expect(screen.getByText("Resolution document is required.")).toBeInTheDocument()
    expect(
      screen.getByText("Supporting documents are required.")
    ).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  it("should show a required mark on allocate budget controls", async () => {
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

    render(<BudgetModule />)

    await user.click(await screen.findByTestId("allocate-budget"))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Project").closest("[data-slot=field-label]")).toHaveAttribute(
      "data-required",
      "true"
    )
    expect(
      within(dialog).getByText("Total allocated budget amount").closest("[data-slot=field-label]")
    ).toHaveAttribute("data-required", "true")
    expect(within(dialog).getByText("Year").closest("[data-slot=field-label]")).toHaveAttribute(
      "data-required",
      "true"
    )
    expect(within(dialog).getByText("Description").closest("[data-slot=field-label]")).toHaveAttribute(
      "data-required",
      "true"
    )
    expect(
      within(dialog).getByText("Memorandum of Agreement").closest("[data-slot=field-label]")
    ).toHaveAttribute("data-required", "true")
    expect(within(dialog).getByText("Resolution").closest("[data-slot=field-label]")).toHaveAttribute(
      "data-required",
      "true"
    )
    expect(
      within(dialog).getByText("Supporting project documents").closest("[data-slot=field-label]")
    ).toHaveAttribute("data-required", "true")
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
      expect(screen.queryByRole("columnheader", { name: /fund source/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /funding years/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("columnheader", { name: /fund type/i })).not.toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /^year$/i })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /main account/i })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /sub account/i })).toBeInTheDocument()
      expect(screen.getAllByText("2026").length).toBeGreaterThan(0)
      expect(screen.getByText("Calamity reserve")).toBeInTheDocument()
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
        contractor: "Build Co",
        bid_price: 200_000,
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
      },
      {
        id: "p2",
        collectionId: "p",
        collectionName: "projects",
        name: "Finished Road",
        category: "Infrastructure",
        status: "Completed",
        budget_year: 2026,
        bid_price: 100_000,
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

  it("should hide incomplete LGU-detail projects from allocate select", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        name: "Ready Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        contractor: "Build Co",
        bid_price: 200_000,
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
      },
      {
        id: "p2",
        collectionId: "p",
        collectionName: "projects",
        name: "Incomplete Road",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        contractor: "",
        bid_price: 200_000,
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
      },
    ]

    render(<BudgetModule />)

    await user.click(await screen.findByTestId("allocate-budget"))
    await user.click((await screen.findAllByRole("combobox"))[0]!)

    expect(
      await screen.findByRole("option", { name: "Ready Bridge" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Incomplete Road" })
    ).not.toBeInTheDocument()
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
