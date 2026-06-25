import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

import {
  canAccess,
  filterProjectsForUser,
} from "@workspace/pocketbase/domain/access-control"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  authRecord: {
    id: "m1",
    role: "Municipality",
    account_status: "Active",
    municipality: "Tuguegarao City",
  } as Record<string, unknown> | null,
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: store.authRecord,
    },
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "locations") return store.locations
        return []
      }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }),
  }),
}))

import { ProjectsModule } from "@/components/projects-module"

describe("J13 role-scoped access journey", () => {
  beforeEach(() => {
    store.authRecord = {
      id: "m1",
      role: "Municipality",
      account_status: "Active",
      municipality: "Tuguegarao City",
    }
    store.projects = [
      {
        id: "p1",
        collectionId: "projects",
        collectionName: "projects",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        progress_pct: 75,
      },
      {
        id: "p2",
        collectionId: "projects",
        collectionName: "projects",
        name: "Lasam School",
        category: "Education",
        status: "Ongoing",
        municipality: "Lasam",
        barangay: "Centro",
        budget_year: 2026,
        progress_pct: 50,
      },
    ]
    store.locations = []
  })

  it("Municipality scope filters project data and denies project mutate affordances", async () => {
    const visible = filterProjectsForUser(store.authRecord, store.projects)

    expect(visible.map((project) => project.id)).toEqual(["p1"])
    expect(canAccess(store.authRecord, "projects.update")).toBe(false)
    expect(canAccess(store.authRecord, "progress_updates.create")).toBe(true)

    render(<ProjectsModule />)

    await waitFor(() => {
      expect(screen.queryByTestId("create-project")).not.toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: /actions for city bridge/i })).not.toBeInTheDocument()
  })
})
