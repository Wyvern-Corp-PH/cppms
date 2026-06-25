import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [
    {
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Review Ready Bridge",
      category: "Infrastructure",
      status: "Ready for Review",
      municipality: "Tuguegarao City",
      barangay: "Centro 01 (Bagumbayan)",
      budget_year: 2026,
      progress_pct: 100,
      approval_status: "pending",
    },
  ] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  actions: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  authRecord: {
    id: "province-user",
    email: "province@example.test",
    name: "Province Reviewer",
    role: "Province",
    account_status: "Active",
  } as Record<string, unknown> | null,
}

const updateMock = vi.fn(
  async (id: string, payload: Record<string, unknown>) => {
    const index = store.projects.findIndex((row) => row.id === id)
    store.projects[index] = { ...store.projects[index], ...payload }
    return store.projects[index]
  }
)

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: store.authRecord,
    },
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "progress_updates") return store.updates
        if (name === "approval_actions") return store.actions
        if (name === "locations") return store.locations
        return []
      }),
      create: vi.fn(async (payload: Record<string, unknown>) => {
        store.actions.push(payload)
        return payload
      }),
      update: updateMock,
    }),
  }),
}))

import { ApprovalsModule } from "./approvals-module"

async function chooseDateRange(user: ReturnType<typeof userEvent.setup>, from: string, to: string) {
  await user.click(screen.getByRole("button", { name: /pick date range/i }))
  await user.type(screen.getByLabelText(/from date/i), from)
  await user.type(screen.getByLabelText(/to date/i), to)
}

async function submitRequestRevision(
  user: ReturnType<typeof userEvent.setup>,
  card: HTMLElement
) {
  await user.click(within(card).getByRole("button", { name: /request revision/i }))
  expect(
    await screen.findByRole("dialog", { name: /request revision/i })
  ).toBeInTheDocument()
  await user.type(
    await screen.findByLabelText(/reviewing authority name/i),
    "Provincial Engineer"
  )
  await user.type(
    await screen.findByLabelText(/revision notes/i),
    "Please upload clearer liquidation docs."
  )
  await user.click(screen.getByTestId("confirm-approval-action"))
}

describe("ApprovalsModule (J5, V5)", () => {
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
    process.env.NEXT_PUBLIC_POCKETBASE_URL = "http://localhost:8090"
    store.actions = []
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-18T00:00:00.000Z",
        updated: "",
        project: "1",
        from_pct: 95,
        to_pct: 100,
        site_photo: "",
        certification_completion: "certification.pdf",
        certificate_acceptance: "acceptance.pdf",
        proof_payment_barangay: "payment.pdf",
        acknowledgment_completion: "acknowledgment.pdf",
        audit_documents: ["audit.pdf"],
        verification_documents: ["verification.pdf"],
        liquidation_documents: ["liquidation.pdf"],
      },
    ]
    updateMock.mockClear()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Review Ready Bridge",
        category: "Infrastructure",
        status: "Ready for Review",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        progress_pct: 100,
        approval_status: "pending",
      },
    ]
    store.authRecord = {
      id: "province-user",
      email: "province@example.test",
      name: "Province Reviewer",
      role: "Province",
      account_status: "Active",
    }
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
  })

  it("approves a review-ready project and updates status to Completed", async () => {
    const user = userEvent.setup()
    render(<ApprovalsModule />)

    await user.click(await screen.findByRole("button", { name: /approve/i }))
    await user.type(
      screen.getByLabelText(/authority name/i),
      "Provincial Engineer"
    )
    await user.click(screen.getByTestId("confirm-approval-action"))

    await waitFor(() => {
      expect(store.projects[0]?.status).toBe("Completed")
      expect(store.actions[0]?.action).toBe("approve")
      expect(updateMock).toHaveBeenCalledWith(
        "1",
        expect.not.objectContaining({ approved_by: "Provincial Engineer" })
      )
    })
  })

  it("shows approval actions only to Province users and includes request revision", async () => {
    const user = userEvent.setup()
    render(<ApprovalsModule />)

    const card = await screen.findByTestId("approval-card-1")
    expect(within(card).getByRole("button", { name: /^approve$/i })).toBeInTheDocument()
    expect(within(card).getByRole("button", { name: /^reject$/i })).toBeInTheDocument()
    expect(
      within(card).getByRole("button", { name: /request revision/i })
    ).toBeInTheDocument()

    await submitRequestRevision(user, card)

    await waitFor(() => {
      expect(store.actions[0]).toMatchObject({
        action: "request_revision",
        reason: "Please upload clearer liquidation docs.",
      })
      expect(store.projects[0]?.status).toBe("For Revision")
    })
  })

  it("shows Barangay users status-only approval cards", async () => {
    store.authRecord = {
      id: "barangay-user",
      email: "barangay@example.test",
      name: "Barangay Encoder",
      role: "Barangay",
      account_status: "Active",
      municipality: "Tuguegarao City",
      barangay: "Centro 01 (Bagumbayan)",
    }

    render(<ApprovalsModule />)

    const card = await screen.findByTestId("approval-card-1")
    expect(within(card).getByRole("button", { name: /view details/i })).toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()
    expect(
      within(card).queryByRole("button", { name: /request revision/i })
    ).not.toBeInTheDocument()
  })

  it("shows Municipality users only own-municipality read-only approval cards", async () => {
    store.authRecord = {
      id: "municipality-user",
      email: "municipality@example.test",
      name: "Municipal Viewer",
      role: "Municipality",
      account_status: "Active",
      municipality: "Tuguegarao City",
    }
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ready for Review",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        progress_pct: 100,
        approval_status: "pending",
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ready for Review",
        municipality: "Lasam",
        barangay: "Centro",
        budget_year: 2026,
        progress_pct: 100,
        approval_status: "pending",
      },
    ]

    render(<ApprovalsModule />)

    const card = await screen.findByTestId("approval-card-1")
    expect(within(card).getByText("City Bridge")).toBeInTheDocument()
    expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
    expect(within(card).getByRole("button", { name: /view details/i })).toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()
    expect(
      within(card).queryByRole("button", { name: /request revision/i })
    ).not.toBeInTheDocument()
  })

  it("hides approval actions when no authenticated Province actor is present", async () => {
    store.authRecord = null

    render(<ApprovalsModule />)

    const card = await screen.findByTestId("approval-card-1")
    expect(within(card).getByText("Ready for Review")).toBeInTheDocument()
    expect(within(card).getByRole("button", { name: /view details/i })).toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()
    expect(
      within(card).queryByRole("button", { name: /request revision/i })
    ).not.toBeInTheDocument()
  })

  it("shows completed projects as read-only entries", async () => {
    const user = userEvent.setup()
    store.projects[0] = {
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
      approval_status: "approved",
    }

    render(<ApprovalsModule />)

    await user.click(await screen.findByRole("tab", { name: /^completed$/i }))

    const card = await screen.findByTestId("approval-card-1")
    expect(
      within(card).getByRole("button", { name: /view details/i })
    ).toBeInTheDocument()
    expect(
      within(card).queryByRole("button", { name: /^approve$/i })
    ).not.toBeInTheDocument()
    expect(
      within(card).queryByRole("button", { name: /^reject$/i })
    ).not.toBeInTheDocument()

    await user.click(
      within(card).getByRole("button", { name: /view details/i })
    )

    const detail = screen.getByTestId("approval-detail-panel")
    expect(
      within(detail).queryByRole("button", { name: /^approve$/i })
    ).not.toBeInTheDocument()
    expect(
      within(detail).queryByRole("button", { name: /^reject$/i })
    ).not.toBeInTheDocument()
  })

  it("shows for-revision projects in their own read-only tab with latest revision note", async () => {
    const user = userEvent.setup()
    store.projects[0] = {
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
      approval_status: "pending",
    }
    store.actions = [
      {
        id: "a1",
        collectionId: "actions",
        collectionName: "approval_actions",
        project: "1",
        action: "request_revision",
        authority_name: "Provincial Engineer",
        reason: "Please upload clearer liquidation docs.",
        created: "2026-06-25T00:00:00.000Z",
      },
    ]

    render(<ApprovalsModule />)

    await waitFor(() => {
      expect(screen.getByTestId("approvals-queue")).toHaveTextContent("0")
      expect(screen.getByTestId("approvals-for-revision")).toHaveTextContent("1")
    })

    await user.click(await screen.findByRole("tab", { name: /for revision/i }))

    const card = await screen.findByTestId("approval-card-1")
    expect(within(card).getByText("For Revision")).toBeInTheDocument()
    expect(
      within(card).getByText("Please upload clearer liquidation docs.")
    ).toBeInTheDocument()
    expect(
      within(card).getByRole("button", { name: /view details/i })
    ).toBeInTheDocument()
    expect(
      within(card).queryByRole("button", { name: /^approve$/i })
    ).not.toBeInTheDocument()
    expect(
      within(card).queryByRole("button", { name: /^reject$/i })
    ).not.toBeInTheDocument()
    expect(
      within(card).queryByRole("button", { name: /request revision/i })
    ).not.toBeInTheDocument()

    await user.click(within(card).getByRole("button", { name: /view details/i }))

    const detail = screen.getByTestId("approval-detail-panel")
    expect(
      within(detail).getByText("Please upload clearer liquidation docs.")
    ).toBeInTheDocument()
    expect(
      within(detail).queryByRole("button", { name: /^approve$/i })
    ).not.toBeInTheDocument()
    expect(
      within(detail).queryByRole("button", { name: /^reject$/i })
    ).not.toBeInTheDocument()
  })

  it("filters approval cards by municipality and scoped barangay", async () => {
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
        status: "Ready for Review",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        progress_pct: 100,
        approval_status: "pending",
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ready for Review",
        municipality: "Lasam",
        barangay: "Centro",
        budget_year: 2026,
        progress_pct: 100,
        approval_status: "pending",
      },
    ]

    render(<ApprovalsModule />)

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

  it("filters approval queue and summary by completion update date range", async () => {
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
        status: "Ready for Review",
        budget_year: 2026,
        total_budget: 100_000,
        progress_pct: 100,
        approval_status: "pending",
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ready for Review",
        budget_year: 2026,
        total_budget: 300_000,
        progress_pct: 100,
        approval_status: "pending",
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-12T00:00:00.000Z",
        project: "1",
        from_pct: 90,
        to_pct: 100,
        site_photo: "",
        certification_completion: "certification.pdf",
        certificate_acceptance: "acceptance.pdf",
        proof_payment_barangay: "payment.pdf",
        acknowledgment_completion: "acknowledgment.pdf",
        audit_documents: ["audit.pdf"],
        verification_documents: ["verification.pdf"],
        liquidation_documents: ["liquidation.pdf"],
      },
      {
        id: "u2",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-07-12T00:00:00.000Z",
        project: "2",
        from_pct: 90,
        to_pct: 100,
        site_photo: "",
        certification_completion: "certification.pdf",
        certificate_acceptance: "acceptance.pdf",
        proof_payment_barangay: "payment.pdf",
        acknowledgment_completion: "acknowledgment.pdf",
        audit_documents: ["audit.pdf"],
        verification_documents: ["verification.pdf"],
        liquidation_documents: ["liquidation.pdf"],
      },
    ]

    render(<ApprovalsModule />)

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.getByText("Lasam School")).toBeInTheDocument()
      expect(screen.getByTestId("approvals-queue")).toHaveTextContent("2")
      expect(screen.getByTestId("approvals-for-revision")).toHaveTextContent("0")
    })

    await chooseDateRange(user, "2026-06-01", "2026-06-30")

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
      expect(screen.getByTestId("approvals-queue")).toHaveTextContent("1")
      expect(screen.getByTestId("approvals-for-revision")).toHaveTextContent("0")
    })
  })

  it("does not list rejected completed projects in the completion queue", async () => {
    const user = userEvent.setup()
    store.projects[0] = {
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Rejected Bridge",
      category: "Infrastructure",
      status: "Ready for Review",
      budget_year: 2026,
      progress_pct: 100,
      approval_status: "rejected",
      rejection_reason: "Missing final inspection report.",
    }

    render(<ApprovalsModule />)

    await waitFor(() => {
      expect(screen.getByTestId("approvals-queue")).toHaveTextContent("0")
      expect(screen.getByTestId("approvals-rejected")).toHaveTextContent("1")
    })

    expect(screen.queryByTestId("approval-card-1")).not.toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: /^rejected$/i }))

    expect(await screen.findByTestId("approval-card-1")).toBeInTheDocument()
  })

  it("shows rejection reason without actions on rejected entries", async () => {
    const user = userEvent.setup()
    store.projects[0] = {
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Rejected Bridge",
      category: "Infrastructure",
      status: "Rejected",
      budget_year: 2026,
      progress_pct: 100,
      approval_status: "rejected",
      rejection_reason: "Missing final inspection report.",
    }

    render(<ApprovalsModule />)

    await user.click(await screen.findByRole("tab", { name: /^rejected$/i }))

    const card = await screen.findByTestId("approval-card-1")
    expect(within(card).getByText(/reason for rejection/i)).toBeInTheDocument()
    expect(
      within(card).getByText("Missing final inspection report.")
    ).toBeInTheDocument()
    expect(
      within(card).queryByTestId("missing-docs-banner")
    ).not.toBeInTheDocument()
    expect(
      within(card).getByRole("button", { name: /view details/i })
    ).toBeInTheDocument()
    expect(
      within(card).queryByRole("button", { name: /^approve$/i })
    ).not.toBeInTheDocument()
    expect(
      within(card).queryByRole("button", { name: /^reject$/i })
    ).not.toBeInTheDocument()

    await user.click(
      within(card).getByRole("button", { name: /view details/i })
    )

    const detail = screen.getByTestId("approval-detail-panel")
    expect(
      within(detail).getByText(/reason for rejection/i)
    ).toBeInTheDocument()
    expect(
      within(detail).queryByText(/no completion documents were uploaded/i)
    ).not.toBeInTheDocument()
    expect(
      within(detail).queryByRole("button", { name: /^approve$/i })
    ).not.toBeInTheDocument()
    expect(
      within(detail).queryByRole("button", { name: /^reject$/i })
    ).not.toBeInTheDocument()
  })

  it("blocks approval when a 100% project is missing completion documents", async () => {
    const user = userEvent.setup()
    store.updates = []
    render(<ApprovalsModule />)

    await user.click(await screen.findByRole("button", { name: /^approve$/i }))
    expect(screen.getByText(/provincial admin review/i)).toBeInTheDocument()
    await user.type(
      screen.getByLabelText(/authority name/i),
      "Provincial Engineer"
    )
    await user.click(screen.getByTestId("confirm-approval-action"))

    expect(
      await screen.findByText(/certification of completion is missing/i)
    ).toBeInTheDocument()
    expect(store.actions).toHaveLength(0)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("shows uploaded completion documents while pending approval", async () => {
    const user = userEvent.setup()
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-18T00:00:00.000Z",
        updated: "",
        project: "1",
        from_pct: 95,
        to_pct: 100,
        site_photo: "site.jpg",
        certification_completion: "certification.pdf",
        certificate_acceptance: "acceptance.pdf",
        proof_payment_barangay: "payment.pdf",
        acknowledgment_completion: "acknowledgment.pdf",
        audit_documents: ["audit.pdf"],
        verification_documents: ["verification.pdf"],
        liquidation_documents: ["liquidation.pdf"],
      },
    ]

    render(<ApprovalsModule />)

    const card = await screen.findByTestId("approval-card-1")
    await user.click(
      within(card).getByRole("button", { name: /view details/i })
    )

    const detail = screen.getByTestId("approval-detail-panel")
    expect(
      within(detail).getByText(/completion documents/i)
    ).toBeInTheDocument()
    expect(within(detail).getByText(/certification\.pdf/i)).toBeInTheDocument()
    expect(within(detail).getByText(/liquidation\.pdf/i)).toBeInTheDocument()
    expect(within(detail).queryByText(/missing/i)).not.toBeInTheDocument()
  })
})
