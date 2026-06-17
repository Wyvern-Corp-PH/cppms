import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

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
const updateMock = vi.fn()

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () =>
        name === "projects" ? store.projects : []
      ),
      create: createMock,
      update: updateMock,
      delete: vi.fn(),
    }),
  }),
}))

import { ProjectsModule } from "./projects-module"

describe("ProjectsModule (J4)", () => {
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
    createMock.mockClear()
    updateMock.mockClear()
  })

  it("opens the create project modal with save affordance", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /^save$/i })
      ).toBeInTheDocument()
    })
  })

  it("shows From and To labels on date range filters", async () => {
    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.getByLabelText(/^from:$/i)).toHaveAttribute(
        "id",
        "filter-date-from"
      )
      expect(screen.getByLabelText(/^to:$/i)).toHaveAttribute(
        "id",
        "filter-date-to"
      )
      expect(screen.getByLabelText(/^filter from date$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^filter to date$/i)).toBeInTheDocument()
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

  it("requires number of students when editing a Scholarship project", async () => {
    const user = userEvent.setup()
    store.projects.push({
      id: "1",
      collectionId: "p",
      collectionName: "projects",
      created: "",
      updated: "",
      name: "Scholarship Batch",
      category: "Scholarship",
      status: "Planning",
      budget_year: 2026,
      progress_pct: 0,
    })

    render(<ProjectsModule />)

    await user.click(
      await screen.findByRole("button", {
        name: /actions for scholarship batch/i,
      })
    )
    await user.click(await screen.findByRole("menuitem", { name: /^edit$/i }))

    expect(screen.getByLabelText(/number of students/i)).toHaveAttribute(
      "type",
      "number"
    )

    await user.click(screen.getByRole("button", { name: /^save$/i }))

    expect(
      await screen.findByText(/number of students is required/i)
    ).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })
})
