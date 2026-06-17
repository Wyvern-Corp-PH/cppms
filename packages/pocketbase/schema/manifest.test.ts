import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import {
  ADMIN_WRITE_RULE,
  APPROVAL_ACTION,
  COLLECTION_ACCESS_RULES,
  COLLECTION_DELETE_ORDER,
  COLLECTION_MANIFEST,
  COLLECTION_NAMES,
  EXPENSE_CATEGORY,
  LGU_LEVEL,
  MIGRATION_FILE,
  PROJECT_CATEGORY,
  PROJECT_STATUS,
  PUBLIC_READ_RULE,
  RULES_MIGRATION_FILE,
} from "./manifest"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const migrationPath = resolve(packageRoot, "pb_migrations", MIGRATION_FILE)
const zeroProgressMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000003_progress_from_pct_zero.js"
)
const rulesMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  RULES_MIGRATION_FILE
)

describe("schema manifest (SPEC §I)", () => {
  it("defines all five CPPMS collections", () => {
    expect(COLLECTION_NAMES).toEqual([
      "projects",
      "budget_allocations",
      "budget_expenses",
      "progress_updates",
      "approval_actions",
    ])
  })

  it("includes enum values from SPEC", () => {
    expect(PROJECT_STATUS).toContain("Completed")
    expect(PROJECT_CATEGORY).toContain("Infrastructure")
    expect(LGU_LEVEL).toContain("Municipality")
    expect(EXPENSE_CATEGORY).toContain("Materials")
    expect(APPROVAL_ACTION).toEqual(["approve", "reject"])
  })

  it("declares completion document and scholarship fields (V110, V112)", () => {
    const projects = COLLECTION_MANIFEST.find(
      (collection) => collection.name === "projects"
    )
    const progressUpdates = COLLECTION_MANIFEST.find(
      (collection) => collection.name === "progress_updates"
    )

    expect(projects?.fields).toContain("number_of_students")
    expect(progressUpdates?.fields).toEqual(
      expect.arrayContaining([
        "certification_completion",
        "certificate_acceptance",
        "proof_payment_barangay",
        "acknowledgment_completion",
        "audit_documents",
        "verification_documents",
        "liquidation_documents",
      ])
    )
  })
})

describe("pb migration file", () => {
  const migrationSource = readFileSync(migrationPath, "utf8")

  it("exists and exports migrate()", () => {
    expect(migrationSource).toMatch(/migrate\s*\(/)
  })

  it("creates every collection from manifest", () => {
    for (const { name } of COLLECTION_MANIFEST) {
      expect(migrationSource).toContain(`name: "${name}"`)
    }
  })

  it("declares every custom field from manifest", () => {
    for (const { name, fields } of COLLECTION_MANIFEST) {
      for (const field of fields) {
        expect(
          migrationSource,
          `${name}.${field} missing in ${MIGRATION_FILE}`
        ).toContain(`name: "${field}"`)
      }
    }
  })

  it("down migration deletes collections in dependency order", () => {
    const parts = migrationSource.split("}, (app)")
    const downBlock = parts[parts.length - 1] ?? ""

    for (const name of COLLECTION_DELETE_ORDER) {
      expect(downBlock).toContain(`"${name}"`)
    }
  })

  it("allows 0% as a valid progress update starting point", () => {
    const migrationSource = readFileSync(zeroProgressMigrationPath, "utf8")

    expect(migrationSource).toContain('getByName("from_pct")')
    expect(migrationSource).toContain("field.required = false")
  })
})

describe("collection access rules (V14, T8)", () => {
  it("manifest defines public read and admin write rule strings", () => {
    expect(PUBLIC_READ_RULE).toBe("")
    expect(ADMIN_WRITE_RULE).toBe('@request.auth.id != ""')
    expect(COLLECTION_ACCESS_RULES).toEqual({
      listRule: "",
      viewRule: "",
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
    })
  })

  const rulesMigrationSource = readFileSync(rulesMigrationPath, "utf8")

  it("rules migration exists and exports migrate()", () => {
    expect(rulesMigrationSource).toMatch(/migrate\s*\(/)
  })

  it("rules migration applies public read + admin write to every collection", () => {
    for (const name of COLLECTION_NAMES) {
      expect(
        rulesMigrationSource,
        `${name} missing in ${RULES_MIGRATION_FILE}`
      ).toContain(`"${name}"`)
    }

    expect(rulesMigrationSource).toContain("listRule")
    expect(rulesMigrationSource).toContain("viewRule")
    expect(rulesMigrationSource).toContain("createRule")
    expect(rulesMigrationSource).toContain("updateRule")
    expect(rulesMigrationSource).toContain("deleteRule")
    expect(rulesMigrationSource).toContain(PUBLIC_READ_RULE)
    expect(rulesMigrationSource).toContain(ADMIN_WRITE_RULE)
  })
})
