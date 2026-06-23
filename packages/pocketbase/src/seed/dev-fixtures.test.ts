import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { normalizeLocationSlug } from "../domain/project-filters"
import { projectMutateSchema } from "../schemas/forms"
import {
  CAGAYAN_LOCATIONS,
  CAGAYAN_LOCATION_TREE,
  DEMO_PROJECT_PREFIX,
  DEV_SEED_FIXTURES,
  DEV_SEED_USERS,
} from "./dev-fixtures"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const seedScriptSource = readFileSync(
  resolve(packageRoot, "scripts", "seed-dev.ts"),
  "utf8"
)

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

  it("defines canonical Cagayan locations with stable slugs", () => {
    expect(CAGAYAN_LOCATIONS).toContain("Tuguegarao City")
    expect(CAGAYAN_LOCATIONS).toContain("Lasam")
    expect(CAGAYAN_LOCATIONS).toHaveLength(29)
    expect(new Set(CAGAYAN_LOCATIONS.map(normalizeLocationSlug)).size).toBe(
      CAGAYAN_LOCATIONS.length
    )
  })

  it("matches the SQL municipality to barangay source of truth", () => {
    const barangayCount = CAGAYAN_LOCATION_TREE.reduce(
      (total, municipality) => total + municipality.barangays.length,
      0
    )

    expect(CAGAYAN_LOCATION_TREE).toHaveLength(29)
    expect(barangayCount).toBe(820)
    expect(
      CAGAYAN_LOCATION_TREE.find(
        (municipality) => municipality.name === "Tuguegarao City"
      )?.barangays
    ).toContain("Centro 01 (Bagumbayan)")
    expect(
      CAGAYAN_LOCATION_TREE.find(
        (municipality) => municipality.name === "Solana"
      )?.barangays
    ).toContain("Andarayan North")
    expect(
      CAGAYAN_LOCATION_TREE.every(
        (municipality) => municipality.barangays.length > 0
      )
    ).toBe(true)
  })

  it("uses only canonical locations in seeded demo projects", () => {
    const canonical = new Set(CAGAYAN_LOCATIONS)
    for (const fixture of DEV_SEED_FIXTURES) {
      expect(
        canonical.has(fixture.project.location as (typeof CAGAYAN_LOCATIONS)[number]),
        `${fixture.project.name} uses non-canonical location ${fixture.project.location}`
      ).toBe(true)
    }
  })

  it("seeds required completion documents for 100% progress rows", () => {
    expect(
      DEV_SEED_FIXTURES.some((fixture) => fixture.progress?.to_pct === 100)
    ).toBe(true)
    expect(seedScriptSource).toContain("REQUIRED_COMPLETION_DOCUMENTS")
    expect(seedScriptSource).toContain("appendCompletionDocuments")
    expect(seedScriptSource).toContain("fixture.progress.to_pct >= 100")
  })

  it("defines and upserts sample users for role simulation", () => {
    expect(DEV_SEED_USERS).toHaveLength(3)
    expect(DEV_SEED_USERS.map((user) => user.role)).toEqual([
      "Admin",
      "User",
      "User",
    ])
    expect(DEV_SEED_USERS.some((user) => user.account_status === "Inactive")).toBe(
      true
    )
    expect(new Set(DEV_SEED_USERS.map((user) => user.email)).size).toBe(
      DEV_SEED_USERS.length
    )
    for (const user of DEV_SEED_USERS) {
      expect(user).not.toHaveProperty("password")
    }
    expect(seedScriptSource).toContain("DEV_SEED_USERS")
    expect(seedScriptSource).toContain("seedSampleUsers")
    expect(seedScriptSource).toContain("getFirstListItem(`email=")
    expect(seedScriptSource).toContain("passwordConfirm")
    expect(seedScriptSource).toContain("Sample users:")
  })

  it("simulates demo interactions as sample users", () => {
    expect(seedScriptSource).toContain("authWithPassword(SAMPLE_ADMIN_EMAIL")
    expect(seedScriptSource).toContain("sampleUsersByEmail")
    expect(seedScriptSource).toContain("allocated_by: sampleAdmin?.id")
    expect(seedScriptSource).toContain('formData.append("updated_by"')
    expect(seedScriptSource).toContain('collection("approval_actions").create')
  })
})
