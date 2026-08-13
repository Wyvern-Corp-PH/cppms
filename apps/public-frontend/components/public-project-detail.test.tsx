import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  project: null as Record<string, unknown> | null,
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: () => ({
      getOne: vi.fn(async (id: string) => {
        if (!store.project || store.project.id !== id) {
          throw new Error("missing")
        }
        return store.project
      }),
    }),
  }),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { PublicProjectDetail } from "./public-project-detail"

const publishedProject = {
  id: "bridge-1",
  collectionId: "p",
  collectionName: "projects",
  created: "",
  updated: "",
  name: "Cagayan River Bridge",
  description: "Replacement span at the east bank approach.",
  category: "Infrastructure",
  status: "Ongoing",
  municipality: "Tuguegarao City",
  barangay: "Centro 01 (Bagumbayan)",
  location: "East bank approach",
  contractor: "Acme Builders",
  start_date: "2026-01-15",
  target_end_date: "2026-12-31",
  budget_year: 2026,
  total_budget: 2500000,
  progress_pct: 42,
}

describe("PublicProjectDetail", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_POCKETBASE_URL = "http://localhost:8090"
    store.project = { ...publishedProject }
  })

  it("renders required public fields without login or mutate controls", async () => {
    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Cagayan River Bridge" })
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText("Replacement span at the east bank approach.")
    ).toBeInTheDocument()
    expect(screen.getByText("Ongoing")).toBeInTheDocument()
    expect(screen.getByText("Infrastructure")).toBeInTheDocument()
    expect(
      screen.getByText("Tuguegarao City / Centro 01 (Bagumbayan)")
    ).toBeInTheDocument()
    expect(screen.getByText("East bank approach")).toBeInTheDocument()
    expect(screen.getByText("Acme Builders")).toBeInTheDocument()
    expect(screen.getByText("Jan 15, 2026")).toBeInTheDocument()
    expect(screen.getByText("Dec 31, 2026")).toBeInTheDocument()
    expect(screen.getByText("2026")).toBeInTheDocument()
    expect(screen.getByText("₱2,500,000")).toBeInTheDocument()
    expect(screen.getByText("42%")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toBeInTheDocument()

    expect(screen.getByRole("link", { name: /back to projects/i })).toHaveAttribute(
      "href",
      "/projects"
    )
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /new project/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/unpublished/i)).not.toBeInTheDocument()
  })

  it("shows scholarship student count and project photos when present", async () => {
    store.project = {
      ...publishedProject,
      category: "Scholarship",
      number_of_students: 180,
      project_photos: ["site.jpg"],
    }

    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(screen.getByText(/students covered:\s*180/i)).toBeInTheDocument()
    })

    const photo = screen.getByRole("img", { name: /project photo/i })
    expect(photo).toHaveAttribute(
      "src",
      "http://localhost:8090/api/files/p/bridge-1/site.jpg"
    )
  })

  it("shows a safe not-found state for an unknown id", async () => {
    store.project = null

    render(<PublicProjectDetail projectId="does-not-exist" />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /project not found/i })
      ).toBeInTheDocument()
    })

    expect(screen.queryByText(/unpublished/i)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /back to projects/i })).toHaveAttribute(
      "href",
      "/projects"
    )
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
  })
})
