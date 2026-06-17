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
  actions: [] as Array<Record<string, unknown>>,
}

const updateMock = vi.fn(async (id: string, payload: Record<string, unknown>) => {
  const index = store.projects.findIndex((row) => row.id === id)
  store.projects[index] = { ...store.projects[index], ...payload }
  return store.projects[index]
})

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
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
    store.actions = []
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
    await user.type(screen.getByLabelText(/authority name/i), "Provincial Engineer")
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
    expect(within(card).getByRole("button", { name: /view details/i })).toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()

    await user.click(within(card).getByRole("button", { name: /view details/i }))

    const detail = screen.getByTestId("approval-detail-panel")
    expect(within(detail).queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument()
    expect(within(detail).queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()
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
    expect(within(card).getByText("Missing final inspection report.")).toBeInTheDocument()
    expect(within(card).queryByTestId("missing-docs-banner")).not.toBeInTheDocument()
    expect(within(card).getByRole("button", { name: /view details/i })).toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()

    await user.click(within(card).getByRole("button", { name: /view details/i }))

    const detail = screen.getByTestId("approval-detail-panel")
    expect(within(detail).getByText(/reason for rejection/i)).toBeInTheDocument()
    expect(
      within(detail).queryByText(/no completion documents were uploaded/i)
    ).not.toBeInTheDocument()
    expect(within(detail).queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument()
    expect(within(detail).queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()
  })
})
