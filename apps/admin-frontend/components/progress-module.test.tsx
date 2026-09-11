import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  /** null = synthesize generous fixtures; [] = zero allocations for cap tests */
  allocations: null as Array<Record<string, unknown>> | null,
  locations: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
  deniedCollections: [] as string[],
  listOptions: {} as Record<string, unknown>,
  fundingYears: [] as Array<Record<string, unknown>>,
  mainAccounts: [] as Array<Record<string, unknown>>,
  subAccounts: [] as Array<Record<string, unknown>>,
  authRecord: {
    id: "current-user",
    email: "current@example.test",
    name: "Current Province User",
    role: "Province",
    account_status: "Active",
  } as Record<string, unknown> | null,
}

const createMock = vi.fn()
const projectUpdateMock = vi.fn()
const progressUpdateMock = vi.fn()
const expenseCreateMock = vi.fn()
const expenseUpdateMock = vi.fn()
const expenseGetFirstListItemMock = vi.fn()
const deleteMock = vi.fn()

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: store.authRecord,
    },
    collection: (name: string) => ({
      getFirstListItem: (filter: string) => {
        if (name === "budget_expenses") {
          return expenseGetFirstListItemMock(filter)
        }
        return Promise.reject(new Error(`Missing getFirstListItem for ${name}`))
      },
      getFullList: vi.fn(async (options?: unknown) => {
        store.listOptions[name] = options
        if (store.deniedCollections.includes(name)) {
          throw new Error("Only superusers can perform this action.")
        }
        if (name === "projects") return store.projects
        if (name === "progress_updates") return store.updates
        if (name === "budget_expenses") return store.expenses
        if (name === "budget_allocations") {
          if (store.allocations !== null) return store.allocations
          // Default headroom so existing release-sync tests stay focused on their seams.
          return store.projects.map((project, index) => ({
            id: `alloc-default-${index}`,
            collectionId: "a",
            collectionName: "budget_allocations",
            project: project.id,
            amount: 10_000_000,
            year: 2026,
            date: "2026-01-01",
          }))
        }
        if (name === "locations") return store.locations
        if (name === "users") return store.users
        if (name === "budget_funding_years") return store.fundingYears
        if (name === "budget_fund_main_accounts") return store.mainAccounts
        if (name === "budget_fund_sub_accounts") return store.subAccounts
        return []
      }),
      create: (payload: unknown) => {
        if (name === "budget_expenses") {
          return expenseCreateMock(payload)
        }
        return createMock(payload)
      },
      update: (id: string, payload: unknown, options?: unknown) => {
        if (name === "progress_updates") {
          return options === undefined
            ? progressUpdateMock(id, payload)
            : progressUpdateMock(id, payload, options)
        }
        if (name === "budget_expenses") {
          return options === undefined
            ? expenseUpdateMock(id, payload)
            : expenseUpdateMock(id, payload, options)
        }
        return options === undefined
          ? projectUpdateMock(id, payload)
          : projectUpdateMock(id, payload, options)
      },
      delete: deleteMock,
    }),
  }),
}))

import { ProgressModule } from "./progress-module"

async function chooseDateRange(user: ReturnType<typeof userEvent.setup>, from: string, to: string) {
  await user.click(screen.getByRole("button", { name: /pick date range/i }))
  await user.type(screen.getByLabelText(/from date/i), from)
  await user.type(screen.getByLabelText(/to date/i), to)
}

describe("ProgressModule (V81, V84)", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_POCKETBASE_URL = "http://pb.test"
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
    store.updates = []
    store.expenses = []
    store.allocations = null
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
    store.fundingYears = [
      {
        id: "fy1",
        collectionId: "budget_funding_years",
        collectionName: "budget_funding_years",
        name: "2026",
        active: true,
        sort_order: 1,
      },
    ]
    store.mainAccounts = [
      {
        id: "ma1",
        collectionId: "budget_fund_main_accounts",
        collectionName: "budget_fund_main_accounts",
        name: "General Fund",
        active: true,
        sort_order: 1,
      },
    ]
    store.subAccounts = [
      {
        id: "sa1",
        collectionId: "budget_fund_sub_accounts",
        collectionName: "budget_fund_sub_accounts",
        name: "GF - Proper",
        main_account: "General Fund",
        active: true,
        sort_order: 1,
      },
    ]
    store.authRecord = {
      id: "current-user",
      email: "current@example.test",
      name: "Current Province User",
      role: "Province",
      account_status: "Active",
    }
    createMock.mockReset().mockResolvedValue({
      id: "pu-new",
      collectionId: "updates",
      collectionName: "progress_updates",
    })
    projectUpdateMock.mockReset().mockResolvedValue({})
    progressUpdateMock.mockReset().mockResolvedValue({})
    expenseCreateMock.mockReset().mockResolvedValue({})
    expenseUpdateMock.mockReset().mockResolvedValue({})
    expenseGetFirstListItemMock.mockReset().mockImplementation(async (filter: string) => {
      const progressUpdateId = /progress_update="([^"]+)"/.exec(filter)?.[1]
      const row = store.expenses.find(
        (expense) => expense.progress_update === progressUpdateId
      )
      if (!row) {
        throw Object.assign(new Error("The requested resource wasn't found."), {
          status: 404,
        })
      }
      return row
    })
    deleteMock.mockReset().mockResolvedValue({})
  })

  function makeFile(name: string, type = "application/pdf") {
    return new File(["content"], name, { type })
  }

  async function uploadRequiredCompletionDocs(user: ReturnType<typeof userEvent.setup>) {
    await user.upload(
      screen.getByTestId("document-upload-input-completion-certification_completion"),
      makeFile("certification.pdf")
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-certificate_acceptance"),
      makeFile("acceptance.pdf")
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-proof_payment_barangay"),
      makeFile("payment.pdf")
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-acknowledgment_completion"),
      makeFile("acknowledgment.pdf")
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-audit_documents"),
      makeFile("audit.pdf")
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-verification_documents"),
      makeFile("verification.pdf")
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-liquidation_documents"),
      makeFile("liquidation.pdf")
    )
  }

  const barangayScope = {
    municipality: "Tuguegarao City",
    barangay: "Centro 01 (Bagumbayan)",
  }

  function useBarangayActor() {
    store.authRecord = {
      id: "barangay-user",
      email: "barangay@example.test",
      name: "Current Barangay User",
      role: "Barangay",
      account_status: "Active",
      ...barangayScope,
    }
  }

  function useMunicipalityActor() {
    store.authRecord = {
      id: "municipality-user",
      email: "municipality@example.test",
      name: "Current Municipality User",
      role: "Municipality",
      account_status: "Active",
      municipality: "Tuguegarao City",
    }
  }

  async function fillRequiredReleasedAmount(
    user: ReturnType<typeof userEvent.setup>
  ) {
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "1500")
    await user.type(screen.getByLabelText(/^receipt number$/i), "OR-1500")
    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(screen.getByRole("option", { name: "General Fund" }))
    await user.click(screen.getByLabelText(/^sub account$/i))
    await user.click(screen.getByRole("option", { name: "GF - Proper" }))
    await user.type(screen.getByLabelText(/^description$/i), "Release for progress")
  }

  function useSuperAdminActor() {
    store.authRecord = {
      id: "super-admin-user",
      email: "super@example.test",
      name: "Current Super Admin User",
      role: "Super Admin",
      account_status: "Active",
    }
  }

  it("shows drag-and-drop site photo upload in update modal", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]
    store.updates = []

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /update progress/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/click to upload or drag files here/i)
      ).toBeInTheDocument()
    })
  })

  it("should accept the shared document types on site photo and omit webp", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]
    store.updates = []

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /update progress/i }))

    expect(
      await screen.findByTestId("document-upload-input-site-photo")
    ).toHaveAttribute("accept", ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png")
    expect(screen.queryByText(/webp/i)).not.toBeInTheDocument()
  })

  it("shows four progress summary cards", async () => {
    store.projects = []
    store.updates = []

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByTestId("progress-active")).toBeInTheDocument()
      expect(screen.getByTestId("progress-on-track")).toBeInTheDocument()
      expect(screen.getByTestId("progress-needs-attention")).toBeInTheDocument()
      expect(screen.getByTestId("progress-updates-today")).toBeInTheDocument()
    })
  })

  it("counts For Revision projects as active progress work", async () => {
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Revision Bridge",
        category: "Infrastructure",
        status: "For Revision",
        budget_year: 2026,
        progress_pct: 100,
      },
    ]

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("Revision Bridge")).toBeInTheDocument()
      expect(screen.getByTestId("progress-active")).toHaveTextContent("1")
    })
  })

  it("filters progress rows by municipality and scoped barangay", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        progress_pct: 75,
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ongoing",
        municipality: "Lasam",
        barangay: "Centro",
        budget_year: 2026,
        progress_pct: 40,
      },
    ]

    render(<ProgressModule />)

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
  })

  it("filters the progress list by search as the user types", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        progress_pct: 75,
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ongoing",
        municipality: "Lasam",
        barangay: "Centro",
        budget_year: 2026,
        progress_pct: 40,
      },
    ]

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.getByText("Lasam School")).toBeInTheDocument()
    })

    const search = screen.getByLabelText(/search projects/i)
    expect(search).toHaveAttribute("placeholder", "Search by name")

    await user.type(search, "Bridge")
    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
    })

    await user.clear(search)
    await waitFor(() => {
      expect(screen.getByText("Lasam School")).toBeInTheDocument()
    })
  })

  it("matches progress search against the Projects Module haystack fields", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        description: "East bank rehab",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        location: "Bridge approach",
        contractor: "Acme Builders",
        budget_year: 2026,
        progress_pct: 75,
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        description: "Classroom repair",
        category: "Education",
        status: "Ongoing",
        municipality: "Lasam",
        barangay: "Centro",
        location: "Municipal hall grounds",
        contractor: "North Builders",
        budget_year: 2026,
        progress_pct: 40,
      },
    ]

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.getByText("Lasam School")).toBeInTheDocument()
    })

    const search = screen.getByLabelText(/search projects/i)

    await user.type(search, "Acme")
    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
    })

    await user.clear(search)
    await user.type(search, "Classroom")
    await waitFor(() => {
      expect(screen.getByText("Lasam School")).toBeInTheDocument()
      expect(screen.queryByText("City Bridge")).not.toBeInTheDocument()
    })

    await user.clear(search)
    await user.type(search, "hall grounds")
    await waitFor(() => {
      expect(screen.getByText("Lasam School")).toBeInTheDocument()
      expect(screen.queryByText("City Bridge")).not.toBeInTheDocument()
    })
  })

  it("restores the scoped list when the search query is only whitespace", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        budget_year: 2026,
        progress_pct: 75,
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ongoing",
        municipality: "Lasam",
        budget_year: 2026,
        progress_pct: 40,
      },
    ]

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.getByText("Lasam School")).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/search projects/i), "   ")

    expect(screen.getByText("City Bridge")).toBeInTheDocument()
    expect(screen.getByText("Lasam School")).toBeInTheDocument()
  })

  it("composes search with municipality and date filters without hiding history percent filters", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        progress_pct: 30,
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City School",
        category: "Education",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        progress_pct: 60,
      },
      {
        id: "3",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Lasam",
        barangay: "Centro",
        budget_year: 2026,
        progress_pct: 40,
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-06-12 00:00:00.000Z",
        project: "1",
        from_pct: 20,
        to_pct: 30,
        notes: "june band",
      },
      {
        id: "u2",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-07-12 00:00:00.000Z",
        project: "2",
        from_pct: 40,
        to_pct: 60,
        notes: "july band",
      },
      {
        id: "u3",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-06-15 00:00:00.000Z",
        project: "3",
        from_pct: 10,
        to_pct: 40,
        notes: "lasam band",
      },
    ]

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.getByText("City School")).toBeInTheDocument()
      expect(screen.getByText("Lasam Bridge")).toBeInTheDocument()
    })

    await user.click(await screen.findByLabelText(/filter by municipality/i))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await chooseDateRange(user, "2026-06-01", "2026-06-30")

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("City School")).not.toBeInTheDocument()
      expect(screen.queryByText("Lasam Bridge")).not.toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/search projects/i), "School")
    await waitFor(() => {
      expect(screen.queryByText("City Bridge")).not.toBeInTheDocument()
      expect(screen.queryByText("City School")).not.toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText(/search projects/i))
    await user.type(screen.getByLabelText(/search projects/i), "Bridge")
    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Lasam Bridge")).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /view details/i }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText(/^from %$/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^to %$/i)).toBeInTheDocument()
    expect(within(dialog).getByText("june band")).toBeInTheDocument()
  })

  it("does not reveal out-of-scope projects when searching", async () => {
    const user = userEvent.setup()
    useMunicipalityActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        contractor: "Acme Builders",
        budget_year: 2026,
        progress_pct: 75,
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ongoing",
        municipality: "Lasam",
        barangay: "Centro",
        contractor: "North Builders",
        budget_year: 2026,
        progress_pct: 40,
      },
    ]

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
    })
    expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/search projects/i), "Lasam")
    expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
    expect(screen.queryByText("City Bridge")).not.toBeInTheDocument()
  })

  it("filters progress rows and summaries by progress update date range", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 30,
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 60,
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-06-12 00:00:00.000Z",
        project: "1",
        from_pct: 20,
        to_pct: 30,
        site_photo: "city.jpg",
      },
      {
        id: "u2",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-07-12 00:00:00.000Z",
        project: "2",
        from_pct: 40,
        to_pct: 60,
        site_photo: "lasam.jpg",
      },
    ]

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.getByText("Lasam School")).toBeInTheDocument()
    })

    await chooseDateRange(user, "2026-06-01", "2026-06-30")

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
      expect(screen.getByTestId("progress-active")).toHaveTextContent("1")
      expect(screen.getByTestId("progress-on-track")).toHaveTextContent("0")
    })
  })

  it("filters Progress Update History by custom From%/To% on the detail panel and dialog", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        progress_pct: 90,
      },
    ]
    store.updates = [
      {
        id: "u-late",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-07-12 00:00:00.000Z",
        project: "1",
        from_pct: 78,
        to_pct: 90,
        notes: "late band",
      },
      {
        id: "u-mid",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-06-12 00:00:00.000Z",
        project: "1",
        from_pct: 70,
        to_pct: 78,
        notes: "mid band",
      },
      {
        id: "u-early",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-05-12 00:00:00.000Z",
        project: "1",
        from_pct: 90,
        to_pct: 70,
        notes: "early band",
      },
    ]

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/^from %$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^to %$/i)).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(/filter by progress range/i)
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText(/filter by municipality/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /pick date range/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /view details/i }))

    const dialog = await screen.findByRole("dialog")
    const panel = screen.getByTestId("progress-detail-panel")
    const dialogFrom = within(dialog).getByLabelText(/^from %$/i)
    const dialogTo = within(dialog).getByLabelText(/^to %$/i)
    const panelFrom = within(panel).getByLabelText(/^from %$/i, {
      hidden: true,
    })
    const panelTo = within(panel).getByLabelText(/^to %$/i, { hidden: true })

    expect(dialogFrom).toBeInTheDocument()
    expect(dialogTo).toBeInTheDocument()
    expect(panelFrom).toBeInTheDocument()
    expect(panelTo).toBeInTheDocument()
    expect(
      within(dialog).queryByLabelText(/filter by progress range/i)
    ).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole("option", { name: /0–75%|76–80%|81–100%/i })
    ).not.toBeInTheDocument()

    expect(within(dialog).getByText("early band")).toBeInTheDocument()
    expect(within(dialog).getByText("mid band")).toBeInTheDocument()
    expect(within(dialog).getByText("late band")).toBeInTheDocument()
    expect(within(dialog).getAllByRole("button", { name: /^view$/i })).toHaveLength(
      3
    )
    expect(within(dialog).getAllByRole("button", { name: /^edit$/i })).toHaveLength(
      3
    )

    await user.clear(dialogFrom)
    await user.type(dialogFrom, "70")
    await user.clear(dialogTo)
    await user.type(dialogTo, "78")
    expect(within(dialog).getByText("early band")).toBeInTheDocument()
    expect(within(dialog).getByText("mid band")).toBeInTheDocument()
    expect(within(dialog).queryByText("late band")).not.toBeInTheDocument()
    expect(within(dialog).getAllByRole("button", { name: /^view$/i })).toHaveLength(
      2
    )
    expect(within(dialog).getAllByRole("button", { name: /^edit$/i })).toHaveLength(
      2
    )
    expect(
      within(panel).getByText("early band", { hidden: true })
    ).toBeInTheDocument()
    expect(
      within(panel).queryByText("late band", { hidden: true })
    ).not.toBeInTheDocument()

    await user.clear(dialogFrom)
    await user.clear(dialogTo)
    await user.type(dialogFrom, "78")
    expect(within(dialog).getByText("mid band")).toBeInTheDocument()
    expect(within(dialog).getByText("late band")).toBeInTheDocument()
    expect(within(dialog).queryByText("early band")).not.toBeInTheDocument()

    await user.clear(dialogFrom)
    await user.clear(dialogTo)
    await user.type(dialogTo, "70")
    expect(within(dialog).getByText("early band")).toBeInTheDocument()
    expect(within(dialog).queryByText("mid band")).not.toBeInTheDocument()
    expect(within(dialog).queryByText("late band")).not.toBeInTheDocument()

    await user.clear(dialogFrom)
    await user.clear(dialogTo)
    expect(within(dialog).getByText("early band")).toBeInTheDocument()
    expect(within(dialog).getByText("mid band")).toBeInTheDocument()
    expect(within(dialog).getByText("late band")).toBeInTheDocument()

    expect(screen.getByTestId("progress-row-1")).toBeInTheDocument()
    expect(
      screen.getByLabelText(/filter by municipality/i, { hidden: true })
    ).toBeInTheDocument()
  })

  it("uses stored project progress_pct for the visible project meter", async () => {
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-06-22 00:00:00.000Z",
        project: "1",
        from_pct: 25,
        to_pct: 75,
        site_photo: "site.jpg",
      },
    ]

    render(<ProgressModule />)

    const row = await screen.findByTestId("progress-row-1")
    expect(within(row).getByText(/^25%$/)).toBeInTheDocument()
  })

  it("renders progress updater user ids as user names", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-22 00:00:00.000Z",
        project: "1",
        from_pct: 25,
        to_pct: 75,
        site_photo: [],
        updated_by: "user1",
      },
    ]
    store.users = [
      {
        id: "user1",
        collectionId: "users",
        collectionName: "users",
        email: "ana@example.test",
        name: "Ana Santos",
        role: "Province",
        account_status: "Active",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /view details/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/Ana Santos/)).not.toHaveLength(0)
      expect(screen.queryByText(/user1/)).not.toBeInTheDocument()
    })
  })

  it("should resolve Updated By from expanded user when the users list is forbidden", async () => {
    const user = userEvent.setup()
    store.deniedCollections = ["users"]
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-22 00:00:00.000Z",
        project: "1",
        from_pct: 25,
        to_pct: 75,
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

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /view details/i }))

    await waitFor(() => {
      expect(store.listOptions.progress_updates).toEqual({
        expand: "updated_by",
      })
      expect(screen.getAllByText(/Barangay Officer/)).not.toHaveLength(0)
      expect(screen.queryByText(/officer-user/)).not.toBeInTheDocument()
    })
  })

  it("renders the current auth user name when user list is unavailable", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-22 00:00:00.000Z",
        project: "1",
        from_pct: 25,
        to_pct: 75,
        site_photo: [],
        updated_by: "current-user",
      },
    ]
    store.users = []

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /view details/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/Current Province User/)).not.toHaveLength(0)
      expect(screen.queryByText(/current-user/)).not.toBeInTheDocument()
    })
  })

  it("saves a progress update without client projects.update for Barangay (hook owns For Completion)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]
    store.updates = []

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          amount: 1500,
          main_account: "General Fund",
          sub_account: "GF - Proper",
        })
      )
      expect(projectUpdateMock).not.toHaveBeenCalled()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("shows a Zod validation message when saving without a site photo", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    expect(
      await screen.findAllByText(/site photo is required/i)
    ).not.toHaveLength(0)
    expect(createMock).not.toHaveBeenCalled()
  })

  it("shows the file-size sentence when PocketBase rejects a site photo as too large", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]
    createMock.mockRejectedValueOnce(
      Object.assign(new Error("Failed to create record."), {
        response: {
          message: "Failed to create record.",
          data: {
            site_photo: {
              code: "validation_file_size_limit",
              message:
                "Failed to upload site.jpg - the maximum allowed file size is 10485760 bytes.",
            },
          },
        },
      })
    )

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    expect(
      await screen.findByText(
        "File size exceeds the maximum allowed limit. Please upload a smaller file."
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /update progress/i })).toBeInTheDocument()
  })

  it("keeps generic Failed to create record when persist fails for a non-size reason", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]
    createMock.mockRejectedValueOnce(new Error("Failed to create record."))

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    expect(await screen.findByText("Failed to create record.")).toBeInTheDocument()
    expect(
      screen.queryByText(
        "File size exceeds the maximum allowed limit. Please upload a smaller file."
      )
    ).not.toBeInTheDocument()
  })

  it("saves below-100 progress with a site photo and empty completion document lists", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 5,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
    })
    expect(
      screen.queryByText(/at least one file is required/i)
    ).not.toBeInTheDocument()
  })

  it("blocks saving a 100% progress update until completion documents are uploaded", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "For Revision",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    expect(
      await screen.findByText(/certification of completion is required/i)
    ).toBeInTheDocument()
    expect(
      await screen.findByText(/liquidation documents are required/i)
    ).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
    expect(projectUpdateMock).not.toHaveBeenCalled()
  })

  it("should still show seven completion documents on Update Progress at 100%", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "For Completion",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )

    const dialog = await screen.findByRole("dialog", { name: /update progress/i })
    expect(within(dialog).getByText("Completion documents")).toBeInTheDocument()
    expect(within(dialog).getByText("Certification of Completion")).toBeInTheDocument()
    expect(within(dialog).getByText("Certificate of Acceptance")).toBeInTheDocument()
    expect(within(dialog).getByText("Proof of Payment from Barangay")).toBeInTheDocument()
    expect(within(dialog).getByText("Acknowledgment of Completion")).toBeInTheDocument()
    expect(within(dialog).getByText("Audit Documents")).toBeInTheDocument()
    expect(within(dialog).getByText("Verification Documents")).toBeInTheDocument()
    expect(within(dialog).getByText("Liquidation Documents")).toBeInTheDocument()
    expect(
      within(dialog).getByTestId("document-upload-input-completion-certification_completion")
    ).toBeInTheDocument()
    expect(
      within(dialog).getByTestId("document-upload-input-completion-liquidation_documents")
    ).toBeInTheDocument()
  })

  it("shows Update Progress at 100% for Planning, For Completion, and For Revision", async () => {
    useBarangayActor()
    store.projects = [
      {
        id: "stuck",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Try",
        category: "Infrastructure",
        status: "Planning",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
      {
        id: "ready",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Ready Row",
        category: "Infrastructure",
        status: "For Completion",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
      {
        id: "revision",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Revision Row",
        category: "Infrastructure",
        status: "For Revision",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    const stuckRow = await screen.findByTestId("progress-row-stuck")
    expect(
      within(stuckRow).getByRole("button", { name: /update progress/i })
    ).toBeInTheDocument()

    const readyRow = await screen.findByTestId("progress-row-ready")
    expect(
      within(readyRow).getByRole("button", { name: /update progress/i })
    ).toBeInTheDocument()

    const revisionRow = await screen.findByTestId("progress-row-revision")
    expect(
      within(revisionRow).getByRole("button", { name: /update progress/i })
    ).toBeInTheDocument()
  })

  it("shows Update Progress in detail panel at 100% for Planning and For Revision", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "stuck",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Try",
        category: "Infrastructure",
        status: "Planning",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
      {
        id: "revision",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Revision Row",
        category: "Infrastructure",
        status: "For Revision",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    const stuckRow = await screen.findByTestId("progress-row-stuck")
    await user.click(
      within(stuckRow).getByRole("button", { name: /view details/i })
    )

    const stuckDetail = await screen.findByRole("dialog")
    expect(
      within(stuckDetail).getByRole("button", { name: /update progress/i })
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId("progress-detail-panel")).getByRole("button", {
        name: /update progress/i,
        hidden: true,
      })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /close/i }))

    const revisionRow = await screen.findByTestId("progress-row-revision")
    await user.click(
      within(revisionRow).getByRole("button", { name: /view details/i })
    )

    const revisionDetail = await screen.findByRole("dialog")
    expect(
      within(revisionDetail).getByRole("button", { name: /update progress/i })
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId("progress-detail-panel")).getByRole("button", {
        name: /update progress/i,
        hidden: true,
      })
    ).toBeInTheDocument()
  })

  it("opens Update Progress modal for Planning at 100%", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "stuck",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Try",
        category: "Infrastructure",
        status: "Planning",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
      {
        id: "revision",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Revision Row",
        category: "Infrastructure",
        status: "For Revision",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    expect(
      screen.queryByRole("dialog", { name: /update progress/i })
    ).not.toBeInTheDocument()

    const stuckRow = await screen.findByTestId("progress-row-stuck")
    await user.click(
      within(stuckRow).getByRole("button", { name: /update progress/i })
    )

    expect(
      await screen.findByRole("dialog", { name: /update progress/i })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /cancel/i }))

    const revisionRow = await screen.findByTestId("progress-row-revision")
    await user.click(
      within(revisionRow).getByRole("button", { name: /update progress/i })
    )

    expect(
      await screen.findByRole("dialog", { name: /update progress/i })
    ).toBeInTheDocument()
  })

  it("keeps Update Progress enabled at 100% on list, detail, and mobile for Ongoing", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "ongoing-100",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Ongoing Full",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    const row = await screen.findByTestId("progress-row-ongoing-100")
    expect(
      within(row).getByRole("button", { name: /update progress/i })
    ).toBeEnabled()

    await user.click(within(row).getByRole("button", { name: /view details/i }))

    const mobileDetail = await screen.findByRole("dialog")
    expect(
      within(mobileDetail).getByRole("button", { name: /update progress/i })
    ).toBeEnabled()
    expect(
      within(screen.getByTestId("progress-detail-panel")).getByRole("button", {
        name: /update progress/i,
        hidden: true,
      })
    ).toBeEnabled()
  })

  it("heals stuck 100% projects on load for Province (V6)", async () => {
    store.projects = [
      {
        id: "stuck",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Try",
        category: "Infrastructure",
        status: "Planning",
        budget_year: 2026,
        progress_pct: 100,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    await waitFor(() => {
      expect(projectUpdateMock).toHaveBeenCalledWith(
        "stuck",
        expect.objectContaining({
          progress_pct: 100,
          status: "For Completion",
        })
      )
    })
  })

  it("does not heal from latest history to_pct when stored progress_pct is below 100", async () => {
    store.projects = [
      {
        id: "stuck",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Try",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 90,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      {
        id: "u-latest",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-07-12 00:00:00.000Z",
        project: "stuck",
        from_pct: 80,
        to_pct: 100,
        notes: "history amended to 100",
      },
    ]

    render(<ProgressModule />)

    const row = await screen.findByTestId("progress-row-stuck")
    expect(within(row).getByText(/^90%$/)).toBeInTheDocument()
    expect(projectUpdateMock).not.toHaveBeenCalled()
  })

  it("does not heal stuck 100% projects on load for Barangay (V6)", async () => {
    useBarangayActor()
    store.projects = [
      {
        id: "stuck",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Try",
        category: "Infrastructure",
        status: "Planning",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    await screen.findByTestId("progress-row-stuck")
    expect(projectUpdateMock).not.toHaveBeenCalled()
  })

  it("lets Barangay update a For Revision project without client projects.update (hook owns For Completion)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Revision Bridge",
        category: "Infrastructure",
        status: "For Revision",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    const row = await screen.findByTestId("progress-row-1")
    await user.click(within(row).getByRole("button", { name: /update progress/i }))
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await uploadRequiredCompletionDocs(user)
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
      expect(projectUpdateMock).not.toHaveBeenCalled()
    })
  }, 20_000)

  it("appends multiple files for every completion document upload", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "For Revision",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.upload(screen.getByTestId("document-upload-input-site-photo"), [
      makeFile("site-1.jpg", "image/jpeg"),
      makeFile("site-2.jpg", "image/jpeg"),
    ])
    await user.upload(
      screen.getByTestId("document-upload-input-completion-certification_completion"),
      [makeFile("certification-1.pdf"), makeFile("certification-2.pdf")]
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-certificate_acceptance"),
      [makeFile("acceptance-1.pdf"), makeFile("acceptance-2.pdf")]
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-proof_payment_barangay"),
      [makeFile("payment-1.pdf"), makeFile("payment-2.pdf")]
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-acknowledgment_completion"),
      [makeFile("acknowledgment-1.pdf"), makeFile("acknowledgment-2.pdf")]
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-audit_documents"),
      [makeFile("audit-1.pdf"), makeFile("audit-2.pdf")]
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-verification_documents"),
      [makeFile("verification-1.pdf"), makeFile("verification-2.pdf")]
    )
    await user.upload(
      screen.getByTestId("document-upload-input-completion-liquidation_documents"),
      [makeFile("liquidation-1.pdf"), makeFile("liquidation-2.pdf")]
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
    })
    const payload = createMock.mock.calls[0]?.[0] as FormData
    expect(payload.getAll("site_photo")).toHaveLength(2)
    expect(payload.getAll("certification_completion")).toHaveLength(2)
    expect(payload.getAll("certificate_acceptance")).toHaveLength(2)
    expect(payload.getAll("proof_payment_barangay")).toHaveLength(2)
    expect(payload.getAll("acknowledgment_completion")).toHaveLength(2)
    expect(payload.getAll("audit_documents")).toHaveLength(2)
    expect(payload.getAll("verification_documents")).toHaveLength(2)
    expect(payload.getAll("liquidation_documents")).toHaveLength(2)
  }, 20_000)

  it("should show Update Progress when project is Completed for Barangay progress users", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Completed Bridge",
        category: "Infrastructure",
        status: "Completed",
        budget_year: 2026,
        progress_pct: 100,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    const row = await screen.findByTestId("progress-row-1")
    expect(
      within(row).getByRole("button", { name: /update progress/i })
    ).toBeInTheDocument()
    expect(
      within(row).getByRole("button", { name: /view details/i })
    ).toBeInTheDocument()

    await user.click(within(row).getByRole("button", { name: /view details/i }))
    const mobileDetail = await screen.findByRole("dialog")
    expect(
      within(mobileDetail).getByRole("button", { name: /update progress/i })
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId("progress-detail-panel")).getByRole("button", {
        name: /update progress/i,
        hidden: true,
      })
    ).toBeInTheDocument()
  })

  it("hides Update Progress for Rejected projects", async () => {
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Rejected Bridge",
        category: "Infrastructure",
        status: "Rejected",
        budget_year: 2026,
        progress_pct: 40,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    const row = await screen.findByTestId("progress-row-1")
    expect(
      within(row).queryByRole("button", { name: /update progress/i })
    ).not.toBeInTheDocument()
  })

  it("lets operators add a progress update when the project is at 50%", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 50,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
    })
    expect(expenseCreateMock).not.toHaveBeenCalled()
  })

  it("corrects live progress via Update Progress and still exposes per-row history View/Edit", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 50,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-08-01 00:00:00.000Z",
        project: "1",
        from_pct: 0,
        to_pct: 50,
        notes: "Halfway",
        site_photo: ["site-on-record.jpg"],
        updated_by: "super-admin-user",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /view details/i }))

    const detail = await screen.findByRole("dialog", { name: /project detail/i })
    expect(within(detail).getByText(/0% → 50%/)).toBeInTheDocument()
    expect(
      within(detail).getByRole("button", { name: /^view$/i })
    ).toBeInTheDocument()
    expect(
      within(detail).getByRole("button", { name: /^edit$/i })
    ).toBeInTheDocument()
    expect(
      within(detail).getByRole("button", { name: /update progress/i })
    ).toBeInTheDocument()

    await user.click(
      within(detail).getByRole("button", { name: /update progress/i })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
    })
    expect(progressUpdateMock).not.toHaveBeenCalled()
  })

  function historyUpdateAt(
    id: string,
    toPct: number,
    notes: string,
    created: string
  ) {
    return {
      id,
      collectionId: "updates",
      collectionName: "progress_updates",
      created,
      project: "1",
      from_pct: 0,
      to_pct: toPct,
      notes,
      site_photo: ["site-on-record.jpg"],
      certification_completion: ["cert.pdf"],
      certificate_acceptance: ["accept.pdf"],
      proof_payment_barangay: ["pay.pdf"],
      acknowledgment_completion: ["ack.pdf"],
      audit_documents: ["audit.pdf"],
      verification_documents: ["verify.pdf"],
      liquidation_documents: ["liq.pdf"],
      updated_by: "super-admin-user",
    }
  }

  async function openProjectHistoryDialog(
    user: ReturnType<typeof userEvent.setup>
  ) {
    await user.click(await screen.findByRole("button", { name: /view details/i }))
    return screen.findByRole("dialog", { name: /project detail/i })
  }

  function rangeHistoryUpdate(options: {
    id: string
    fromPct: number
    toPct: number
    notes: string
    created: string
    sitePhoto: string
  }) {
    return {
      ...historyUpdateAt(options.id, options.toPct, options.notes, options.created),
      from_pct: options.fromPct,
      site_photo: [options.sitePhoto],
    }
  }

  function rangeBoundExpense(options: {
    id: string
    progressUpdate: string
    amount: number
    receipt: string
    date: string
    description: string
    subAccount: string
    created: string
  }) {
    return {
      id: options.id,
      collectionId: "budget_expenses",
      collectionName: "budget_expenses",
      created: options.created,
      updated: "",
      project: "1",
      amount: options.amount,
      year: 2026,
      main_account: "General Fund",
      sub_account: options.subAccount,
      date: options.date,
      receipt_number: options.receipt,
      description: options.description,
      progress_update: options.progressUpdate,
    }
  }

  function twoIsolatedRanges() {
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 50,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      rangeHistoryUpdate({
        id: "u-b",
        fromPct: 25,
        toPct: 50,
        notes: "band B notes",
        created: "2026-06-12 00:00:00.000Z",
        sitePhoto: "site-b.jpg",
      }),
      rangeHistoryUpdate({
        id: "u-a",
        fromPct: 0,
        toPct: 25,
        notes: "band A notes",
        created: "2026-05-12 00:00:00.000Z",
        sitePhoto: "site-a.jpg",
      }),
    ]
    store.expenses = [
      rangeBoundExpense({
        id: "be-b",
        progressUpdate: "u-b",
        amount: 2500,
        receipt: "OR-B",
        date: "2026-06-12",
        description: "Band B release",
        subAccount: "20% DF",
        created: "2026-06-12 00:00:00.000Z",
      }),
      rangeBoundExpense({
        id: "be-a",
        progressUpdate: "u-a",
        amount: 1000,
        receipt: "OR-A",
        date: "2026-05-12",
        description: "Band A release",
        subAccount: "GF - Proper",
        created: "2026-05-12 00:00:00.000Z",
      }),
    ]
    store.subAccounts = [
      ...store.subAccounts,
      {
        id: "sa2",
        collectionId: "budget_fund_sub_accounts",
        collectionName: "budget_fund_sub_accounts",
        name: "20% DF",
        main_account: "General Fund",
        active: true,
        sort_order: 2,
      },
    ]
  }

  function applyRowUpdate(
    rows: Array<Record<string, unknown>>,
    id: string,
    payload: unknown
  ) {
    const row = rows.find((item) => item.id === id)
    if (row && payload && typeof payload === "object" && !(payload instanceof FormData)) {
      Object.assign(row, payload)
    }
  }

  it("keeps View and Edit on filtered history rows for Super Admin", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 90,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      historyUpdateAt("u-late", 90, "late band", "2026-07-12 00:00:00.000Z"),
      historyUpdateAt("u-mid", 78, "mid band", "2026-06-12 00:00:00.000Z"),
      historyUpdateAt("u-early", 70, "early band", "2026-05-12 00:00:00.000Z"),
    ]

    render(<ProgressModule />)
    const detail = await openProjectHistoryDialog(user)
    const from = within(detail).getByLabelText(/^from %$/i)
    const to = within(detail).getByLabelText(/^to %$/i)

    await user.clear(from)
    await user.type(from, "70")
    await user.clear(to)
    await user.type(to, "78")

    expect(within(detail).getByText("early band")).toBeInTheDocument()
    expect(within(detail).getByText("mid band")).toBeInTheDocument()
    expect(within(detail).queryByText("late band")).not.toBeInTheDocument()
    expect(within(detail).getAllByRole("button", { name: /^view$/i })).toHaveLength(2)
    expect(within(detail).getAllByRole("button", { name: /^edit$/i })).toHaveLength(2)

    const earlyRow = within(detail).getByText("early band").closest("li")
    expect(earlyRow).not.toBeNull()
    await user.click(within(earlyRow!).getByRole("button", { name: /^view$/i }))
    const viewDialog = await screen.findByRole("dialog", {
      name: /progress update/i,
    })
    expect(within(viewDialog).getByText(/0% → 70%/)).toBeInTheDocument()
    expect(
      within(viewDialog).queryByRole("button", { name: /save update/i })
    ).not.toBeInTheDocument()
  })

  it("should save history-edit without advancing progress when Provincial Admin edits a filtered row", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 90,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      historyUpdateAt("u-late", 90, "late band", "2026-07-12 00:00:00.000Z"),
      historyUpdateAt("u-mid", 78, "mid band", "2026-06-12 00:00:00.000Z"),
    ]
    progressUpdateMock.mockImplementation(async (id: string, payload: unknown) => {
      const row = store.updates.find((update) => update.id === id)
      if (row && payload && typeof payload === "object" && !(payload instanceof FormData)) {
        Object.assign(row, payload)
      }
    })

    render(<ProgressModule />)
    const detail = await openProjectHistoryDialog(user)
    const from = within(detail).getByLabelText(/^from %$/i)
    await user.clear(from)
    await user.type(from, "78")

    expect(within(detail).getByText("late band")).toBeInTheDocument()
    expect(within(detail).getByText("mid band")).toBeInTheDocument()
    expect(within(detail).getAllByRole("button", { name: /^view$/i }).length).toBeGreaterThan(0)

    const midRow = within(detail).getByText("mid band").closest("li")
    expect(midRow).not.toBeNull()
    await user.click(within(midRow!).getByRole("button", { name: /^edit$/i }))

    const editor = await screen.findByRole("dialog", {
      name: /edit progress range/i,
    })
    const notes = within(editor).getByLabelText(/update notes/i)
    await user.clear(notes)
    await user.type(notes, "Province corrected history")
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(progressUpdateMock).toHaveBeenCalledWith(
      "u-mid",
      expect.objectContaining({ notes: "Province corrected history" }),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Skip-Progress-Sync": "1" }),
      })
    )
    expect(createMock).not.toHaveBeenCalled()
    expect(projectUpdateMock).not.toHaveBeenCalled()
    expect(expenseCreateMock).not.toHaveBeenCalled()
    expect(store.updates.find((row) => row.id === "u-late")?.notes).toBe(
      "late band"
    )
  })

  it("saves a filtered history edit without changing overall progress, including at 100%", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "For Completion",
        budget_year: 2026,
        progress_pct: 100,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      historyUpdateAt("u-latest", 100, "done band", "2026-08-12 00:00:00.000Z"),
      historyUpdateAt("u-mid", 80, "mid band", "2026-06-12 00:00:00.000Z"),
      historyUpdateAt("u-early", 50, "early band", "2026-05-12 00:00:00.000Z"),
    ]
    progressUpdateMock.mockImplementation(async (id: string, payload: unknown) => {
      const row = store.updates.find((update) => update.id === id)
      if (row && payload && typeof payload === "object" && !(payload instanceof FormData)) {
        Object.assign(row, payload)
      }
    })

    render(<ProgressModule />)
    const detail = await openProjectHistoryDialog(user)
    expect(within(detail).getByText(/overall progress:\s*100%/i)).toBeInTheDocument()

    const from = within(detail).getByLabelText(/^from %$/i)
    const to = within(detail).getByLabelText(/^to %$/i)
    await user.clear(from)
    await user.type(from, "80")
    await user.clear(to)
    await user.type(to, "100")

    expect(within(detail).queryByText("early band")).not.toBeInTheDocument()
    const midRow = within(detail).getByText("mid band").closest("li")
    expect(midRow).not.toBeNull()
    await user.click(within(midRow!).getByRole("button", { name: /^edit$/i }))

    const editor = await screen.findByRole("dialog", {
      name: /edit progress range/i,
    })
    const notes = within(editor).getByLabelText(/update notes/i)
    await user.clear(notes)
    await user.type(notes, "Corrected mid band")
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(progressUpdateMock).toHaveBeenCalledWith(
      "u-mid",
      expect.objectContaining({ notes: "Corrected mid band" }),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Skip-Progress-Sync": "1" }),
      })
    )
    expect(createMock).not.toHaveBeenCalled()
    expect(projectUpdateMock).not.toHaveBeenCalled()
    expect(expenseCreateMock).not.toHaveBeenCalled()

    const detailAfter = await screen.findByRole("dialog", { name: /project detail/i })
    expect(within(detailAfter).getByText(/overall progress:\s*100%/i)).toBeInTheDocument()
    expect(within(detailAfter).getByText("Corrected mid band")).toBeInTheDocument()
    expect(within(detailAfter).getByText("done band")).toBeInTheDocument()
    expect(within(detailAfter).queryByText("early band")).not.toBeInTheDocument()
    expect(store.updates.find((row) => row.id === "u-latest")?.notes).toBe(
      "done band"
    )
    expect(store.updates.find((row) => row.id === "u-early")?.notes).toBe(
      "early band"
    )
  })

  it("saves a latest history-row edit without changing overall progress", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 90,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      historyUpdateAt("u-latest", 90, "late band", "2026-07-12 00:00:00.000Z"),
      historyUpdateAt("u-mid", 78, "mid band", "2026-06-12 00:00:00.000Z"),
    ]
    progressUpdateMock.mockImplementation(async (id: string, payload: unknown) => {
      const row = store.updates.find((update) => update.id === id)
      if (row && payload && typeof payload === "object" && !(payload instanceof FormData)) {
        Object.assign(row, payload)
      }
    })

    render(<ProgressModule />)
    const detail = await openProjectHistoryDialog(user)
    expect(within(detail).getByText(/overall progress:\s*90%/i)).toBeInTheDocument()

    const lateRow = within(detail).getByText("late band").closest("li")
    expect(lateRow).not.toBeNull()
    await user.click(within(lateRow!).getByRole("button", { name: /^edit$/i }))

    const editor = await screen.findByRole("dialog", {
      name: /edit progress range/i,
    })
    const notes = within(editor).getByLabelText(/update notes/i)
    await user.clear(notes)
    await user.type(notes, "Corrected latest band")
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(progressUpdateMock).toHaveBeenCalledWith(
      "u-latest",
      expect.objectContaining({ notes: "Corrected latest band" }),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Skip-Progress-Sync": "1" }),
      })
    )
    expect(createMock).not.toHaveBeenCalled()
    expect(projectUpdateMock).not.toHaveBeenCalled()
    expect(store.updates.find((row) => row.id === "u-mid")?.notes).toBe("mid band")
    expect(store.updates.find((row) => row.id === "u-mid")?.to_pct).toBe(78)

    const detailAfter = await screen.findByRole("dialog", { name: /project detail/i })
    expect(within(detailAfter).getByText(/overall progress:\s*90%/i)).toBeInTheDocument()
    expect(within(detailAfter).getByText("Corrected latest band")).toBeInTheDocument()
    expect(within(detailAfter).getByText("mid band")).toBeInTheDocument()
  })

  it("should show saved from to as read-only and omit percents when history-edit saves", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 90,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      historyUpdateAt("u-latest", 90, "late band", "2026-07-12 00:00:00.000Z"),
      historyUpdateAt("u-mid", 78, "mid band", "2026-06-12 00:00:00.000Z"),
    ]
    progressUpdateMock.mockImplementation(async (id: string, payload: unknown) => {
      const row = store.updates.find((update) => update.id === id)
      if (row && payload && typeof payload === "object" && !(payload instanceof FormData)) {
        Object.assign(row, payload)
      }
    })

    render(<ProgressModule />)
    const listRow = await screen.findByTestId("progress-row-1")
    expect(within(listRow).getByText(/^90%$/)).toBeInTheDocument()

    const detail = await openProjectHistoryDialog(user)
    expect(within(detail).getByText(/overall progress:\s*90%/i)).toBeInTheDocument()

    const lateRow = within(detail).getByText("late band").closest("li")
    expect(lateRow).not.toBeNull()
    await user.click(within(lateRow!).getByRole("button", { name: /^edit$/i }))

    const editor = await screen.findByRole("dialog", {
      name: /edit progress range/i,
    })
    expect(within(editor).getByLabelText(/saved progress range/i)).toHaveTextContent(
      "0% → 90%"
    )
    expect(within(editor).queryByRole("slider")).not.toBeInTheDocument()
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    const [, payload, options] = progressUpdateMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
      unknown,
    ]
    expect(payload).not.toHaveProperty("to_pct")
    expect(payload).not.toHaveProperty("from_pct")
    expect(options).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Skip-Progress-Sync": "1" }),
      })
    )
    expect(projectUpdateMock).not.toHaveBeenCalled()
    expect(store.updates.find((row) => row.id === "u-latest")?.to_pct).toBe(90)
    expect(store.projects[0]?.progress_pct).toBe(90)

    const detailAfter = await screen.findByRole("dialog", { name: /project detail/i })
    expect(within(detailAfter).getByText(/overall progress:\s*90%/i)).toBeInTheDocument()
    expect(within(screen.getByTestId("progress-row-1")).getByText(/^90%$/)).toBeInTheDocument()
  })

  it("cancels a history edit without changing records or overall progress", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 90,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      historyUpdateAt("u-latest", 90, "late band", "2026-07-12 00:00:00.000Z"),
      historyUpdateAt("u-mid", 78, "mid band", "2026-06-12 00:00:00.000Z"),
    ]

    render(<ProgressModule />)
    const detail = await openProjectHistoryDialog(user)
    const from = within(detail).getByLabelText(/^from %$/i)
    await user.clear(from)
    await user.type(from, "70")

    const midRow = within(detail).getByText("mid band").closest("li")
    expect(midRow).not.toBeNull()
    await user.click(within(midRow!).getByRole("button", { name: /^edit$/i }))

    const editor = await screen.findByRole("dialog", {
      name: /edit progress range/i,
    })
    const notes = within(editor).getByLabelText(/update notes/i)
    await user.clear(notes)
    await user.type(notes, "Should not persist")
    await user.click(within(editor).getByRole("button", { name: /cancel/i }))

    expect(progressUpdateMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
    expect(projectUpdateMock).not.toHaveBeenCalled()
    expect(store.updates.find((row) => row.id === "u-mid")?.notes).toBe("mid band")

    const detailAfter = await screen.findByRole("dialog", { name: /project detail/i })
    expect(within(detailAfter).getByText(/overall progress:\s*90%/i)).toBeInTheDocument()
    expect(within(detailAfter).getByText("mid band")).toBeInTheDocument()
    expect(within(detailAfter).queryByText("Should not persist")).not.toBeInTheDocument()
  })

  it.each([
    { role: "Municipality" as const, actor: "useMunicipality" },
    { role: "Barangay" as const, actor: "useBarangay" },
  ])(
    "lets $role edit a filtered history entry when the project is at 100%",
    async ({ role }) => {
      const user = userEvent.setup()
      if (role === "Municipality") {
        useMunicipalityActor()
      } else {
        useBarangayActor()
      }
      store.projects = [
        {
          id: "1",
          collectionId: "p",
          collectionName: "projects",
          created: "",
          updated: "",
          name: "Bridge",
          category: "Infrastructure",
          status: "For Completion",
          budget_year: 2026,
          progress_pct: 100,
          municipality: "Tuguegarao City",
          barangay: "Centro 01 (Bagumbayan)",
        },
      ]
      store.updates = [
        historyUpdateAt("u-latest", 100, "done band", "2026-08-12 00:00:00.000Z"),
        historyUpdateAt("u-mid", 80, "mid band", "2026-06-12 00:00:00.000Z"),
      ]
      progressUpdateMock.mockImplementation(async (id: string, payload: unknown) => {
        const row = store.updates.find((update) => update.id === id)
        if (row && payload && typeof payload === "object" && !(payload instanceof FormData)) {
          Object.assign(row, payload)
        }
      })

      render(<ProgressModule />)
      const detail = await openProjectHistoryDialog(user)
      const from = within(detail).getByLabelText(/^from %$/i)
      await user.clear(from)
      await user.type(from, "80")

      const midRow = within(detail).getByText("mid band").closest("li")
      expect(midRow).not.toBeNull()
      await user.click(within(midRow!).getByRole("button", { name: /^edit$/i }))

      const editor = await screen.findByRole("dialog", {
        name: /edit progress range/i,
      })
      const notes = within(editor).getByLabelText(/update notes/i)
      await user.clear(notes)
      await user.type(notes, `${role} corrected history`)
      await user.click(within(editor).getByRole("button", { name: /save update/i }))

      await waitFor(() => {
        expect(progressUpdateMock).toHaveBeenCalledTimes(1)
      })
      expect(progressUpdateMock).toHaveBeenCalledWith(
        "u-mid",
        expect.objectContaining({ notes: `${role} corrected history` }),
        expect.objectContaining({
          headers: expect.objectContaining({ "X-Skip-Progress-Sync": "1" }),
        })
      )
      expect(createMock).not.toHaveBeenCalled()
      expect(projectUpdateMock).not.toHaveBeenCalled()
      expect(expenseCreateMock).not.toHaveBeenCalled()
    }
  )

  async function openFilteredRangeEdit(
    user: ReturnType<typeof userEvent.setup>,
    notes: string
  ) {
    const detail = await openProjectHistoryDialog(user)
    const from = within(detail).getByLabelText(/^from %$/i)
    const to = within(detail).getByLabelText(/^to %$/i)
    await user.clear(from)
    await user.type(from, "0")
    await user.clear(to)
    await user.type(to, "50")
    const row = within(detail).getByText(notes).closest("li")
    expect(row).not.toBeNull()
    await user.click(within(row!).getByRole("button", { name: /^edit$/i }))
    return screen.findByRole("dialog", { name: /edit progress range/i })
  }

  it("should prefill only the selected range when history-edit opens", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    twoIsolatedRanges()

    render(<ProgressModule />)
    const editor = await openFilteredRangeEdit(user, "band A notes")

    expect(within(editor).getByLabelText(/update notes/i)).toHaveValue(
      "band A notes"
    )
    expect(within(editor).getByText("On record: site-a.jpg")).toBeInTheDocument()
    expect(
      within(editor).queryByText("On record: site-b.jpg")
    ).not.toBeInTheDocument()
    expect(within(editor).getByLabelText(/^amount \(php\)$/i)).toHaveValue(1000)
    expect(within(editor).getByLabelText(/^receipt number$/i)).toHaveValue("OR-A")
    expect(within(editor).getByLabelText(/^sub account$/i)).toHaveTextContent(
      "GF - Proper"
    )
    expect(within(editor).getByLabelText(/^expense date$/i)).toHaveValue(
      "2026-05-12"
    )
    expect(within(editor).getByLabelText(/^description$/i)).toHaveValue(
      "Band A release"
    )
    expect(within(editor).queryByText("band B notes")).not.toBeInTheDocument()
    expect(within(editor).queryByDisplayValue("OR-B")).not.toBeInTheDocument()
  })

  it("should leave sibling range notes photo and expense unchanged when one range is saved", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    twoIsolatedRanges()
    progressUpdateMock.mockImplementation(async (id, payload) => {
      applyRowUpdate(store.updates, id, payload)
    })
    expenseUpdateMock.mockImplementation(async (id, payload) => {
      applyRowUpdate(store.expenses, id, payload)
    })

    render(<ProgressModule />)
    const editor = await openFilteredRangeEdit(user, "band A notes")
    const notes = within(editor).getByLabelText(/update notes/i)
    await user.clear(notes)
    await user.type(notes, "Corrected band A")
    const amount = within(editor).getByLabelText(/^amount \(php\)$/i)
    await user.clear(amount)
    await user.type(amount, "1100")
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(progressUpdateMock).toHaveBeenCalledWith(
      "u-a",
      expect.objectContaining({ notes: "Corrected band A" }),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Skip-Progress-Sync": "1" }),
      })
    )
    expect(expenseUpdateMock).toHaveBeenCalledWith(
      "be-a",
      expect.objectContaining({ amount: 1100 })
    )
    expect(expenseCreateMock).not.toHaveBeenCalled()
    expect(expenseUpdateMock).not.toHaveBeenCalledWith(
      "be-b",
      expect.anything()
    )

    const siblingUpdate = store.updates.find((row) => row.id === "u-b")
    const siblingExpense = store.expenses.find((row) => row.id === "be-b")
    expect(siblingUpdate?.notes).toBe("band B notes")
    expect(siblingUpdate?.site_photo).toEqual(["site-b.jpg"])
    expect(siblingExpense?.amount).toBe(2500)
    expect(siblingExpense?.receipt_number).toBe("OR-B")
    expect(siblingExpense?.sub_account).toBe("20% DF")
    expect(siblingExpense?.date).toBe("2026-06-12")
    expect(siblingExpense?.description).toBe("Band B release")
    expect(siblingExpense?.progress_update).toBe("u-b")
  })

  it("should keep the other six stored values when only receipt number is changed", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    twoIsolatedRanges()
    progressUpdateMock.mockImplementation(async (id, payload) => {
      applyRowUpdate(store.updates, id, payload)
    })
    expenseUpdateMock.mockImplementation(async (id, payload) => {
      applyRowUpdate(store.expenses, id, payload)
    })

    render(<ProgressModule />)
    const editor = await openFilteredRangeEdit(user, "band A notes")
    const receipt = within(editor).getByLabelText(/^receipt number$/i)
    await user.clear(receipt)
    await user.type(receipt, "OR-A-FIXED")
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(expenseUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(expenseUpdateMock).toHaveBeenCalledWith(
      "be-a",
      expect.objectContaining({
        receipt_number: "OR-A-FIXED",
        amount: 1000,
        description: "Band A release",
        date: "2026-05-12",
        sub_account: "GF - Proper",
      })
    )
    const editedUpdate = store.updates.find((row) => row.id === "u-a")
    expect(editedUpdate?.notes).toBe("band A notes")
    expect(editedUpdate?.site_photo).toEqual(["site-a.jpg"])
  })

  it("should persist the opened history row when From To filter matches more than one row", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    twoIsolatedRanges()
    progressUpdateMock.mockImplementation(async (id, payload) => {
      applyRowUpdate(store.updates, id, payload)
    })

    render(<ProgressModule />)
    const editor = await openFilteredRangeEdit(user, "band B notes")
    const notes = within(editor).getByLabelText(/update notes/i)
    await user.clear(notes)
    await user.type(notes, "Corrected band B")
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(progressUpdateMock.mock.calls[0]?.[0]).toBe("u-b")
    expect(store.updates.find((row) => row.id === "u-a")?.notes).toBe(
      "band A notes"
    )
  })

  it("should show all seven range fields when history-edit opens", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    twoIsolatedRanges()

    render(<ProgressModule />)
    const editor = await openFilteredRangeEdit(user, "band A notes")

    expect(within(editor).getByLabelText(/update notes/i)).toBeInTheDocument()
    expect(within(editor).getByText(/site photo/i)).toBeInTheDocument()
    expect(within(editor).getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    expect(within(editor).getByLabelText(/^amount \(php\)$/i)).toBeInTheDocument()
    expect(within(editor).getByLabelText(/^receipt number$/i)).toBeInTheDocument()
    expect(within(editor).getByText("Fund Source")).toBeInTheDocument()
    expect(within(editor).getByLabelText(/^expense date$/i)).toBeInTheDocument()
    expect(within(editor).getByLabelText(/^description$/i)).toBeInTheDocument()
    expect(
      screen.queryByRole("dialog", { name: /^update progress$/i })
    ).not.toBeInTheDocument()
  })

  const COMPLETION_DOC_FIELDS = [
    "certification_completion",
    "certificate_acceptance",
    "proof_payment_barangay",
    "acknowledgment_completion",
    "audit_documents",
    "verification_documents",
    "liquidation_documents",
  ] as const

  const COMPLETION_DOC_LABELS = [
    "Certification of Completion",
    "Certificate of Acceptance",
    "Proof of Payment from Barangay",
    "Acknowledgment of Completion",
    "Audit Documents",
    "Verification Documents",
    "Liquidation Documents",
  ] as const

  function expectSevenCompletionDocs(scope: ReturnType<typeof within>) {
    expect(scope.getByText("Completion documents")).toBeInTheDocument()
    for (const field of COMPLETION_DOC_FIELDS) {
      expect(
        scope.getByTestId(`document-upload-input-completion-${field}`)
      ).toBeInTheDocument()
    }
    for (const label of COMPLETION_DOC_LABELS) {
      expect(scope.getByText(label)).toBeInTheDocument()
    }
  }

  function hundredPercentHistoryProject(
    latest: Record<string, unknown> = {}
  ) {
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "For Completion",
        budget_year: 2026,
        progress_pct: 100,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      {
        ...historyUpdateAt("u-latest", 100, "done band", "2026-08-12 00:00:00.000Z"),
        ...latest,
      },
      historyUpdateAt("u-mid", 80, "mid band", "2026-06-12 00:00:00.000Z"),
    ]
  }

  async function openHistoryEditByNotes(
    user: ReturnType<typeof userEvent.setup>,
    notes: string
  ) {
    const detail = await openProjectHistoryDialog(user)
    const row = within(detail).getByText(notes).closest("li")
    expect(row).not.toBeNull()
    await user.click(within(row!).getByRole("button", { name: /^edit$/i }))
    return screen.findByRole("dialog", { name: /edit progress range/i })
  }

  it("should show seven completion documents and prefill on-record files when history-edit To is 100%", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    hundredPercentHistoryProject()

    render(<ProgressModule />)
    const editor = await openHistoryEditByNotes(user, "done band")

    expectSevenCompletionDocs(within(editor))
    expect(within(editor).getByText(/on record: cert\.pdf/i)).toBeInTheDocument()
    expect(within(editor).getByText(/on record: accept\.pdf/i)).toBeInTheDocument()
    expect(within(editor).getByText(/on record: liq\.pdf/i)).toBeInTheDocument()
  })

  it("should block history-edit save at 100% when completion documents are missing", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    hundredPercentHistoryProject({
      certification_completion: [],
      certificate_acceptance: [],
      proof_payment_barangay: [],
      acknowledgment_completion: [],
      audit_documents: [],
      verification_documents: [],
      liquidation_documents: [],
    })

    render(<ProgressModule />)
    const editor = await openHistoryEditByNotes(user, "done band")
    expectSevenCompletionDocs(within(editor))
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    expect(
      await screen.findByText(/certification of completion is required/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/liquidation documents are required/i)
    ).toBeInTheDocument()
    expect(progressUpdateMock).not.toHaveBeenCalled()
  })

  it("should hide completion documents when history-edit To is not 100%", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    hundredPercentHistoryProject()

    render(<ProgressModule />)
    const editor = await openHistoryEditByNotes(user, "mid band")

    expect(within(editor).queryByText("Completion documents")).not.toBeInTheDocument()
    for (const field of COMPLETION_DOC_FIELDS) {
      expect(
        within(editor).queryByTestId(`document-upload-input-completion-${field}`)
      ).not.toBeInTheDocument()
    }
  })

  it("should persist on-record completion files when history-edit at 100% saves without new uploads", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    hundredPercentHistoryProject()
    progressUpdateMock.mockImplementation(async (id: string, payload: unknown) => {
      const row = store.updates.find((update) => update.id === id)
      if (row && payload && typeof payload === "object" && !(payload instanceof FormData)) {
        Object.assign(row, payload)
      }
    })

    render(<ProgressModule />)
    const editor = await openHistoryEditByNotes(user, "done band")
    const notes = within(editor).getByLabelText(/update notes/i)
    await user.clear(notes)
    await user.type(notes, "Corrected done band")
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    const [updateId, payload] = progressUpdateMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(updateId).toBe("u-latest")
    expect(payload).not.toBeInstanceOf(FormData)
    expect(payload).toEqual(
      expect.objectContaining({ notes: "Corrected done band" })
    )
    for (const field of COMPLETION_DOC_FIELDS) {
      expect(payload).not.toHaveProperty(field)
    }
    const saved = store.updates.find((row) => row.id === "u-latest")
    expect(saved?.certification_completion).toEqual(["cert.pdf"])
    expect(saved?.liquidation_documents).toEqual(["liq.pdf"])
  })

  it("should send FormData with new completion uploads when history-edit at 100% saves", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    hundredPercentHistoryProject()

    render(<ProgressModule />)
    const editor = await openHistoryEditByNotes(user, "done band")
    await user.upload(
      within(editor).getByTestId(
        "document-upload-input-completion-certification_completion"
      ),
      makeFile("new-cert.pdf")
    )
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    const [updateId, payload] = progressUpdateMock.mock.calls[0] as [
      string,
      FormData,
    ]
    expect(updateId).toBe("u-latest")
    expect(payload).toBeInstanceOf(FormData)
    expect(payload.get("certification_completion")).toBeInstanceOf(File)
    expect((payload.get("certification_completion") as File).name).toBe(
      "new-cert.pdf"
    )
  })

  it("should allow progress range edit when project is Completed", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    hundredPercentHistoryProject()
    store.projects[0] = { ...store.projects[0], status: "Completed" }
    progressUpdateMock.mockImplementation(async (id: string, payload: unknown) => {
      const row = store.updates.find((update) => update.id === id)
      if (row && payload && typeof payload === "object" && !(payload instanceof FormData)) {
        Object.assign(row, payload)
      }
    })

    render(<ProgressModule />)
    const editor = await openHistoryEditByNotes(user, "done band")
    const notes = within(editor).getByLabelText(/update notes/i)
    await user.clear(notes)
    await user.type(notes, "Corrected after Completed")
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    const [updateId, payload] = progressUpdateMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(updateId).toBe("u-latest")
    expect(payload).toEqual(
      expect.objectContaining({ notes: "Corrected after Completed" })
    )
  })

  it("should hide Edit when project is Rejected", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "rejected",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Rejected Bridge",
        category: "Infrastructure",
        status: "Rejected",
        budget_year: 2026,
        progress_pct: 40,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      {
        ...historyUpdateAt(
          "u-rejected",
          40,
          "rejected band",
          "2026-08-12 00:00:00.000Z"
        ),
        project: "rejected",
      },
    ]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-rejected")).getByRole(
        "button",
        { name: /view details/i }
      )
    )
    const rejectedDetail = await screen.findByRole("dialog", {
      name: /project detail/i,
    })
    expect(
      within(rejectedDetail).queryByRole("button", { name: /^edit$/i })
    ).not.toBeInTheDocument()
  })

  it("should leave expense fields empty and skip create when unlinked range saves notes only", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      rangeHistoryUpdate({
        id: "u-a",
        fromPct: 0,
        toPct: 25,
        notes: "unlinked notes",
        created: "2026-05-12 00:00:00.000Z",
        sitePhoto: "site-a.jpg",
      }),
    ]
    store.expenses = [
      rangeBoundExpense({
        id: "be-legacy",
        progressUpdate: "",
        amount: 9999,
        receipt: "OR-LEGACY",
        date: "2026-01-01",
        description: "Legacy unbound",
        subAccount: "GF - Proper",
        created: "2026-01-01 00:00:00.000Z",
      }),
    ]
    progressUpdateMock.mockImplementation(async (id, payload) => {
      applyRowUpdate(store.updates, id, payload)
    })

    render(<ProgressModule />)
    const editor = await openFilteredRangeEdit(user, "unlinked notes")
    expect(within(editor).getByLabelText(/^amount \(php\)$/i)).toHaveValue(null)
    expect(within(editor).getByLabelText(/^receipt number$/i)).toHaveValue("")
    expect(
      within(editor).queryByDisplayValue("OR-LEGACY")
    ).not.toBeInTheDocument()

    const notes = within(editor).getByLabelText(/update notes/i)
    await user.clear(notes)
    await user.type(notes, "Notes only")
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(expenseCreateMock).not.toHaveBeenCalled()
    expect(expenseUpdateMock).not.toHaveBeenCalled()
  })

  it.each([
    { role: "Municipality" as const, actor: "useMunicipality" },
    { role: "Barangay" as const, actor: "useBarangay" },
  ])(
    "should skip expense create when $role saves notes only on an unlinked range",
    async ({ role }) => {
      const user = userEvent.setup()
      if (role === "Municipality") {
        useMunicipalityActor()
      } else {
        useBarangayActor()
      }
      store.projects = [
        {
          id: "1",
          collectionId: "p",
          collectionName: "projects",
          created: "",
          updated: "",
          name: "Bridge",
          category: "Infrastructure",
          status: "Ongoing",
          budget_year: 2026,
          progress_pct: 25,
          municipality: "Tuguegarao City",
          barangay: "Centro 01 (Bagumbayan)",
        },
      ]
      store.updates = [
        rangeHistoryUpdate({
          id: "u-a",
          fromPct: 0,
          toPct: 25,
          notes: "unlinked notes",
          created: "2026-05-12 00:00:00.000Z",
          sitePhoto: "site-a.jpg",
        }),
      ]

      render(<ProgressModule />)
      const editor = await openFilteredRangeEdit(user, "unlinked notes")
      expect(within(editor).getByLabelText(/^amount \(php\)$/i)).toHaveValue(null)

      const notes = within(editor).getByLabelText(/update notes/i)
      await user.clear(notes)
      await user.type(notes, `${role} notes only`)
      await user.click(within(editor).getByRole("button", { name: /save update/i }))

      await waitFor(() => {
        expect(progressUpdateMock).toHaveBeenCalledTimes(1)
      })
      expect(expenseCreateMock).not.toHaveBeenCalled()
      expect(expenseUpdateMock).not.toHaveBeenCalled()
    }
  )

  it.each([
    { role: "Municipality" as const },
    { role: "Barangay" as const },
  ])(
    "should patch only the bound expense when $role saves a history-edit amount",
    async ({ role }) => {
      const user = userEvent.setup()
      if (role === "Municipality") {
        useMunicipalityActor()
      } else {
        useBarangayActor()
      }
      twoIsolatedRanges()
      expenseUpdateMock.mockImplementation(async (id, payload) => {
        applyRowUpdate(store.expenses, id, payload)
      })

      render(<ProgressModule />)
      const editor = await openFilteredRangeEdit(user, "band A notes")
      const amount = within(editor).getByLabelText(/^amount \(php\)$/i)
      await user.clear(amount)
      await user.type(amount, "1100")
      await user.click(within(editor).getByRole("button", { name: /save update/i }))

      await waitFor(() => {
        expect(expenseUpdateMock).toHaveBeenCalledTimes(1)
      })
      expect(expenseUpdateMock).toHaveBeenCalledWith(
        "be-a",
        expect.objectContaining({ amount: 1100 })
      )
      expect(expenseUpdateMock).not.toHaveBeenCalledWith(
        "be-b",
        expect.anything()
      )
      expect(expenseCreateMock).not.toHaveBeenCalled()
    }
  )

  it(
    "should create a bound expense when unlinked range submits expense data",
    async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      rangeHistoryUpdate({
        id: "u-a",
        fromPct: 0,
        toPct: 25,
        notes: "unlinked notes",
        created: "2026-05-12 00:00:00.000Z",
        sitePhoto: "site-a.jpg",
      }),
    ]

    render(<ProgressModule />)
    const editor = await openFilteredRangeEdit(user, "unlinked notes")
    await fillRequiredReleasedAmount(user)
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          progress_update: "u-a",
          amount: 1500,
          receipt_number: "OR-1500",
        })
      )
    })
    expect(expenseUpdateMock).not.toHaveBeenCalled()
    },
    20_000
  )

  it("should block history-edit CREATE when amount exceeds release cap", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      rangeHistoryUpdate({
        id: "u-a",
        fromPct: 0,
        toPct: 25,
        notes: "unlinked notes",
        created: "2026-05-12 00:00:00.000Z",
        sitePhoto: "site-a.jpg",
      }),
    ]
    store.allocations = [
      {
        id: "a1",
        collectionId: "a",
        collectionName: "budget_allocations",
        project: "1",
        amount: 1_000,
        year: 2026,
        date: "2026-01-01",
      },
    ]

    render(<ProgressModule />)
    const editor = await openFilteredRangeEdit(user, "unlinked notes")
    await fillRequiredReleasedAmount(user)
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    expect(
      await screen.findAllByText(
        "Released amount exceeds the project's allocated budget."
      )
    ).not.toHaveLength(0)
    expect(expenseCreateMock).not.toHaveBeenCalled()
    expect(expenseUpdateMock).not.toHaveBeenCalled()
  }, 20_000)

  it("should allow history-edit PATCH when bound amount would exceed create-cap", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    twoIsolatedRanges()
    store.allocations = [
      {
        id: "a1",
        collectionId: "a",
        collectionName: "budget_allocations",
        project: "1",
        amount: 3_600,
        year: 2026,
        date: "2026-01-01",
      },
    ]
    expenseUpdateMock.mockImplementation(async (id, payload) => {
      applyRowUpdate(store.expenses, id, payload)
    })

    render(<ProgressModule />)
    const editor = await openFilteredRangeEdit(user, "band A notes")
    const amount = within(editor).getByLabelText(/^amount \(php\)$/i)
    await user.clear(amount)
    await user.type(amount, "2000")
    await user.click(within(editor).getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(expenseUpdateMock).toHaveBeenCalledWith(
        "be-a",
        expect.objectContaining({ amount: 2000 })
      )
    })
    expect(expenseCreateMock).not.toHaveBeenCalled()
    expect(
      screen.queryByText("Released amount exceeds the project's allocated budget.")
    ).not.toBeInTheDocument()
  }, 20_000)

  it.each([
    { role: "Municipality" as const, pct: 50 },
    { role: "Municipality" as const, pct: 100 },
    { role: "Barangay" as const, pct: 50 },
    { role: "Barangay" as const, pct: 100 },
  ])(
    "lets $role update progress at $pct% with no percent-lock copy",
    async ({ role, pct }) => {
      if (role === "Municipality") {
        useMunicipalityActor()
      } else {
        useBarangayActor()
      }
      store.projects = [
        {
          id: "1",
          collectionId: "p",
          collectionName: "projects",
          created: "",
          updated: "",
          name: "Bridge",
          category: "Infrastructure",
          status: "Ongoing",
          budget_year: 2026,
          progress_pct: pct,
          municipality: "Tuguegarao City",
          barangay: "Centro 01 (Bagumbayan)",
        },
      ]
      store.updates = [
        {
          id: "u1",
          collectionId: "updates",
          collectionName: "progress_updates",
          created: "2026-08-01 00:00:00.000Z",
          project: "1",
          from_pct: 0,
          to_pct: pct,
          notes: "Prior update",
          site_photo: [],
          updated_by:
            role === "Municipality" ? "municipality-user" : "barangay-user",
        },
      ]

      render(<ProgressModule />)

      const row = await screen.findByTestId("progress-row-1")
      const updateCta = within(row).getByRole("button", {
        name: /update progress/i,
      })
      expect(updateCta).toBeEnabled()
      expect(
        screen.queryByText(
          /locked at (50|100)|cannot update.*(50|100)\s*%|frozen at (50|100)|progress is locked/i
        )
      ).not.toBeInTheDocument()
      expect(within(row).getByText(new RegExp(`0% → ${pct}%`))).toBeInTheDocument()
    }
  )

  it("lets Municipality save a progress history update at 50%", async () => {
    const user = userEvent.setup()
    useMunicipalityActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 50,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-08-01 00:00:00.000Z",
        project: "1",
        from_pct: 0,
        to_pct: 50,
        notes: "Halfway",
        site_photo: [],
        updated_by: "municipality-user",
      },
    ]

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
    })
  }, 20_000)

  it("submits progress and released amount together from the update modal", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("update-released-amount")).not.toBeInTheDocument()

    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "1500")
    await user.type(screen.getByLabelText(/^receipt number$/i), "007")
    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(screen.getByRole("option", { name: "General Fund" }))
    await user.click(screen.getByLabelText(/^sub account$/i))
    await user.click(screen.getByRole("option", { name: "GF - Proper" }))
    await user.type(screen.getByLabelText(/^description$/i), "Bridge materials")
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          amount: 1500,
          year: 2026,
          main_account: "General Fund",
          sub_account: "GF - Proper",
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          receipt_number: "007",
          description: "Bridge materials",
          progress_update: "pu-new",
        })
      )
    })
  })

  it("should block progress released amount create that exceeds allocated budget", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]
    store.allocations = [
      {
        id: "a1",
        collectionId: "a",
        collectionName: "budget_allocations",
        project: "1",
        amount: 1_000,
        year: 2026,
        date: "2026-01-01",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "1500")
    await user.type(screen.getByLabelText(/^receipt number$/i), "007")
    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(screen.getByRole("option", { name: "General Fund" }))
    await user.click(screen.getByLabelText(/^sub account$/i))
    await user.click(screen.getByRole("option", { name: "GF - Proper" }))
    await user.type(screen.getByLabelText(/^description$/i), "Bridge materials")
    await user.click(screen.getByRole("button", { name: /save update/i }))

    expect(
      await screen.findAllByText(
        "Released amount exceeds the project's allocated budget."
      )
    ).not.toHaveLength(0)
    expect(createMock).not.toHaveBeenCalled()
    expect(expenseCreateMock).not.toHaveBeenCalled()
  })

  it("shows embedded released amount fields for Province users", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("update-released-amount")).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^receipt number$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^description$/i)).toBeInTheDocument()
  })

  it("saves Province progress updates without a released amount", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
    })
    expect(expenseCreateMock).not.toHaveBeenCalled()
  })

  it("should show FieldError when Province submits Released Amount without receipt_number", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "1500")
    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(screen.getByRole("option", { name: "General Fund" }))
    await user.click(screen.getByLabelText(/^sub account$/i))
    await user.click(screen.getByRole("option", { name: "GF - Proper" }))
    await user.type(screen.getByLabelText(/^description$/i), "Materials")
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(screen.getByText(/receipt number is required/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/^receipt number$/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(createMock).not.toHaveBeenCalled()
    expect(expenseCreateMock).not.toHaveBeenCalled()
  })

  it("saves Province progress updates with embedded released amount sync", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          amount: 1500,
          year: 2026,
          main_account: "General Fund",
          sub_account: "GF - Proper",
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          receipt_number: "OR-1500",
          description: "Release for progress",
          progress_update: "pu-new",
        })
      )
    })
    expect(createMock.mock.invocationCallOrder[0]).toBeLessThan(
      expenseCreateMock.mock.invocationCallOrder[0]!
    )
  }, 20_000)

  it("should bind Released Amount to the new progress row when Update Progress creates an expense", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          progress_update: "pu-new",
        })
      )
    })
  }, 20_000)

  it("shows released amount fields for Super Admin users without requiring them", async () => {
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("update-released-amount")).not.toBeInTheDocument()
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
    })
    expect(expenseCreateMock).not.toHaveBeenCalled()
  })

  it("saves Super Admin progress updates with embedded released amount sync", async () => {
    const user = userEvent.setup()
    useSuperAdminActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          amount: 1500,
          year: 2026,
          main_account: "General Fund",
          sub_account: "GF - Proper",
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          receipt_number: "OR-1500",
          description: "Release for progress",
          progress_update: "pu-new",
        })
      )
    })
    expect(createMock.mock.invocationCallOrder[0]).toBeLessThan(
      expenseCreateMock.mock.invocationCallOrder[0]!
    )
  }, 20_000)

  it("should show FieldError when Municipality submits Released Amount without receipt_number", async () => {
    const user = userEvent.setup()
    useMunicipalityActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 40,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "1500")
    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(screen.getByRole("option", { name: "General Fund" }))
    await user.click(screen.getByLabelText(/^sub account$/i))
    await user.click(screen.getByRole("option", { name: "GF - Proper" }))
    await user.type(screen.getByLabelText(/^description$/i), "Materials")
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(screen.getByText(/receipt number is required/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/^receipt number$/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(createMock).not.toHaveBeenCalled()
  })

  it("should show FieldError when Barangay submits Released Amount with whitespace-only description", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "1500")
    await user.type(screen.getByLabelText(/^receipt number$/i), "OR-9")
    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(screen.getByRole("option", { name: "General Fund" }))
    await user.click(screen.getByLabelText(/^sub account$/i))
    await user.click(screen.getByRole("option", { name: "GF - Proper" }))
    await user.type(screen.getByLabelText(/^description$/i), "   ")
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(screen.getByText(/description is required/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/^description$/i)).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(createMock).not.toHaveBeenCalled()
  })

  it("saves Municipality progress updates with embedded released amount sync", async () => {
    const user = userEvent.setup()
    useMunicipalityActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 40,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await waitFor(() => {
      expect(screen.getByTestId("progress-released-amount-fields")).toBeInTheDocument()
    })
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          amount: 1500,
          year: 2026,
          main_account: "General Fund",
          sub_account: "GF - Proper",
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          receipt_number: "OR-1500",
          description: "Release for progress",
          progress_update: "pu-new",
        })
      )
    })
  }, 20_000)

  it("rolls back progress update and keeps dialog open when released amount sync fails", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]
    expenseCreateMock.mockRejectedValueOnce(new Error("Released amount sync failed"))

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
      expect(deleteMock).toHaveBeenCalledWith("pu-new")
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText(/released amount sync failed/i)).toBeInTheDocument()
    })
    expect(projectUpdateMock).not.toHaveBeenCalled()
  }, 20_000)

  function revisionProject(overrides: Record<string, unknown> = {}) {
    return {
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Revision Bridge",
      category: "Infrastructure",
      status: "For Revision",
      budget_year: 2026,
      progress_pct: 75,
      ...barangayScope,
      ...overrides,
    }
  }

  function latestProgressUpdate(overrides: Record<string, unknown> = {}) {
    return {
      id: "pu-latest",
      collectionId: "updates",
      collectionName: "progress_updates",
      created: "2026-07-20T12:00:00.000Z",
      updated: "",
      project: "1",
      from_pct: 50,
      to_pct: 75,
      notes: "Prior revision notes",
      site_photo: ["site-on-record.jpg"],
      certification_completion: [],
      certificate_acceptance: [],
      proof_payment_barangay: [],
      acknowledgment_completion: [],
      audit_documents: [],
      verification_documents: [],
      liquidation_documents: [],
      ...overrides,
    }
  }

  function latestExpense(overrides: Record<string, unknown> = {}) {
    return {
      id: "be-latest",
      collectionId: "budget_expenses",
      collectionName: "budget_expenses",
      created: "2026-07-20T12:00:00.000Z",
      updated: "",
      project: "1",
      amount: 1500,
      year: 2026,
      main_account: "General Fund",
      sub_account: "GF - Proper",
      date: "2026-07-20",
      receipt_number: "R-100",
      description: "Prior release",
      ...overrides,
    }
  }

  it("prefills For Revision progress modal from latest progress update and expense (T1/V1/V8)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [
      latestProgressUpdate({
        id: "pu-older",
        created: "2026-07-10T12:00:00.000Z",
        to_pct: 40,
        notes: "Older notes",
      }),
      latestProgressUpdate(),
    ]
    store.expenses = [
      latestExpense({
        id: "be-older",
        created: "2026-07-10T12:00:00.000Z",
        amount: 500,
        receipt_number: "OLD",
      }),
      latestExpense(),
    ]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText(/update notes/i)).toHaveValue(
      "Prior revision notes"
    )
    expect(within(dialog).getByText(/Progress: 75%/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^amount \(php\)$/i)).toHaveValue(1500)
    expect(within(dialog).getByLabelText(/^receipt number$/i)).toHaveValue("R-100")
    expect(within(dialog).getByLabelText(/^expense date$/i)).toHaveValue(
      "2026-07-20"
    )
    await waitFor(() => {
      expect(within(dialog).getByLabelText(/^main account$/i)).toHaveTextContent(
        "General Fund"
      )
    })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("keeps empty create defaults when For Revision has no prior progress updates (T1/V2)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject({ progress_pct: 25 })]
    store.updates = []
    store.expenses = []

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText(/update notes/i)).toHaveValue("")
    expect(within(dialog).getByText(/Progress: 25%/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^amount \(php\)$/i)).toHaveValue(null)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows existingNames for site photo and completion docs on For Revision open (T2/V3/V11)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject({ progress_pct: 100 })]
    store.updates = [
      latestProgressUpdate({
        to_pct: 100,
        certification_completion: ["cert-on-record.pdf"],
        certificate_acceptance: ["accept-on-record.pdf"],
        proof_payment_barangay: ["pay-on-record.pdf"],
        acknowledgment_completion: ["ack-on-record.pdf"],
        audit_documents: ["audit-on-record.pdf"],
        verification_documents: ["verify-on-record.pdf"],
        liquidation_documents: ["liq-on-record.pdf"],
      }),
    ]
    store.expenses = [latestExpense()]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByText(/on record: site-on-record\.jpg/i)
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(/on record: cert-on-record\.pdf/i)
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(/on record: liq-on-record\.pdf/i)
    ).toBeInTheDocument()
  })

  it("saves For Revision without new files when server filenames exist (T2/V3/V12)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject({ progress_pct: 75 })]
    store.updates = [latestProgressUpdate()]
    store.expenses = [latestExpense()]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(createMock).not.toHaveBeenCalled()
    const [updateId, payload] = progressUpdateMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(updateId).toBe("pu-latest")
    expect(payload).toEqual({
      project: "1",
      to_pct: 75,
      notes: "Prior revision notes",
    })
    expect(payload).not.toBeInstanceOf(FormData)
  })

  it("includes new site_photo File[] on For Revision update when user picks files", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject({ progress_pct: 75 })]
    store.updates = [latestProgressUpdate()]
    store.expenses = [latestExpense()]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("replacement-site.jpg", "image/jpeg")
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(createMock).not.toHaveBeenCalled()
    const [updateId, payload] = progressUpdateMock.mock.calls[0] as [
      string,
      FormData,
    ]
    expect(updateId).toBe("pu-latest")
    const sitePhotos = payload.getAll("site_photo")
    expect(sitePhotos).toHaveLength(1)
    expect(sitePhotos[0]).toBeInstanceOf(File)
    expect((sitePhotos[0] as File).name).toBe("replacement-site.jpg")
  })

  it("still requires site photo File[] on non-revision create path (T2/V12)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    expect(await screen.findByText(/site photo is required/i)).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
    expect(progressUpdateMock).not.toHaveBeenCalled()
  })

  it("updates latest progress row and skips identical expense on For Revision save (T3/V4/V5/V9)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = [latestExpense({ progress_update: "pu-latest" })]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    expect(screen.getByLabelText(/^expense date$/i)).toHaveValue("2026-07-20")
    await user.clear(screen.getByLabelText(/update notes/i))
    await user.type(screen.getByLabelText(/update notes/i), "Revised notes only")
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
      expect(projectUpdateMock).not.toHaveBeenCalled()
    })
    expect(createMock).not.toHaveBeenCalled()
    expect(expenseCreateMock).not.toHaveBeenCalled()
    const payload = progressUpdateMock.mock.calls[0]?.[1] as Record<
      string,
      unknown
    >
    expect(payload).toEqual({
      project: "1",
      to_pct: 75,
      notes: "Revised notes only",
    })
  })

  it("should allow For Revision notes-only save when legacy expense has blank receipt and description", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = [
      latestExpense({
        progress_update: "pu-latest",
        receipt_number: "",
        description: "",
      }),
    ]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText(/^receipt number$/i)).toHaveValue("")
    expect(within(dialog).getByLabelText(/^description$/i)).toHaveValue("")
    await user.clear(within(dialog).getByLabelText(/update notes/i))
    await user.type(
      within(dialog).getByLabelText(/update notes/i),
      "Notes only — legacy blank release"
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(expenseCreateMock).not.toHaveBeenCalled()
    expect(
      screen.queryByText(/receipt number is required/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/description is required/i)
    ).not.toBeInTheDocument()
  })

  it("should block For Revision when amount changes but receipt stays blank", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = [
      latestExpense({
        receipt_number: "",
        description: "",
      }),
    ]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    const amount = screen.getByLabelText(/^amount \(php\)$/i)
    await user.clear(amount)
    await user.type(amount, "2000")
    await user.click(screen.getByRole("button", { name: /save update/i }))

    expect(
      await screen.findByText(/receipt number is required/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/description is required/i)).toBeInTheDocument()
    expect(progressUpdateMock).not.toHaveBeenCalled()
    expect(expenseCreateMock).not.toHaveBeenCalled()
  })

  it("normalizes PB datetime expense date on For Revision open and skips identical create (retain-release V1/V2/V7)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = [
      latestExpense({
        progress_update: "pu-latest",
        date: "2026-07-20 00:00:00.000Z",
      }),
    ]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText(/^expense date$/i)).toHaveValue(
      "2026-07-20"
    )
    await user.clear(within(dialog).getByLabelText(/update notes/i))
    await user.type(
      within(dialog).getByLabelText(/update notes/i),
      "Notes only — keep release"
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(expenseCreateMock).not.toHaveBeenCalled()
  })

  it("skips identical expense when latest main_account is legacy Other (retain-release)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = [
      latestExpense({
        progress_update: "pu-latest",
        main_account: "Other",
        sub_account: "Legacy other purpose",
      }),
    ]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )

    const dialog = await screen.findByRole("dialog")
    await waitFor(() => {
      expect(
        within(dialog).getByLabelText(/^main account$/i)
      ).toHaveTextContent("Others")
    })
    expect(within(dialog).getByLabelText(/^other purpose$/i)).toHaveValue(
      "Legacy other purpose"
    )
    await user.clear(within(dialog).getByLabelText(/update notes/i))
    await user.type(
      within(dialog).getByLabelText(/update notes/i),
      "Keep legacy Other release"
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(expenseCreateMock).not.toHaveBeenCalled()
  })

  it("creates progress update when For Revision has empty history (T3/V5)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject({ progress_pct: 25 })]
    store.updates = []
    store.expenses = []

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
    })
    expect(progressUpdateMock).not.toHaveBeenCalled()
  })

  it("should patch the bound expense when For Revision amount changes", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = [
      latestExpense({
        progress_update: "pu-latest",
      }),
    ]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    const amount = screen.getByLabelText(/^amount \(php\)$/i)
    await user.clear(amount)
    await user.type(amount, "2000")
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(expenseUpdateMock).toHaveBeenCalledWith(
        "be-latest",
        expect.objectContaining({
          amount: 2000,
        })
      )
    })
    expect(expenseCreateMock).not.toHaveBeenCalled()
  })

  it("should patch the reloaded expense when CREATE hits a unique progress_update", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = []
    expenseCreateMock.mockRejectedValueOnce({
      data: {
        data: {
          progress_update: {
            code: "validation_not_unique",
            message: "Value must be unique.",
          },
        },
      },
      message: "Failed to create record.",
    })
    expenseGetFirstListItemMock.mockResolvedValueOnce({
      id: "be-raced",
      collectionId: "budget_expenses",
      collectionName: "budget_expenses",
      project: "1",
      amount: 1500,
      year: 2026,
      main_account: "General Fund",
      sub_account: "GF - Proper",
      date: "2026-07-20",
      receipt_number: "OR-1500",
      description: "Release for progress",
      progress_update: "pu-latest",
    })

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
      expect(expenseGetFirstListItemMock).toHaveBeenCalledWith(
        'progress_update="pu-latest"'
      )
      expect(expenseUpdateMock).toHaveBeenCalledWith(
        "be-raced",
        expect.objectContaining({
          amount: 1500,
        })
      )
    })
    expect(expenseCreateMock).toHaveBeenCalledTimes(1)
  }, 20_000)

  it("creates expense when For Revision released amount differs from latest (T3/V4)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = [latestExpense()]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    const amount = screen.getByLabelText(/^amount \(php\)$/i)
    await user.clear(amount)
    await user.type(amount, "2000")
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          amount: 2000,
        })
      )
    })
  })

  it("creates expense when For Revision has no prior expense (T3/V9)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = []

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
    })
  }, 20_000)

  it("should bind Released Amount to the updated progress row when For Revision records an expense", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = []

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          progress_update: "pu-latest",
        })
      )
    })
  }, 20_000)

  it("keeps dialog open and does not delete progress when expense fails after For Revision update (T3/V7)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = []
    expenseCreateMock.mockRejectedValueOnce(new Error("Released amount sync failed"))

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText(/released amount sync failed/i)).toBeInTheDocument()
    })
    expect(progressUpdateMock).not.toHaveBeenCalled()
    expect(deleteMock).not.toHaveBeenCalled()
  }, 20_000)

  it("should create a bind when latest expense is not this progress even if amounts match", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = [
      latestExpense({
        progress_update: "pu-older",
        amount: 1500,
        year: 2026,
        main_account: "General Fund",
        sub_account: "GF - Proper",
        date: "2026-07-20",
        receipt_number: "OR-1500",
        description: "Release for progress",
      }),
    ]

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          amount: 1500,
          progress_update: "pu-latest",
        })
      )
    })
    expect(progressUpdateMock).toHaveBeenCalledTimes(1)
  }, 20_000)

  it("should refuse unique-conflict expense update when existing project differs", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = []
    expenseCreateMock.mockRejectedValueOnce({
      data: {
        data: {
          progress_update: {
            code: "validation_not_unique",
            message: "Value must be unique.",
          },
        },
      },
      message: "Failed to create record.",
    })
    expenseGetFirstListItemMock.mockResolvedValueOnce({
      id: "be-other",
      collectionId: "budget_expenses",
      collectionName: "budget_expenses",
      project: "other-project",
      amount: 1500,
      year: 2026,
      main_account: "General Fund",
      sub_account: "GF - Proper",
      date: "2026-07-20",
      receipt_number: "OR-1500",
      description: "Release for progress",
      progress_update: "pu-latest",
    })

    render(<ProgressModule />)

    await user.click(
      within(await screen.findByTestId("progress-row-1")).getByRole("button", {
        name: /update progress/i,
      })
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
      expect(expenseGetFirstListItemMock).toHaveBeenCalled()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(
        screen.getByText(/bound to another project/i)
      ).toBeInTheDocument()
    })
    expect(expenseUpdateMock).not.toHaveBeenCalled()
    expect(progressUpdateMock).not.toHaveBeenCalled()
  }, 20_000)

  it("keeps blank open and create save path for non–For Revision projects (T4/V6)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 25,
        ...barangayScope,
      },
    ]
    store.updates = [
      latestProgressUpdate({
        notes: "Should not prefill Ongoing",
        to_pct: 60,
      }),
    ]
    store.expenses = [latestExpense({ amount: 9999, receipt_number: "SKIP" })]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /update progress/i }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText(/update notes/i)).toHaveValue("")
    expect(within(dialog).getByText(/Progress: 60%/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^amount \(php\)$/i)).toHaveValue(null)
    expect(
      within(dialog).queryByText(/on record: site-on-record\.jpg/i)
    ).not.toBeInTheDocument()

    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await fillRequiredReleasedAmount(user)
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
    })
    expect(progressUpdateMock).not.toHaveBeenCalled()
  })
})
