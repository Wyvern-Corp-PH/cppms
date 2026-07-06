import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { AuthProvider } from "@/lib/auth"

import { LoginForm } from "./login-form"

const mockReplace = vi.fn()
const mockLogin = vi.fn()

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: {
        id: "1",
        email: "admin@cppms.local",
        role: "Province",
        account_status: "Active",
        must_change_password: false,
      },
    },
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams("next=/dashboard"),
}))

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ login: mockLogin }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe("LoginForm", () => {
  beforeEach(() => {
    mockReplace.mockReset()
    mockLogin.mockReset()
  })

  it("submits credentials and navigates to dashboard", async () => {
    mockLogin.mockResolvedValue(undefined)
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
      expect(mockLogin).toHaveBeenCalledWith("admin@cppms.local", "secret")
      expect(mockReplace).toHaveBeenCalledWith("/dashboard")
    })
  })

  it("shows an error when login fails", async () => {
    mockLogin.mockRejectedValue(new Error("invalid"))
    const user = userEvent.setup()

    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), "bad@example.com")
    await user.type(screen.getByLabelText(/password/i), "wrong")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid/i)
  })
})
