import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  project: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  updatesError: null as Error | null,
}

const getFullList = vi.fn(async (_options?: Record<string, unknown>) => {
  if (store.updatesError) throw store.updatesError
  return store.updates
})

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => {
      if (name === "progress_updates") {
        return { getFullList }
      }
      return {
        getOne: vi.fn(async (id: string) => {
          if (!store.project || store.project.id !== id) {
            throw new Error("missing")
          }
          return store.project
        }),
      }
    },
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
  period_of_implementation: "FY 2026 Q1–Q4",
  budget_year: 2026,
  bid_price: 2500000,
  progress_pct: 42,
}

function progressUpdate(overrides: Record<string, unknown> = {}) {
  return {
    id: "upd-1",
    collectionId: "pu",
    collectionName: "progress_updates",
    created: "2026-02-01T08:00:00.000Z",
    updated: "2026-02-01T08:00:00.000Z",
    project: "bridge-1",
    from_pct: 0,
    to_pct: 20,
    notes: "Mobilization",
    site_photo: [],
    updated_at: "2026-02-01T08:00:00.000Z",
    ...overrides,
  }
}

describe("PublicProjectDetail", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_POCKETBASE_URL = "http://localhost:8090"
    store.project = { ...publishedProject }
    store.updates = []
    store.updatesError = null
    getFullList.mockClear()
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
    expect(screen.getAllByText("Ongoing").length).toBeGreaterThan(0)
    expect(screen.getByText("Infrastructure")).toBeInTheDocument()
    expect(
      screen.getByText("Tuguegarao City / Centro 01 (Bagumbayan)")
    ).toBeInTheDocument()
    expect(screen.getByText("East bank approach")).toBeInTheDocument()
    expect(screen.getByText("Acme Builders")).toBeInTheDocument()
    expect(screen.getByText("Project Status")).toBeInTheDocument()
    expect(screen.getByText("Period of Implementation")).toBeInTheDocument()
    expect(screen.getByText("FY 2026 Q1–Q4")).toBeInTheDocument()
    expect(screen.getByText("Start Date").closest("div")).toHaveTextContent(
      "Jan 15, 2026"
    )
    expect(screen.getByText("End Date").closest("div")).toHaveTextContent(
      "Dec 31, 2026"
    )
    expect(screen.getByText("Budget Year")).toBeInTheDocument()
    expect(screen.getByText("2026")).toBeInTheDocument()
    expect(screen.getByText("Fund Source")).toBeInTheDocument()
    expect(screen.getByText("Funding Year")).toBeInTheDocument()
    expect(screen.getByText("Main Account")).toBeInTheDocument()
    expect(screen.getByText("Sub Account")).toBeInTheDocument()
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

  it("should show fund source year, main, and sub separately from budget year", async () => {
    store.project = {
      ...publishedProject,
      budget_year: 2026,
      funding_year: 2025,
      fund_source: "General Fund",
      sub_account: "GF - Proper",
    }

    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(screen.getByText("Budget Year")).toBeInTheDocument()
    })

    expect(screen.getByText("Budget Year").closest("div")).toHaveTextContent("2026")
    expect(screen.getByText("Funding Year").closest("div")).toHaveTextContent("2025")
    expect(screen.getByText("Main Account").closest("div")).toHaveTextContent(
      "General Fund"
    )
    expect(screen.getByText("Sub Account").closest("div")).toHaveTextContent(
      "GF - Proper"
    )
  })

  it("should show dashes for missing start and end dates", async () => {
    store.project = {
      ...publishedProject,
      start_date: "",
      target_end_date: "",
    }

    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(screen.getByText("Start Date")).toBeInTheDocument()
    })

    expect(screen.getByText("Start Date").closest("div")).toHaveTextContent("—")
    expect(screen.getByText("End Date").closest("div")).toHaveTextContent("—")
  })

  it("should show dashes for empty fund source parts on legacy rows", async () => {
    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(screen.getByText("Funding Year")).toBeInTheDocument()
    })

    expect(screen.getByText("Funding Year").closest("div")).toHaveTextContent("—")
    expect(screen.getByText("Main Account").closest("div")).toHaveTextContent("—")
    expect(screen.getByText("Sub Account").closest("div")).toHaveTextContent("—")
  })

  it("should list MOA as a named download and never embed it as an image", async () => {
    store.project = {
      ...publishedProject,
      moa_file: ["signed-moa.png"],
      project_photos: ["site.jpg"],
    }

    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "signed-moa.png" })).toBeInTheDocument()
    })

    const moaLink = screen.getByRole("link", { name: "signed-moa.png" })
    expect(moaLink).toHaveAttribute(
      "href",
      "http://localhost:8090/api/files/p/bridge-1/signed-moa.png"
    )
    expect(screen.queryByRole("img", { name: /signed-moa/i })).not.toBeInTheDocument()
    expect(
      screen.queryAllByRole("img").every(
        (img) => !img.getAttribute("src")?.includes("signed-moa.png")
      )
    ).toBe(true)

    const photo = screen.getByRole("img", { name: /project photo/i })
    expect(photo).toHaveAttribute(
      "src",
      "http://localhost:8090/api/files/p/bridge-1/site.jpg"
    )
  })

  it("should list resolution and supporting documents as named downloads", async () => {
    store.project = {
      ...publishedProject,
      resolution_file: ["reso-12.pdf"],
      supporting_docs: ["support-a.pdf", "support-b.pdf"],
    }

    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "reso-12.pdf" })).toBeInTheDocument()
    })

    expect(screen.getByText("Resolution")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "reso-12.pdf" })).toHaveAttribute(
      "href",
      "http://localhost:8090/api/files/p/bridge-1/reso-12.pdf"
    )
    expect(screen.getByText("Supporting project documents")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "support-a.pdf" })).toHaveAttribute(
      "href",
      "http://localhost:8090/api/files/p/bridge-1/support-a.pdf"
    )
    expect(screen.getByRole("link", { name: "support-b.pdf" })).toHaveAttribute(
      "href",
      "http://localhost:8090/api/files/p/bridge-1/support-b.pdf"
    )
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

  it("lists progress update history with percent range, notes, date, and site photo", async () => {
    store.updates = [
      progressUpdate({
        id: "upd-2",
        created: "2026-03-20T10:00:00.000Z",
        updated: "2026-03-20T10:00:00.000Z",
        from_pct: 20,
        to_pct: 42,
        notes: "Deck pour complete",
        site_photo: ["deck.jpg"],
        updated_at: "2026-03-20T10:00:00.000Z",
      }),
      progressUpdate(),
    ]

    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /progress update history/i })
      ).toBeInTheDocument()
    })

    expect(screen.getByText("20% → 42%")).toBeInTheDocument()
    expect(screen.getByText("0% → 20%")).toBeInTheDocument()
    expect(screen.getByText("Deck pour complete")).toBeInTheDocument()
    expect(screen.getByText("Mobilization")).toBeInTheDocument()
    expect(screen.getByText(/Mar 20, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Feb 1, 2026/)).toBeInTheDocument()

    const sitePhoto = screen.getByRole("img", { name: /site photo/i })
    expect(sitePhoto).toHaveAttribute(
      "src",
      "http://localhost:8090/api/files/pu/upd-2/deck.jpg"
    )
  })

  it("should show all parseable updates when two exist without the history error", async () => {
    store.updates = [
      progressUpdate({
        id: "upd-2",
        created: "2026-03-20T10:00:00.000Z",
        from_pct: 20,
        to_pct: 42,
        notes: "Second pour",
        updated_at: "2026-03-20T10:00:00.000Z",
      }),
      progressUpdate(),
    ]

    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(screen.getByText("20% → 42%")).toBeInTheDocument()
    })

    expect(screen.getByText("0% → 20%")).toBeInTheDocument()
    expect(
      screen.queryByText(/unable to load progress update history/i)
    ).not.toBeInTheDocument()
    expect(getFullList).toHaveBeenCalledWith({
      filter: 'project = "bridge-1"',
    })
    expect(getFullList.mock.calls[0]?.[0]).not.toHaveProperty("sort")
  })

  it("should keep good history rows when one list row is unparseable", async () => {
    store.updates = [
      progressUpdate({
        id: "upd-2",
        created: "2026-03-20T10:00:00.000Z",
        from_pct: 20,
        to_pct: 42,
        notes: "Valid later row",
        updated_at: "2026-03-20T10:00:00.000Z",
      }),
      { id: "upd-bad", collectionId: "pu", to_pct: "not-a-number" },
      progressUpdate(),
    ]

    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(screen.getByText("20% → 42%")).toBeInTheDocument()
    })

    expect(screen.getByText("0% → 20%")).toBeInTheDocument()
    expect(screen.getByText("Valid later row")).toBeInTheDocument()
    expect(
      screen.queryByText(/unable to load progress update history/i)
    ).not.toBeInTheDocument()
  })

  it("should display latest update percent when stored project percent is stale", async () => {
    store.project = { ...publishedProject, progress_pct: 50 }
    store.updates = [
      progressUpdate({
        id: "upd-old",
        created: "2026-02-01T08:00:00.000Z",
        from_pct: 0,
        to_pct: 50,
        notes: "Halfway",
        updated_at: "2026-02-01T08:00:00.000Z",
      }),
      progressUpdate({
        id: "upd-new",
        created: "2026-04-01T09:00:00.000Z",
        from_pct: 50,
        to_pct: 100,
        notes: "Complete",
        updated_at: "2026-04-01T09:00:00.000Z",
      }),
    ]

    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-label",
        "100% progress"
      )
    })

    expect(
      screen.getByText((content, element) => element?.tagName === "P" && content === "100%")
    ).toBeInTheDocument()
    expect(
      screen.queryByText((content, element) => element?.tagName === "P" && content === "50%")
    ).not.toBeInTheDocument()
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

  it("surfaces progress history load failures without hiding the project", async () => {
    store.updatesError = new Error("progress list failed")

    render(<PublicProjectDetail projectId="bridge-1" />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Cagayan River Bridge" })
      ).toBeInTheDocument()
    })

    expect(screen.getByRole("alert")).toHaveTextContent(
      /unable to load progress update history/i
    )
    expect(screen.getByTestId("progress-history-error")).toBeInTheDocument()
  })
})
