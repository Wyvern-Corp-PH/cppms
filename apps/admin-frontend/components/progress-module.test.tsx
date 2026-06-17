import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "progress_updates") return store.updates
        return []
      }),
      create: vi.fn(),
      update: vi.fn(),
    }),
  }),
}))

import { ProgressModule } from "./progress-module"

describe("ProgressModule (V81, V84)", () => {
  it("shows drag-and-drop site photo upload in update modal", async () => {
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
    store.updates = []

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /update progress/i }))

    await waitFor(() => {
      expect(screen.getByText(/click to upload or drag an image here/i)).toBeInTheDocument()
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
})
