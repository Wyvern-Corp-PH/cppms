import { describe, expect, it } from "vitest"

import {
  canAccess,
  getRolePolicy,
  isActiveUser,
  isSuperAdmin,
} from "./access-control"

describe("access control (V115-V121)", () => {
  it("recognizes active Super Admin users", () => {
    const user = {
      id: "u1",
      role: "Super Admin",
      account_status: "Active",
    }

    expect(isActiveUser(user)).toBe(true)
    expect(isSuperAdmin(user)).toBe(true)
  })

  it("denies inactive users before policy checks", () => {
    expect(
      canAccess(
        { id: "u1", role: "Super Admin", account_status: "Inactive" },
        "users.update"
      )
    ).toBe(false)
  })

  it("treats missing legacy account_status as active until backfilled", () => {
    expect(isActiveUser({ id: "u1", role: "Admin" })).toBe(true)
    expect(canAccess({ id: "u1", role: "Admin" }, "projects.update")).toBe(true)
  })

  it("allows only Super Admin to manage users and audit logs", () => {
    expect(
      canAccess(
        { id: "u1", role: "Super Admin", account_status: "Active" },
        "users.update"
      )
    ).toBe(true)
    expect(
      canAccess(
        { id: "u2", role: "Admin", account_status: "Active" },
        "users.update"
      )
    ).toBe(false)
    expect(
      canAccess(
        { id: "u2", role: "Admin", account_status: "Active" },
        "activity_logs.view"
      )
    ).toBe(false)
  })

  it("grants Admin data actions but not system settings", () => {
    const policy = getRolePolicy("Admin")

    expect(policy).toContain("projects.update")
    expect(policy).not.toContain("system_settings.update")
    expect(
      canAccess(
        { id: "u2", role: "Admin", account_status: "Active" },
        "budget_expenses.create"
      )
    ).toBe(true)
  })
})
