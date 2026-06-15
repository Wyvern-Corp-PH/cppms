import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), { scrollNext: vi.fn() }],
}))

vi.mock("@/hooks/use-pocketbase-realtime", () => ({
  usePocketBaseRealtime: () => ({ live: true }),
}))

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: () => ({
      getFullList: vi.fn(async () => [
        {
          id: "1",
          collectionId: "p",
          collectionName: "projects",
          created: "2026-06-15T00:00:00.000Z",
          updated: "2026-06-15T00:00:00.000Z",
          name: "Bridge",
          category: "Infrastructure",
          status: "Ongoing",
          budget_year: 2026,
          location: "Tuguegarao",
          progress_pct: 40,
          total_budget: 1000000,
        },
      ]),
    }),
  }),
}))

import { PublicLanding } from "./public-landing"

describe("PublicLanding (V42, V54)", () => {
  it("renders hero, carousel, and accountability without explore list", async () => {
    render(<PublicLanding />)

    expect(
      screen.getByRole("heading", {
        name: /cagayan provincial projects/i,
      })
    ).toBeInTheDocument()

    expect(document.getElementById("recent-projects-heading")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /public accountability/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Bridge")).toBeInTheDocument()
    })

    expect(screen.getByTestId("admin-portal-preview")).toBeInTheDocument()

    expect(screen.queryByRole("heading", { name: /explore the records/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/ARR|MRR|active users/i)).not.toBeInTheDocument()
  })
})
