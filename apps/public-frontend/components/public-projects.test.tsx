import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: () => ({
      getFullList: vi.fn(async () => [
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
        },
      ]),
    }),
  }),
}))

import { PublicProjects } from "./public-projects"

describe("PublicProjects (V2, J3)", () => {
  it("allows browse and filter without create/edit/delete affordances", async () => {
    render(<PublicProjects />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/search projects/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /new project/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
  })
})
