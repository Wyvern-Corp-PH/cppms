import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

const listeners: Array<(token: string, record: { id: string } | null) => void> = []

const authStore = {
  record: null as { id: string } | null,
  onChange: vi.fn((callback: (token: string, record: { id: string } | null) => void) => {
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
  it("clears session on logout", async () => {
    authStore.record = { id: "1" }
    listeners.length = 0
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
})
