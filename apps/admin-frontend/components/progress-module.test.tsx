import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
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
const deleteMock = vi.fn()

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
      create: (payload: unknown) => {
        if (name === "budget_expenses") {
          return expenseCreateMock(payload)
        }
        return createMock(payload)
      },
      update: (id: string, payload: unknown) => {
        if (name === "progress_updates") {
          return progressUpdateMock(id, payload)
        }
        return projectUpdateMock(id, payload)
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
    await user.click(screen.getByLabelText(/^main account$/i))
    await user.click(screen.getByRole("option", { name: "General Fund" }))
    await user.click(screen.getByLabelText(/^sub account$/i))
    await user.click(screen.getByRole("option", { name: "GF - Proper" }))
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
        screen.getByText(/click to upload or drag an image here/i)
      ).toBeInTheDocument()
    })
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

  it("uses the latest progress update for the visible project meter", async () => {
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
    expect(within(row).getByText(/^75%$/)).toBeInTheDocument()
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

  it("saves a progress update without client projects.update for Barangay (hook owns Ready for Review)", async () => {
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

  it("hides Update Progress when effective progress is ≥100 except For Revision (V4)", async () => {
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
        status: "Ready for Review",
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
      within(stuckRow).queryByRole("button", { name: /update progress/i })
    ).not.toBeInTheDocument()

    const readyRow = await screen.findByTestId("progress-row-ready")
    expect(
      within(readyRow).queryByRole("button", { name: /update progress/i })
    ).not.toBeInTheDocument()

    const revisionRow = await screen.findByTestId("progress-row-revision")
    expect(
      within(revisionRow).getByRole("button", { name: /update progress/i })
    ).toBeInTheDocument()
  })

  it("hides Update Progress in detail panel when ≥100 except For Revision (V4)", async () => {
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
      within(stuckDetail).queryByRole("button", { name: /update progress/i })
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByTestId("progress-detail-panel")).queryByRole(
        "button",
        { name: /update progress/i, hidden: true }
      )
    ).not.toBeInTheDocument()
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

  it("blocks openUpdateModal for ≥100 Planning and opens for For Revision (V4)", async () => {
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
    expect(
      within(stuckRow).queryByRole("button", { name: /update progress/i })
    ).not.toBeInTheDocument()

    const revisionRow = await screen.findByTestId("progress-row-revision")
    await user.click(
      within(revisionRow).getByRole("button", { name: /update progress/i })
    )

    expect(
      await screen.findByRole("dialog", { name: /update progress/i })
    ).toBeInTheDocument()
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
          status: "Ready for Review",
        })
      )
    })
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

  it("lets Barangay update a For Revision project without client projects.update (hook owns Ready for Review)", async () => {
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

  it("keeps final Completed projects read-only for Barangay progress users", async () => {
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
      within(row).queryByRole("button", { name: /update progress/i })
    ).not.toBeInTheDocument()
    expect(
      within(row).getByRole("button", { name: /view details/i })
    ).toBeInTheDocument()
  })

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
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "1",
          amount: 1500,
          receipt_number: "007",
          main_account: "General Fund",
          sub_account: "GF - Proper",
        })
      )
    })
  })

  it("does not show embedded released amount fields for Province users", async () => {
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

    await screen.findByText("Bridge")
    expect(screen.queryByTestId("update-released-amount")).not.toBeInTheDocument()
    expect(screen.queryByTestId("progress-released-amount-fields")).not.toBeInTheDocument()
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
          main_account: "General Fund",
          sub_account: "GF - Proper",
        })
      )
    })
  })

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
  })

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
      FormData,
    ]
    expect(updateId).toBe("pu-latest")
    expect(payload.get("to_pct")).toBe("75")
    expect(payload.get("notes")).toBe("Prior revision notes")
    expect(payload.get("from_pct")).toBeNull()
    expect(payload.getAll("site_photo")).toHaveLength(0)
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
    store.expenses = [latestExpense()]

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
    const payload = progressUpdateMock.mock.calls[0]?.[1] as FormData
    expect(payload.get("notes")).toBe("Revised notes only")
    expect(payload.get("from_pct")).toBeNull()
  })

  it("normalizes PB datetime expense date on For Revision open and skips identical create (retain-release V1/V2/V7)", async () => {
    const user = userEvent.setup()
    useBarangayActor()
    store.projects = [revisionProject()]
    store.updates = [latestProgressUpdate()]
    store.expenses = [
      latestExpense({ date: "2026-07-20 00:00:00.000Z" }),
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
  })

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
      expect(progressUpdateMock).toHaveBeenCalledTimes(1)
      expect(expenseCreateMock).toHaveBeenCalledTimes(1)
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText(/released amount sync failed/i)).toBeInTheDocument()
    })
    expect(deleteMock).not.toHaveBeenCalled()
  })

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
