import { describe, expect, it } from "vitest"

import {
  APPROVAL_ACTION,
  EXPENSE_CATEGORY,
  LGU_LEVEL,
  PROJECT_CATEGORY,
  PROJECT_STATUS,
} from "../../schema/manifest"

import {
  approvalActionSchema,
  expenseCategorySchema,
  lguLevelSchema,
  projectCategorySchema,
  projectStatusSchema,
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
    expect(expenseCategorySchema.safeParse("Travel").success).toBe(false)
    expect(approvalActionSchema.safeParse("hold").success).toBe(false)
  })

  it("matches §C enum table cardinality", () => {
    expect(PROJECT_STATUS).toHaveLength(6)
    expect(PROJECT_CATEGORY).toHaveLength(6)
    expect(LGU_LEVEL).toHaveLength(4)
    expect(EXPENSE_CATEGORY).toHaveLength(5)
    expect(APPROVAL_ACTION).toHaveLength(2)
  })
})
