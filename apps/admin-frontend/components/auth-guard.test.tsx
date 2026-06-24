import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { AuthGuard } from "./auth-guard"

const mockReplace = vi.fn()
let mockPathname = "/dashboard"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}))

const authState = {
  user: null as {
    id: string
    role?: string
    account_status?: string
  } | null,
  loading: false,
}

vi.mock("@/lib/auth", () => ({
  useAuth: () => authState,
}))

describe("AuthGuard (V1)", () => {
  beforeEach(() => {
    mockReplace.mockReset()
    mockPathname = "/dashboard"
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
    authState.user = { id: "1", role: "Province", account_status: "Active" }

    render(
      <AuthGuard>
        <p>Protected</p>
      </AuthGuard>
    )

    expect(screen.getByText("Protected")).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("allows legacy sessions missing account_status", () => {
    authState.user = { id: "1", role: "Province" }

    render(
      <AuthGuard>
        <p>Protected</p>
      </AuthGuard>
    )

    expect(screen.getByText("Protected")).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("denies inactive sessions", async () => {
    authState.user = { id: "1", role: "Province", account_status: "Inactive" }

    render(
      <AuthGuard>
        <p>Protected</p>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?inactive=1")
    })
    expect(screen.queryByText("Protected")).not.toBeInTheDocument()
  })

  it("denies Province access to Super Admin user management", async () => {
    mockPathname = "/users"
    authState.user = { id: "1", role: "Province", account_status: "Active" }

    render(
      <AuthGuard>
        <p>User Management</p>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard?forbidden=users")
    })
    expect(screen.queryByText("User Management")).not.toBeInTheDocument()
  })
})
