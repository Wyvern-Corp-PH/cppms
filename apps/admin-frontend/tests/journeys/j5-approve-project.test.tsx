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
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () => (name === "projects" ? store.projects : [])),
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

  it("approves a completed project and sets status Approved", async () => {
    const user = userEvent.setup()
    render(<ApprovalsModule />)

    await user.click(await screen.findByRole("button", { name: /approve/i }))
    await user.type(screen.getByLabelText(/authority name/i), "Provincial Engineer")
    await user.click(screen.getByTestId("confirm-approval-action"))

    await waitFor(() => {
      expect(store.projects[0]?.status).toBe("Approved")
    })
  })
})
