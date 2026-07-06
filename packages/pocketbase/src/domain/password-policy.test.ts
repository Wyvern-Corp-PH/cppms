import { describe, expect, it } from "vitest"

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_TEXT,
} from "./password-policy"
import { userAccountFormSchema } from "../schemas/forms"
import { fieldErrorsFromZod } from "../schemas/parse"

describe("password-policy (V213)", () => {
  it("defines a shared minimum length and requirements copy", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
    expect(PASSWORD_REQUIREMENTS_TEXT).toMatch(/8/)
  })

  it("rejects create-account passwords shorter than the shared minimum", () => {
    const result = userAccountFormSchema.safeParse({
      name: "Scoped User",
      email: "scoped@example.test",
      account_status: "Active",
      role: "Province",
      password: "short",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).password).toMatch(/8/)
    }
  })
})
