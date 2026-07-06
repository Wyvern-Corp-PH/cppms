import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChangePasswordForm } from "./change-password-form"

const mockReplace = vi.fn()
const updateMock = vi.fn()
const authWithPasswordMock = vi.fn()

const authState = {
  user: {
    id: "u1",
    email: "user@example.test",
    role: "Province",
    account_status: "Active",
    must_change_password: true,
  } as {
    id: string
    email: string
    role: string
    account_status: string
    must_change_password?: boolean
  } | null,
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: authState.user }),
}))

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: () => ({
      update: updateMock,
      authWithPassword: authWithPasswordMock,
    }),
  }),
}))

describe("ChangePasswordForm (V210,J17)", () => {
  beforeEach(() => {
    mockReplace.mockReset()
    updateMock.mockReset()
    authWithPasswordMock.mockReset()
    authState.user = {
      id: "u1",
      email: "user@example.test",
      role: "Province",
      account_status: "Active",
      must_change_password: true,
    }
    updateMock.mockResolvedValue({})
    authWithPasswordMock.mockResolvedValue({})
  })

  it("updates password and re-authenticates before reaching dashboard", async () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm />)

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
    })
    expect(authWithPasswordMock).toHaveBeenCalledWith(
      "user@example.test",
      "newsecret99"
    )
    expect(mockReplace).toHaveBeenCalledWith("/dashboard")
  })

  it("shows validation errors for mismatched passwords", async () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm />)

    await user.type(screen.getByLabelText(/current password/i), "TempPass1234")
    await user.type(screen.getByLabelText(/^new password$/i), "newsecret99")
    await user.type(screen.getByLabelText(/confirm new password/i), "different99")
    await user.click(screen.getByRole("button", { name: /update password/i }))

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument()
    expect(updateMock).not.toHaveBeenCalled()
  })
})
