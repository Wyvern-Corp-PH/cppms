import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
}

const createMock = vi.fn(async (payload: Record<string, unknown>) => {
  const record = {
    id: String(store.projects.length + 1),
    collectionId: "p",
    collectionName: "projects",
    created: "",
    updated: "",
    progress_pct: 0,
    ...payload,
  }
  store.projects.push(record)
  return record
})

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () => (name === "projects" ? store.projects : [])),
      create: createMock,
      update: vi.fn(),
      delete: vi.fn(),
    }),
  }),
}))

import { ProjectsModule } from "./projects-module"

describe("ProjectsModule (J4)", () => {
  beforeEach(() => {
    store.projects = []
    createMock.mockClear()
  })

  it("opens the create project modal with save affordance", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument()
    })
  })

  it("persists a created project to the list", async () => {
    store.projects.push({
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "New Bridge",
      category: "Infrastructure",
      status: "Planning",
      budget_year: 2026,
      progress_pct: 0,
    })

    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.getByText("New Bridge")).toBeInTheDocument()
    })
  })
})
