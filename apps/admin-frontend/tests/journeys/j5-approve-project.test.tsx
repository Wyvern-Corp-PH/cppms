import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"

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
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: {
        id: "province-user",
        email: "province@example.test",
        name: "Province Reviewer",
        role: "Province",
        account_status: "Active",
      },
    },
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "progress_updates") return store.updates
        return []
      }),
      create: vi.fn(),
      update: vi.fn(async (id: string, payload: Record<string, unknown>) => {
        const index = store.projects.findIndex((row) => row.id === id)
        store.projects[index] = { ...store.projects[index], ...payload }
        return store.projects[index]
      }),
    }),
  }),
}))

import { ApprovalsModule } from "@/components/approvals-module"

describe("J5 approve completed project journey", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_POCKETBASE_URL = "http://localhost:8090"
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
  })

  it("approves a completed project and sets status Approved", async () => {
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
    })
  })
})
