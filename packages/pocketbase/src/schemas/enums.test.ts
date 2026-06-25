import { describe, expect, it } from "vitest"

import {
  APPROVAL_ACTION,
  ACCOUNT_STATUS,
  AUDIT_ACTION,
  LGU_LEVEL,
  PROJECT_CATEGORY,
  PROJECT_STATUS,
  ROLE,
} from "../../schema/manifest"

import {
  approvalActionSchema,
  accountStatusSchema,
  auditActionSchema,
  fundTypeSchema,
  lguLevelSchema,
  projectCategorySchema,
  projectStatusSchema,
  roleSchema,
} from "./enums"

describe("schema enums (V36)", () => {
  it("accepts every manifest project status", () => {
    for (const value of PROJECT_STATUS) {
      expect(projectStatusSchema.safeParse(value).success).toBe(true)
    }
  })

  it("accepts every manifest project category", () => {
    for (const value of PROJECT_CATEGORY) {
      expect(projectCategorySchema.safeParse(value).success).toBe(true)
    }
  })

  it("rejects unknown enum values", () => {
    expect(projectStatusSchema.safeParse("Invalid").success).toBe(false)
    expect(projectCategorySchema.safeParse("").success).toBe(false)
    expect(lguLevelSchema.safeParse("Province").success).toBe(false)
    expect(fundTypeSchema.safeParse("Travel").success).toBe(false)
    expect(approvalActionSchema.safeParse("hold").success).toBe(false)
    expect(roleSchema.safeParse("Manager").success).toBe(false)
    expect(accountStatusSchema.safeParse("Suspended").success).toBe(false)
    expect(auditActionSchema.safeParse("login").success).toBe(false)
  })

  it("matches §C enum table cardinality", () => {
    expect(PROJECT_STATUS).toEqual([
      "Planning",
      "Procurement",
      "Ongoing",
      "Ready for Review",
      "For Revision",
      "Completed",
      "Rejected",
    ])
    expect(PROJECT_CATEGORY).toHaveLength(6)
    expect(LGU_LEVEL).toHaveLength(4)
    expect(APPROVAL_ACTION).toEqual(["approve", "reject", "request_revision"])
    expect(ROLE).toEqual(["Super Admin", "Province", "Municipality", "Barangay"])
    expect(ACCOUNT_STATUS).toEqual(["Active", "Inactive"])
    expect(AUDIT_ACTION).toContain("request_revision")
    expect(AUDIT_ACTION).toContain("reset_password")
  })
})
