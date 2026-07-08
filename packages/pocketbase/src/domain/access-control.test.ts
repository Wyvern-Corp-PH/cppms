import { describe, expect, it } from "vitest"

import {
  canAccess,
  filterProjectsForUser,
  getRolePolicy,
  isActiveUser,
  isProjectInUserScope,
  isSuperAdmin,
  mustChangePassword,
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

  it("detects accounts that must change password", () => {
    expect(
      mustChangePassword({
        id: "u1",
        role: "Province",
        account_status: "Active",
        must_change_password: true,
      })
    ).toBe(true)
    expect(
      mustChangePassword({
        id: "u1",
        role: "Province",
        account_status: "Active",
        must_change_password: false,
      })
    ).toBe(false)
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
    expect(isActiveUser({ id: "u1", role: "Province" })).toBe(true)
    expect(canAccess({ id: "u1", role: "Province" }, "approval_actions.create")).toBe(true)
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
        { id: "u2", role: "Province", account_status: "Active" },
        "users.update"
      )
    ).toBe(false)
    expect(
      canAccess(
        { id: "u2", role: "Province", account_status: "Active" },
        "activity_logs.view"
      )
    ).toBe(false)
  })

  it("grants Province approval and fund-release actions but not system settings", () => {
    const policy = getRolePolicy("Province")

    expect(policy).toContain("approval_actions.create")
    expect(policy).toContain("budget_expenses.create")
    expect(policy).not.toContain("progress_updates.create")
    expect(policy).not.toContain("progress_updates.update")
    expect(policy).not.toContain("progress_updates.delete")
    expect(policy).not.toContain("system_settings.update")
    expect(
      canAccess(
        { id: "u2", role: "Province", account_status: "Active" },
        "budget_expenses.create"
      )
    ).toBe(true)
    expect(
      canAccess(
        { id: "u2", role: "Province", account_status: "Active" },
        "progress_updates.create"
      )
    ).toBe(false)
  })

  it("denies approval actions to Barangay and Municipality users", () => {
    expect(
      canAccess(
        { id: "s1", role: "Super Admin", account_status: "Active" },
        "approval_actions.create"
      )
    ).toBe(false)
    expect(
      canAccess(
        { id: "b1", role: "Barangay", account_status: "Active" },
        "approval_actions.create"
      )
    ).toBe(false)
    expect(
      canAccess(
        { id: "m1", role: "Municipality", account_status: "Active" },
        "approval_actions.create"
      )
    ).toBe(false)
    expect(
      canAccess(
        { id: "p1", role: "Province", account_status: "Active" },
        "approval_actions.create"
      )
    ).toBe(true)
  })

  it("lets Municipality and Barangay submit progress updates without project mutation", () => {
    expect(
      canAccess(
        {
          id: "b1",
          role: "Barangay",
          account_status: "Active",
          municipality: "Tuguegarao City",
          barangay: "Centro 01",
        },
        "progress_updates.create"
      )
    ).toBe(true)
    expect(
      canAccess(
        {
          id: "b1",
          role: "Barangay",
          account_status: "Active",
          municipality: "Tuguegarao City",
          barangay: "Centro 01",
        },
        "budget_expenses.create"
      )
    ).toBe(true)
    expect(
      canAccess(
        {
          id: "b1",
          role: "Barangay",
          account_status: "Active",
          municipality: "Tuguegarao City",
          barangay: "Centro 01",
        },
        "projects.update"
      )
    ).toBe(false)
    expect(
      canAccess(
        {
          id: "m1",
          role: "Municipality",
          account_status: "Active",
          municipality: "Tuguegarao City",
        },
        "progress_updates.create"
      )
    ).toBe(true)
    expect(
      canAccess(
        {
          id: "m1",
          role: "Municipality",
          account_status: "Active",
          municipality: "Tuguegarao City",
        },
        "projects.update"
      )
    ).toBe(false)
  })

  it("requires scoped roles to have assigned municipality and barangay", () => {
    const blankProject = { id: "p0", municipality: "", barangay: "" }

    expect(isActiveUser({ id: "m1", role: "Municipality", account_status: "Active" })).toBe(
      false
    )
    expect(
      isActiveUser({
        id: "b1",
        role: "Barangay",
        account_status: "Active",
        municipality: "Tuguegarao City",
      })
    ).toBe(false)
    expect(isProjectInUserScope({ role: "Municipality" }, blankProject)).toBe(false)
    expect(
      isProjectInUserScope(
        { role: "Barangay", municipality: "Tuguegarao City" },
        blankProject
      )
    ).toBe(false)
  })

  it("scopes project records by Barangay, Municipality, Province, and Super Admin", () => {
    const projects = [
      { id: "p1", municipality: "Tuguegarao City", barangay: "Centro 01" },
      { id: "p2", municipality: "Tuguegarao City", barangay: "Centro 02" },
      { id: "p3", municipality: "Lasam", barangay: "Centro" },
    ]

    expect(
      filterProjectsForUser(
        {
          id: "b1",
          role: "Barangay",
          municipality: "Tuguegarao City",
          barangay: "Centro 01",
        },
        projects
      ).map((project) => project.id)
    ).toEqual(["p1"])
    expect(
      filterProjectsForUser(
        { id: "m1", role: "Municipality", municipality: "Tuguegarao City" },
        projects
      ).map((project) => project.id)
    ).toEqual(["p1", "p2"])
    expect(isProjectInUserScope({ role: "Province" }, projects[2]!)).toBe(true)
    expect(isProjectInUserScope({ role: "Super Admin" }, projects[2]!)).toBe(true)
  })
})
