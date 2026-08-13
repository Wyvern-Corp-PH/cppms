import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const publicProject = {
  id: "1",
  collectionId: "p",
  collectionName: "projects",
  created: "",
  updated: "",
  name: "Bridge",
  category: "Infrastructure",
  status: "Ongoing",
  budget_year: 2026,
  municipality: "Tuguegarao City",
  location: "East bank approach",
  description: "Replacement span.",
  contractor: "Acme Builders",
  start_date: "2026-01-15",
  target_end_date: "2026-12-31",
  total_budget: 2500000,
  progress_pct: 40,
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () =>
        name === "projects" || name === undefined ? [publicProject] : []
      ),
      getOne: vi.fn(async (id: string) => {
        if (id !== publicProject.id) throw new Error("missing")
        return publicProject
      }),
    }),
  }),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

import { PublicProjectDetail } from "../../../public-frontend/components/public-project-detail"
import { PublicProjects } from "../../../public-frontend/components/public-projects"

describe("J3 public projects browse journey", () => {
  it("renders read-only project browsing without mutation controls", async () => {
    render(<PublicProjects />)

    await waitFor(() => {
      expect(screen.getByLabelText(/search projects/i)).toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /new project/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
  })

  it("links View Details to the dedicated project page", async () => {
    render(<PublicProjects />)

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })

    expect(screen.getByRole("link", { name: /view details/i })).toHaveAttribute(
      "href",
      "/projects/1"
    )
  })

  it("renders the public detail page read-only", async () => {
    render(<PublicProjectDetail projectId="1" />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Bridge" })).toBeInTheDocument()
    })
    expect(screen.getByText("Acme Builders")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
  })
})
