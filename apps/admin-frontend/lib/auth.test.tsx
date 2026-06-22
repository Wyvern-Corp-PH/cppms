import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const listeners: Array<(token: string, record: { id: string; account_status?: string } | null) => void> = []

const authStore = {
  record: null as { id: string; account_status?: string } | null,
  onChange: vi.fn((callback: (token: string, record: { id: string; account_status?: string } | null) => void) => {
    listeners.push(callback)
    return () => undefined
  }),
  clear: vi.fn(() => {
    authStore.record = null
    for (const listener of listeners) {
      listener("", null)
    }
  }),
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore,
    collection: () => ({
      authWithPassword: vi.fn(async () => {
        authStore.record = { id: "1" }
      }),
    }),
  }),
}))

import { AuthProvider, useAuth } from "./auth"

function LogoutProbe() {
  const { user, logout } = useAuth()

  return (
    <div>
      <span>{user ? "signed-in" : "signed-out"}</span>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

describe("AuthProvider (V15)", () => {
  beforeEach(() => {
    authStore.clear.mockClear()
    listeners.length = 0
  })

  it("clears session on logout", async () => {
    authStore.record = { id: "1" }
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>
    )

    expect(screen.getByText("signed-in")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /logout/i }))

    await waitFor(() => {
      expect(authStore.clear).toHaveBeenCalled()
      expect(screen.getByText("signed-out")).toBeInTheDocument()
    })
  })

  it("keeps legacy login sessions that do not have account_status", async () => {
    authStore.record = null

    function LoginProbe() {
      const { user, login } = useAuth()
      return (
        <div>
          <span>{user ? "signed-in" : "signed-out"}</span>
          <button
            type="button"
            onClick={() => void login("admin@example.test", "secret")}
          >
            Login
          </button>
        </div>
      )
    }

    const user = userEvent.setup()
    render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>
    )

    await user.click(screen.getByRole("button", { name: /login/i }))

    await waitFor(() => {
      expect(authStore.clear).not.toHaveBeenCalled()
      expect(authStore.record).toEqual({ id: "1" })
    })
  })
})
