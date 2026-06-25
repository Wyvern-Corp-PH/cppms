import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  userRoleOptions: [] as Array<Record<string, unknown>>,
  userAccountStatusOptions: [] as Array<Record<string, unknown>>,
  users: [
    {
      id: "u1",
      collectionId: "users",
      collectionName: "users",
      created: "",
      updated: "",
      email: "admin@example.test",
      name: "Admin User",
      role: "Province",
      account_status: "Active",
    },
  ],
}

const updateMock = vi.fn()
const deleteMock = vi.fn()
const createMock = vi.fn()
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
      getFullList: vi.fn(async () => {
        if (name === "users") return store.users
        if (name === "user_role_options") return store.userRoleOptions
        if (name === "user_account_status_options") return store.userAccountStatusOptions
        return []
      }),
      create: createMock,
      update: updateMock,
      delete: deleteMock,
      requestPasswordReset: requestPasswordResetMock,
    }),
  }),
}))

import { UserManagementModule } from "./user-management-module"

describe("UserManagementModule (J6)", () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => false),
    })
    Object.defineProperty(window.HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(
      window.HTMLElement.prototype,
      "releasePointerCapture",
      {
        configurable: true,
        value: vi.fn(),
      }
    )
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    })
  })

  beforeEach(() => {
    store.userRoleOptions = [
      {
        id: "role1",
        collectionId: "user_role_options",
        collectionName: "user_role_options",
        name: "PB Auditor",
        active: true,
        sort_order: 1,
      },
    ]
    store.userAccountStatusOptions = [
      {
        id: "status1",
        collectionId: "user_account_status_options",
        collectionName: "user_account_status_options",
        name: "PB Suspended",
        active: true,
        sort_order: 1,
      },
    ]
    updateMock.mockClear()
    deleteMock.mockClear()
    createMock.mockClear()
    requestPasswordResetMock.mockClear()
  })

  it("lists users and exposes Super Admin account actions", async () => {
    render(<UserManagementModule />)

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument()
    })

    expect(screen.getByText("admin@example.test")).toBeInTheDocument()
    expect(screen.getByText("Province")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /edit admin user/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /deactivate admin user/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /delete admin user/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /reset password for admin user/i })
    ).toBeInTheDocument()
  })

  it("renders the users table through the shared table primitive", async () => {
    render(<UserManagementModule />)

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument()
    })

    expect(screen.getByRole("table")).toHaveAttribute("data-slot", "table")
    expect(screen.getByRole("columnheader", { name: /actions/i })).toHaveAttribute(
      "data-slot",
      "table-head"
    )
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

  it("keeps create account dialog responsive at zoomed viewports", async () => {
    const user = userEvent.setup()
    render(<UserManagementModule />)

    await user.click(await screen.findByRole("button", { name: /create account/i }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveClass("w-[calc(100vw-2rem)]")
    expect(dialog.className).toContain("max-h-[calc(100dvh-2rem)]")
    expect(dialog).toHaveClass("overflow-y-auto")
    expect(dialog).toHaveClass("sm:max-w-lg")
  })

  it("renders create account validation with Field primitives", async () => {
    const user = userEvent.setup()
    render(<UserManagementModule />)

    await user.click(await screen.findByRole("button", { name: /create account/i }))
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    expect(await screen.findByText("Name is required.")).toHaveAttribute(
      "data-slot",
      "field-error"
    )
    expect(screen.getByText("Enter a valid email address.")).toHaveAttribute(
      "data-slot",
      "field-error"
    )
    expect(screen.getByText("Initial password is required.")).toHaveAttribute(
      "data-slot",
      "field-error"
    )
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true")
    expect(screen.getAllByRole("group").some((node) => node.getAttribute("data-slot") === "field")).toBe(
      true
    )
    expect(createMock).not.toHaveBeenCalled()
  })

  it("loads role and account status dropdown options from PocketBase fields", async () => {
    const user = userEvent.setup()
    render(<UserManagementModule />)

    await user.click(await screen.findByRole("button", { name: /create account/i }))
    await user.click(await screen.findByLabelText(/^role$/i))

    expect(
      await screen.findByRole("option", { name: "PB Auditor" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Province" })
    ).not.toBeInTheDocument()

    await user.keyboard("{Escape}")
    await user.click(screen.getByLabelText(/^status$/i))
    expect(
      await screen.findByRole("option", { name: "PB Suspended" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Active" })
    ).not.toBeInTheDocument()
  })
})
