import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: { id: "1", email: "admin@cppms.local" },
      onChange: vi.fn(() => () => undefined),
      clear: vi.fn(),
    },
    collection: () => ({
      getFullList: vi.fn(async () => []),
    }),
  }),
}))

import { DashboardModule } from "@/components/dashboard-module"

describe("DashboardModule (V9, V24)", () => {
  it("shows overview metrics with skeleton-first loading", async () => {
    const { rerender } = render(<DashboardModule />)
    expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByTestId("dashboard-skeleton")).not.toBeInTheDocument()
      expect(screen.getByTestId("dashboard-projects")).toBeInTheDocument()
    })

    rerender(<DashboardModule />)
  })
})
