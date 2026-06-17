import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [
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
      approval_status: "pending",
    },
  ] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  actions: [] as Array<Record<string, unknown>>,
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
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "progress_updates") return store.updates
        if (name === "approval_actions") return store.actions
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

describe("ApprovalsModule (J5, V5)", () => {
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
      approval_status: "pending",
    }
  })

  it("approves a completed project and updates status to Approved", async () => {
    const user = userEvent.setup()
    render(<ApprovalsModule />)

    await user.click(await screen.findByRole("button", { name: /approve/i }))
    await user.type(
      screen.getByLabelText(/authority name/i),
      "Provincial Engineer"
    )
    await user.click(screen.getByTestId("confirm-approval-action"))

    await waitFor(() => {
      expect(store.projects[0]?.status).toBe("Approved")
      expect(store.actions[0]?.action).toBe("approve")
      expect(updateMock).toHaveBeenCalledWith(
        "1",
        expect.not.objectContaining({ approved_by: "Provincial Engineer" })
      )
    })
  })

  it("shows approved projects as read-only entries", async () => {
    const user = userEvent.setup()
    store.projects[0] = {
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Approved Bridge",
      category: "Infrastructure",
      status: "Approved",
      budget_year: 2026,
      progress_pct: 100,
      approval_status: "approved",
    }

    render(<ApprovalsModule />)

    await user.click(await screen.findByRole("tab", { name: /^approved$/i }))

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
      status: "Completed",
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
