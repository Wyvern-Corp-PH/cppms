import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  userRoleOptions: [] as Array<Record<string, unknown>>,
  userAccountStatusOptions: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
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
      municipality: "",
      barangay: "",
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
        if (name === "locations") return store.locations
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
    store.users = [
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
        municipality: "",
        barangay: "",
      },
    ]
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
    store.locations = [
      {
        id: "loc1",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Tuguegarao City",
        slug: "tuguegarao-city",
        level: "Municipality",
        active: true,
        sort_order: 1,
      },
      {
        id: "loc2",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Centro 01 (Bagumbayan)",
        slug: "tuguegarao-city/centro-01-bagumbayan",
        level: "Barangay",
        municipality_name: "Tuguegarao City",
        barangay_name: "Centro 01 (Bagumbayan)",
        active: true,
        sort_order: 2,
      },
      {
        id: "loc3",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Lasam",
        slug: "lasam",
        level: "Municipality",
        active: true,
        sort_order: 3,
      },
      {
        id: "loc4",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Centro",
        slug: "lasam/centro",
        level: "Barangay",
        municipality_name: "Lasam",
        barangay_name: "Centro",
        active: true,
        sort_order: 4,
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

  it("shows a newly created account immediately after PocketBase create succeeds", async () => {
    const user = userEvent.setup()
    createMock.mockResolvedValueOnce({
      id: "u2",
      collectionId: "users",
      collectionName: "users",
      created: "",
      updated: "",
      email: "new@example.test",
      name: "New User",
      role: "Province",
      account_status: "Active",
      municipality: "",
      barangay: "",
    })
    render(<UserManagementModule />)

    await user.click(await screen.findByRole("button", { name: /create account/i }))
    await user.type(screen.getByLabelText(/^name$/i), "New User")
    await user.type(screen.getByLabelText(/^email$/i), "new@example.test")
    await user.type(screen.getByLabelText(/initial password/i), "secret123")
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalled()
    })
    expect(await screen.findByText("New User")).toBeInTheDocument()
    expect(screen.getByText("new@example.test")).toBeInTheDocument()
  })

  it("requires and submits municipality scope for Municipality users", async () => {
    const user = userEvent.setup()
    store.userRoleOptions = []
    render(<UserManagementModule />)

    await user.click(await screen.findByRole("button", { name: /create account/i }))
    await user.click(screen.getByLabelText(/^role$/i))
    await user.click(await screen.findByRole("option", { name: "Municipality" }))
    expect(await screen.findByLabelText(/^municipality$/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^barangay$/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /^save$/i }))
    expect(await screen.findByText("Municipality is required.")).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/^name$/i), "Municipal Viewer")
    await user.type(screen.getByLabelText(/^email$/i), "municipal@example.test")
    await user.type(screen.getByLabelText(/initial password/i), "secret123")
    await user.click(screen.getByLabelText(/^municipality$/i))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "Municipality",
          municipality: "Tuguegarao City",
          barangay: "",
        })
      )
    })
  })

  it("scopes Barangay choices to the selected municipality and submits both fields", async () => {
    const user = userEvent.setup()
    store.userRoleOptions = []
    render(<UserManagementModule />)

    await user.click(await screen.findByRole("button", { name: /create account/i }))
    await user.type(screen.getByLabelText(/^name$/i), "Barangay Encoder")
    await user.type(screen.getByLabelText(/^email$/i), "barangay@example.test")
    await user.type(screen.getByLabelText(/initial password/i), "secret123")
    await user.click(screen.getByLabelText(/^role$/i))
    await user.click(await screen.findByRole("option", { name: "Barangay" }))

    await user.click(await screen.findByLabelText(/^municipality$/i))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByLabelText(/^barangay$/i))
    expect(
      await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" })
    ).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Centro" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("option", { name: "Centro 01 (Bagumbayan)" }))
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "Barangay",
          municipality: "Tuguegarao City",
          barangay: "Centro 01 (Bagumbayan)",
        })
      )
    })
  })

  it("prefills and updates scoped fields when editing a user", async () => {
    const user = userEvent.setup()
    store.userRoleOptions = []
    store.users = [
      {
        id: "u2",
        collectionId: "users",
        collectionName: "users",
        created: "",
        updated: "",
        email: "barangay@example.test",
        name: "Barangay Encoder",
        role: "Barangay",
        account_status: "Active",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    render(<UserManagementModule />)

    await user.click(
      await screen.findByRole("button", { name: /edit barangay encoder/i })
    )
    expect(await screen.findByLabelText(/^municipality$/i)).toHaveTextContent(
      "Tuguegarao City"
    )
    expect(screen.getByLabelText(/^barangay$/i)).toHaveTextContent(
      "Centro 01 (Bagumbayan)"
    )

    await user.click(screen.getByLabelText(/^municipality$/i))
    await user.click(await screen.findByRole("option", { name: "Lasam" }))
    await user.click(screen.getByLabelText(/^barangay$/i))
    await user.click(await screen.findByRole("option", { name: "Centro" }))
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        "u2",
        expect.objectContaining({
          role: "Barangay",
          municipality: "Lasam",
          barangay: "Centro",
        })
      )
    })
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
