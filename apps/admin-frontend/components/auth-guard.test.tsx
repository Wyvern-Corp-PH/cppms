import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { AuthGuard } from "./auth-guard"

const mockReplace = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
}))

const authState = {
  user: null as { id: string } | null,
  loading: false,
}

vi.mock("@/lib/auth", () => ({
  useAuth: () => authState,
}))

describe("AuthGuard (V1)", () => {
  beforeEach(() => {
    mockReplace.mockReset()
    authState.user = null
    authState.loading = false
  })

  it("redirects unauthenticated users to login", async () => {
    render(
      <AuthGuard>
        <p>Protected</p>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fdashboard")
    })
    expect(screen.queryByText("Protected")).not.toBeInTheDocument()
  })

  it("renders children when authenticated", () => {
    authState.user = { id: "1" }

    render(
      <AuthGuard>
        <p>Protected</p>
      </AuthGuard>
    )

    expect(screen.getByText("Protected")).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
