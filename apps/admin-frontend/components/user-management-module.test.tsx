import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  users: [
    {
      id: "u1",
      collectionId: "users",
      collectionName: "users",
      created: "",
      updated: "",
      email: "admin@example.test",
      name: "Admin User",
      role: "Admin",
      account_status: "Active",
    },
  ],
}

const updateMock = vi.fn()
const deleteMock = vi.fn()
const requestPasswordResetMock = vi.fn()

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: {
        id: "sa1",
        role: "Super Admin",
        account_status: "Active",
      },
    },
    collection: (name: string) => ({
      getFullList: vi.fn(async () => (name === "users" ? store.users : [])),
      update: updateMock,
      delete: deleteMock,
      requestPasswordReset: requestPasswordResetMock,
    }),
  }),
}))

import { UserManagementModule } from "./user-management-module"

describe("UserManagementModule (J6)", () => {
  beforeEach(() => {
    updateMock.mockClear()
    deleteMock.mockClear()
    requestPasswordResetMock.mockClear()
  })

  it("lists users and exposes Super Admin account actions", async () => {
    render(<UserManagementModule />)

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument()
    })

    expect(screen.getByText("admin@example.test")).toBeInTheDocument()
    expect(screen.getByText("Admin")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /edit admin user/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /deactivate admin user/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /delete admin user/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /reset password for admin user/i })
    ).toBeInTheDocument()
  })

  it("soft deactivates by default, hard deletes explicitly, and requests password reset", async () => {
    const user = userEvent.setup()
    render(<UserManagementModule />)

    await user.click(
      await screen.findByRole("button", { name: /deactivate admin user/i })
    )
    expect(updateMock).toHaveBeenCalledWith("u1", {
      account_status: "Inactive",
    })

    await user.click(screen.getByRole("button", { name: /delete admin user/i }))
    expect(deleteMock).toHaveBeenCalledWith("u1")

    await user.click(
      screen.getByRole("button", { name: /reset password for admin user/i })
    )
    expect(requestPasswordResetMock).toHaveBeenCalledWith("admin@example.test")
  })
})
