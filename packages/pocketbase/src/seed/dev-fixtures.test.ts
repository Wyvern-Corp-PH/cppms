import { describe, expect, it } from "vitest"

import { projectMutateSchema } from "../schemas/forms"
import { DEMO_PROJECT_PREFIX, DEV_SEED_FIXTURES } from "./dev-fixtures"

describe("dev seed fixtures (V70)", () => {
  it("defines demo projects with the shared prefix", () => {
    expect(DEV_SEED_FIXTURES.length).toBeGreaterThanOrEqual(6)
    for (const fixture of DEV_SEED_FIXTURES) {
      expect(fixture.project.name.startsWith(DEMO_PROJECT_PREFIX)).toBe(true)
    }
  })

  it("parses every fixture project through projectMutateSchema", () => {
    for (const fixture of DEV_SEED_FIXTURES) {
      const result = projectMutateSchema.safeParse(fixture.project)
      expect(result.success, fixture.project.name).toBe(true)
    }
  })
})
