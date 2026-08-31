import { describe, expect, it } from "vitest"

import { canAccessAdminPath, getVisibleAdminNavItems } from "./admin-nav"

const superAdmin = {
  id: "s1",
  role: "Super Admin",
  account_status: "Active",
} as const
const province = { id: "p1", role: "Province", account_status: "Active" } as const
const municipality = {
  id: "m1",
  role: "Municipality",
  account_status: "Active",
  municipality: "Lasam",
} as const
const barangay = {
  id: "b1",
  role: "Barangay",
  account_status: "Active",
  municipality: "Lasam",
  barangay: "Centro",
} as const
const gatedPaths = [
  "/dashboard",
  "/projects",
  "/budget",
  "/progress",
  "/approvals",
  "/reports",
  "/users",
  "/locations",
] as const

describe("admin nav path access", () => {
  it("lets Super Admin open every path Province, Municipality, or Barangay can open", () => {
    for (const path of gatedPaths) {
      const lowerRoleCanOpen = [province, municipality, barangay].some((user) =>
        canAccessAdminPath(user, path)
      )
      if (lowerRoleCanOpen) {
        expect(canAccessAdminPath(superAdmin, path), path).toBe(true)
      }
    }
  })

  it("does not grant Approvals or Users to Municipality from nav", () => {
    expect(canAccessAdminPath(municipality, "/dashboard")).toBe(true)
    expect(canAccessAdminPath(municipality, "/projects")).toBe(true)
    expect(canAccessAdminPath(municipality, "/progress")).toBe(true)
    expect(canAccessAdminPath(municipality, "/approvals")).toBe(false)
    expect(canAccessAdminPath(municipality, "/users")).toBe(false)
    expect(canAccessAdminPath(municipality, "/locations")).toBe(false)
  })
})
