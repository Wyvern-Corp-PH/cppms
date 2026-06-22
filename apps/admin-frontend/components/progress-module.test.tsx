import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
}

const createMock = vi.fn()
const updateMock = vi.fn()

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "progress_updates") return store.updates
        return []
      }),
      create: createMock,
      update: updateMock,
    }),
  }),
}))

import { ProgressModule } from "./progress-module"

describe("ProgressModule (V81, V84)", () => {
  beforeEach(() => {
    store.projects = []
    store.updates = []
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
