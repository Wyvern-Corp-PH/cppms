import { describe, expect, it } from "vitest"

import { generateTempPassword, TEMP_PASSWORD_LENGTH } from "./temp-password"

describe("generateTempPassword (V209)", () => {
  it("generates passwords at least 12 characters long", () => {
    expect(generateTempPassword().length).toBe(TEMP_PASSWORD_LENGTH)
    expect(generateTempPassword(16).length).toBe(16)
  })

  it("uses only allowed characters", () => {
    const password = generateTempPassword()
    expect(password).toMatch(/^[A-Za-z0-9]+$/)
  })
})
