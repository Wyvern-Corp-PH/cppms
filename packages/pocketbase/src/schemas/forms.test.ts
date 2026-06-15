import { describe, expect, it } from "vitest"

import {
  approvalFormSchema,
  loginFormSchema,
  progressUpdateFormSchema,
  projectMutateSchema,
} from "./forms"
import { fieldErrorsFromZod } from "./parse"

describe("loginFormSchema (V35, V15)", () => {
  it("rejects invalid email", () => {
    const result = loginFormSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).email).toBeTruthy()
    }
  })
})

describe("projectMutateSchema (V34)", () => {
  it("requires a project name", () => {
    const result = projectMutateSchema.safeParse({
      name: "",
      category: "Infrastructure",
      status: "Planning",
      budget_year: 2026,
    })
    expect(result.success).toBe(false)
  })
})

describe("approvalFormSchema (V5, V35)", () => {
  it("requires reason on reject", () => {
    const result = approvalFormSchema.safeParse({
      action: "reject",
      authority_name: "Governor",
      reason: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).reason).toMatch(/required/i)
    }
  })

  it("accepts approve with authority name only", () => {
    const result = approvalFormSchema.safeParse({
      action: "approve",
      authority_name: "Governor",
    })
    expect(result.success).toBe(true)
  })
})

describe("progressUpdateFormSchema (V6, V35)", () => {
  it("requires a site photo file", () => {
    const result = progressUpdateFormSchema.safeParse({
      projectId: "1",
      toPct: 50,
      sitePhoto: undefined,
    })
    expect(result.success).toBe(false)
  })
})
