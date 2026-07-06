import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AuthProvider } from "@/lib/auth"

import { ChangePasswordForm } from "@/components/change-password-form"
import { LoginForm } from "@/components/login-form"

const mockReplace = vi.fn()
const updateMock = vi.fn()
const authWithPasswordMock = vi.fn()

const authStore = {
  record: null as {
    id: string
    email: string
    role: string
    account_status: string
    must_change_password?: boolean
  } | null,
  onChange: vi.fn(() => () => undefined),
  clear: vi.fn(() => {
    authStore.record = null
  }),
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore,
    collection: () => ({
      authWithPassword: authWithPasswordMock,
      update: updateMock,
    }),
  }),
}))

describe("J17 forced password change journey", () => {
  beforeEach(() => {
    mockReplace.mockReset()
    updateMock.mockReset()
    authWithPasswordMock.mockReset()
    authStore.record = null
    authStore.clear.mockReset()
    authWithPasswordMock.mockImplementation(async (email: string, password: string) => {
      if (email === "user@example.test" && password === "TempPass1234") {
        authStore.record = {
          id: "u1",
          email,
          role: "Province",
          account_status: "Active",
          must_change_password: true,
        }
        return { record: authStore.record }
      }
      if (email === "user@example.test" && password === "newsecret99") {
        authStore.record = {
          id: "u1",
          email,
          role: "Province",
          account_status: "Active",
          must_change_password: false,
        }
        return { record: authStore.record }
      }
      throw new Error("invalid")
    })
    updateMock.mockResolvedValue({})
  })

  it("J17: login with temp password routes to change-password then dashboard", async () => {
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    )

    await user.type(screen.getByLabelText(/email/i), "user@example.test")
    await user.type(screen.getByLabelText(/password/i), "TempPass1234")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/change-password")
    })

    cleanup()
    mockReplace.mockReset()

    render(
      <AuthProvider>
        <ChangePasswordForm />
      </AuthProvider>
    )

    await user.type(screen.getByLabelText(/current password/i), "TempPass1234")
    await user.type(screen.getByLabelText(/^new password$/i), "newsecret99")
    await user.type(screen.getByLabelText(/confirm new password/i), "newsecret99")
    await user.click(screen.getByRole("button", { name: /update password/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith("u1", {
        oldPassword: "TempPass1234",
        password: "newsecret99",
        passwordConfirm: "newsecret99",
        must_change_password: false,
      })
      expect(mockReplace).toHaveBeenCalledWith("/dashboard")
    })
  })
})
