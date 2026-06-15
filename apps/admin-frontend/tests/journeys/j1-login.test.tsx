import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { AuthProvider } from "@/lib/auth"

import { LoginForm } from "@/components/login-form"

const mockReplace = vi.fn()
const authStore = {
  record: null as { id: string; email: string } | null,
  onChange: vi.fn(() => () => undefined),
  clear: vi.fn(),
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore,
    collection: () => ({
      authWithPassword: vi.fn(async (email: string, password: string) => {
        if (email === "admin@cppms.local" && password === "secret") {
          authStore.record = { id: "1", email }
          return { record: authStore.record }
        }
        throw new Error("invalid")
      }),
    }),
  }),
}))

describe("J2 admin login redirect flow", () => {
  beforeEach(() => {
    mockReplace.mockReset()
    authStore.record = null
    authStore.clear.mockReset()
  })

  it("J1: login establishes session and reaches dashboard route", async () => {
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    )

    await user.type(screen.getByLabelText(/email/i), "admin@cppms.local")
    await user.type(screen.getByLabelText(/password/i), "secret")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(authStore.record?.email).toBe("admin@cppms.local")
      expect(mockReplace).toHaveBeenCalledWith("/dashboard")
    })
  })
})
