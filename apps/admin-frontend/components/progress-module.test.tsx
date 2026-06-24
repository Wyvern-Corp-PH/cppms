import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
  authRecord: {
    id: "current-user",
    email: "current@example.test",
    name: "Current Province User",
    role: "Province",
    account_status: "Active",
  } as Record<string, unknown> | null,
}

const createMock = vi.fn()
const updateMock = vi.fn()

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: store.authRecord,
    },
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "progress_updates") return store.updates
        if (name === "locations") return store.locations
        if (name === "users") return store.users
        return []
      }),
      create: createMock,
      update: updateMock,
    }),
  }),
}))

import { ProgressModule } from "./progress-module"

async function chooseDateRange(user: ReturnType<typeof userEvent.setup>, from: string, to: string) {
  await user.click(screen.getByRole("button", { name: /pick date range/i }))
  await user.type(screen.getByLabelText(/from date/i), from)
  await user.type(screen.getByLabelText(/to date/i), to)
}

describe("ProgressModule (V81, V84)", () => {
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
    store.updates = []
    store.locations = [
      {
        id: "loc1",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Tuguegarao City",
        slug: "tuguegarao-city",
        level: "Municipality",
        municipality_name: "Tuguegarao City",
        active: true,
      },
      {
        id: "loc2",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Lasam",
        slug: "lasam",
        level: "Municipality",
        municipality_name: "Lasam",
        active: true,
      },
      {
        id: "loc3",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Tuguegarao City / Centro 01 (Bagumbayan)",
        slug: "tuguegarao-city/centro-01-bagumbayan",
        level: "Barangay",
        municipality_name: "Tuguegarao City",
        barangay_name: "Centro 01 (Bagumbayan)",
        active: true,
      },
      {
        id: "loc4",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Lasam / Centro",
        slug: "lasam/centro",
        level: "Barangay",
        municipality_name: "Lasam",
        barangay_name: "Centro",
        active: true,
      },
    ]
    store.users = []
    store.authRecord = {
      id: "current-user",
      email: "current@example.test",
      name: "Current Province User",
      role: "Province",
      account_status: "Active",
    }
    createMock.mockReset().mockResolvedValue({})
    updateMock.mockReset().mockResolvedValue({})
  })

  function makeFile(name: string, type = "application/pdf") {
    return new File(["content"], name, { type })
  }

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
      expect(
        screen.getByText(/click to upload or drag an image here/i)
      ).toBeInTheDocument()
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

  it("filters progress rows by municipality and scoped barangay", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        budget_year: 2026,
        progress_pct: 75,
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ongoing",
        municipality: "Lasam",
        barangay: "Centro",
        budget_year: 2026,
        progress_pct: 40,
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByLabelText(/filter by municipality/i))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByLabelText(/filter by barangay/i))

    expect(await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Centro" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("option", { name: "Centro 01 (Bagumbayan)" }))

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
    })
  })

  it("filters progress rows and summaries by progress update date range", async () => {
    const user = userEvent.setup()
    store.projects = [
      {
        id: "1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "City Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 30,
      },
      {
        id: "2",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ongoing",
        budget_year: 2026,
        progress_pct: 60,
      },
    ]
    store.updates = [
      {
        id: "u1",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-06-12 00:00:00.000Z",
        project: "1",
        from_pct: 20,
        to_pct: 30,
        site_photo: "city.jpg",
      },
      {
        id: "u2",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-07-12 00:00:00.000Z",
        project: "2",
        from_pct: 40,
        to_pct: 60,
        site_photo: "lasam.jpg",
      },
    ]

    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.getByText("Lasam School")).toBeInTheDocument()
    })

    await chooseDateRange(user, "2026-06-01", "2026-06-30")

    await waitFor(() => {
      expect(screen.getByText("City Bridge")).toBeInTheDocument()
      expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
      expect(screen.getByTestId("progress-active")).toHaveTextContent("1")
      expect(screen.getByTestId("progress-on-track")).toHaveTextContent("0")
    })
  })

  it("uses the latest progress update for the visible project meter", async () => {
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
    store.updates = [
      {
        id: "u1",
        collectionId: "u",
        collectionName: "progress_updates",
        created: "2026-06-22 00:00:00.000Z",
        project: "1",
        from_pct: 25,
        to_pct: 75,
        site_photo: "site.jpg",
      },
    ]

    render(<ProgressModule />)

    const row = await screen.findByTestId("progress-row-1")
    expect(within(row).getByText(/^75%$/)).toBeInTheDocument()
  })

  it("renders progress updater user ids as user names", async () => {
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
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-22 00:00:00.000Z",
        project: "1",
        from_pct: 25,
        to_pct: 75,
        site_photo: [],
        updated_by: "user1",
      },
    ]
    store.users = [
      {
        id: "user1",
        collectionId: "users",
        collectionName: "users",
        email: "ana@example.test",
        name: "Ana Santos",
        role: "Province",
        account_status: "Active",
      },
    ]

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /view details/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/Ana Santos/)).not.toHaveLength(0)
      expect(screen.queryByText(/user1/)).not.toBeInTheDocument()
    })
  })

  it("renders the current auth user name when user list is unavailable", async () => {
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
    store.updates = [
      {
        id: "u1",
        collectionId: "updates",
        collectionName: "progress_updates",
        created: "2026-06-22 00:00:00.000Z",
        project: "1",
        from_pct: 25,
        to_pct: 75,
        site_photo: [],
        updated_by: "current-user",
      },
    ]
    store.users = []

    render(<ProgressModule />)

    await user.click(await screen.findByRole("button", { name: /view details/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/Current Province User/)).not.toHaveLength(0)
      expect(screen.queryByText(/current-user/)).not.toBeInTheDocument()
    })
  })

  it("saves a progress update even when the project meter PATCH fails", async () => {
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
    updateMock.mockRejectedValueOnce(new Error("PATCH blocked"))
    const warnMock = vi.spyOn(console, "warn").mockImplementation(() => {})

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(updateMock).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(warnMock).toHaveBeenCalledWith(
      "Progress update saved, but project summary did not update.",
      expect.any(Error)
    )
    warnMock.mockRestore()
  })

  it("shows a Zod validation message when saving without a site photo", async () => {
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

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    expect(
      await screen.findAllByText(/site photo is required/i)
    ).not.toHaveLength(0)
    expect(createMock).not.toHaveBeenCalled()
  })

  it("saves below-100 progress with a site photo and empty completion document lists", async () => {
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
        progress_pct: 5,
      },
    ]

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1)
    })
    expect(
      screen.queryByText(/at least one file is required/i)
    ).not.toBeInTheDocument()
  })

  it("blocks saving a 100% progress update until completion documents are uploaded", async () => {
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
        progress_pct: 100,
      },
    ]

    render(<ProgressModule />)

    await user.click(
      await screen.findByRole("button", { name: /update progress/i })
    )
    await user.upload(
      screen.getByTestId("document-upload-input-site-photo"),
      makeFile("site.jpg", "image/jpeg")
    )
    await user.click(screen.getByRole("button", { name: /save update/i }))

    expect(
      await screen.findByText(/certification of completion is required/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/liquidation documents are required/i)
    ).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })
})
