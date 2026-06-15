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
  actions: [] as Array<Record<string, unknown>>,
}

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
      update: vi.fn(async (id: string, payload: Record<string, unknown>) => {
        const index = store.projects.findIndex((row) => row.id === id)
        store.projects[index] = { ...store.projects[index], ...payload }
        return store.projects[index]
      }),
    }),
  }),
}))

import { ApprovalsModule } from "./approvals-module"

describe("ApprovalsModule (J5, V5)", () => {
  beforeEach(() => {
    store.actions = []
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
    })
  })
})
