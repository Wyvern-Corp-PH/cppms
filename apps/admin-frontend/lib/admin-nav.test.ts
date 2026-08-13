import { describe, expect, it } from "vitest"

import { canAccessAdminPath, getVisibleAdminNavItems } from "./admin-nav"

const ppdo = { id: "pp1", role: "PPDO", account_status: "Active" } as const
const municipality = {
  id: "m1",
  role: "Municipality",
  account_status: "Active",
  municipality: "Lasam",
} as const

describe("admin nav path access", () => {
  it("limits PPDO to Dashboard and Projects and fails closed elsewhere", () => {
    expect(canAccessAdminPath(ppdo, "/dashboard")).toBe(true)
    expect(canAccessAdminPath(ppdo, "/projects")).toBe(true)
    expect(canAccessAdminPath(ppdo, "/budget")).toBe(false)
    expect(canAccessAdminPath(ppdo, "/progress")).toBe(false)
    expect(canAccessAdminPath(ppdo, "/approvals")).toBe(false)
    expect(canAccessAdminPath(ppdo, "/reports")).toBe(false)
    expect(canAccessAdminPath(ppdo, "/users")).toBe(false)
    expect(canAccessAdminPath(ppdo, "/locations")).toBe(false)
    expect(getVisibleAdminNavItems(ppdo).map((item) => item.href)).toEqual([
      "/dashboard",
      "/projects",
    ])
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
