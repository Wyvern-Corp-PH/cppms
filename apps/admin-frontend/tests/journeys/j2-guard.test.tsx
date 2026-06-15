import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { AuthGuard } from "@/components/auth-guard"

const mockReplace = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
}))

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

describe("J2 unauthenticated dashboard redirect", () => {
  beforeEach(() => {
    mockReplace.mockReset()
  })

  it("redirects to login when dashboard is accessed without session", async () => {
    render(
      <AuthGuard>
        <h1>Dashboard</h1>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fdashboard")
    })
    expect(screen.queryByRole("heading", { name: /dashboard/i })).not.toBeInTheDocument()
  })
})
