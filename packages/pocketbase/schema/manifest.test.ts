import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import {
  ACCOUNT_STATUS,
  ADMIN_WRITE_RULE,
  AUDIT_ACTION,
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
  ROLE,
  RULES_MIGRATION_FILE,
} from "./manifest"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const migrationPath = resolve(packageRoot, "pb_migrations", MIGRATION_FILE)
const zeroProgressMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000003_progress_from_pct_zero.js"
)
const completionDocsMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000004_completion_docs_students.js"
)
const rulesMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  RULES_MIGRATION_FILE
)
const seedScriptPath = resolve(packageRoot, "scripts", "seed-dev.ts")
const auditHookPath = resolve(packageRoot, "pb_hooks", "audit.js")
const auditHookEntrypointPath = resolve(packageRoot, "pb_hooks", "audit.pb.js")
const appliedHistoryRepairMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000007_reapply_roles_and_rules.js"
)
const userFieldRepairMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000008_repair_user_fields.js"
)
const adminPasswordRepairMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000009_sync_configured_admin_password.js"
)

describe("schema manifest (SPEC §I)", () => {
  it("defines auth, module, location, and audit collections", () => {
    expect(COLLECTION_NAMES).toEqual([
      "users",
      "projects",
      "budget_allocations",
      "budget_expenses",
      "progress_updates",
      "approval_actions",
      "locations",
      "activity_logs",
    ])
  })

  it("includes enum values from SPEC", () => {
    expect(PROJECT_STATUS).toContain("Completed")
    expect(PROJECT_CATEGORY).toContain("Infrastructure")
    expect(LGU_LEVEL).toContain("Municipality")
    expect(EXPENSE_CATEGORY).toContain("Materials")
    expect(APPROVAL_ACTION).toEqual(["approve", "reject"])
    expect(ROLE).toEqual(["Super Admin", "Admin", "User"])
    expect(ACCOUNT_STATUS).toEqual(["Active", "Inactive"])
    expect(AUDIT_ACTION).toContain("reset_password")
  })

  it("declares completion document and scholarship fields (V110, V112)", () => {
    const projects = COLLECTION_MANIFEST.find(
      (collection) => collection.name === "projects"
    )
    const progressUpdates = COLLECTION_MANIFEST.find(
      (collection) => collection.name === "progress_updates"
    )

    expect(projects?.fields).toContain("number_of_students")
    expect(projects?.fields).toContain("resolution_file")
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

  it("guards completion field additions for fresh databases", () => {
    const migrationSource = readFileSync(completionDocsMigrationPath, "utf8")

    expect(migrationSource).toContain("fieldExists")
    expect(migrationSource).toContain('fieldExists(projects, "number_of_students")')
    expect(migrationSource).toContain("fieldExists(progressUpdates, field.name)")
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
  const seedScriptSource = readFileSync(seedScriptPath, "utf8")

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

  it("skips collections that are not present yet on fresh databases", () => {
    expect(rulesMigrationSource).toContain("findCollectionIfExists")
    expect(rulesMigrationSource).toMatch(/if\s*\(!collection\)/)
  })

  it("repairs existing volumes where edited migrations were already applied", () => {
    const repairMigrationSource = readFileSync(
      appliedHistoryRepairMigrationPath,
      "utf8"
    )

    expect(repairMigrationSource).toContain("POCKETBASE_ADMIN_EMAIL")
    expect(repairMigrationSource).toContain("promoteConfiguredAdmin")
    expect(repairMigrationSource).toContain("backfillUsers")
    expect(repairMigrationSource).toContain("applyAccessRules")
    expect(repairMigrationSource).toContain("activity_logs")
    expect(repairMigrationSource).toContain("locations")
    expect(repairMigrationSource).toContain('role = "Super Admin"')
  })

  it("repairs user role fields when PocketBase field lookup is non-throwing", () => {
    const repairMigrationSource = readFileSync(userFieldRepairMigrationPath, "utf8")

    expect(repairMigrationSource).toContain("field && field.name === name")
    expect(repairMigrationSource).toContain("ensureUserFields")
    expect(repairMigrationSource).toContain("promoteConfiguredAdmin")
    expect(repairMigrationSource).toContain("account_status")
  })

  it("syncs the configured app admin password for legacy auth records", () => {
    const repairMigrationSource = readFileSync(
      adminPasswordRepairMigrationPath,
      "utf8"
    )

    expect(repairMigrationSource).toContain("POCKETBASE_ADMIN_EMAIL")
    expect(repairMigrationSource).toContain("POCKETBASE_ADMIN_PASSWORD")
    expect(repairMigrationSource).toContain("setPassword")
    expect(seedScriptSource).toContain("passwordConfirm: adminPassword")
  })
})

describe("PocketBase audit hook (V124-V130)", () => {
  const hookSource = readFileSync(auditHookPath, "utf8")
  const hookEntrypointSource = readFileSync(auditHookEntrypointPath, "utf8")

  it("owns activity log writes in pb_hooks", () => {
    expect(hookEntrypointSource).toContain("require")
    expect(hookEntrypointSource).toContain("audit.js")
    expect(hookEntrypointSource).toContain("onRecordAfterCreateSuccess")
    expect(hookEntrypointSource).toContain("onRecordAfterUpdateSuccess")
    expect(hookEntrypointSource).toContain("onRecordAfterDeleteSuccess")
    expect(hookEntrypointSource).toContain("onRecordAfterCreateError")
    expect(hookEntrypointSource).toContain("onRecordAfterUpdateError")
    expect(hookEntrypointSource).toContain("onRecordAfterDeleteError")
    expect(hookEntrypointSource).toContain("onRecordCreateRequest")
    expect(hookEntrypointSource).toContain("onRecordUpdateRequest")
    expect(hookEntrypointSource).toContain("onRecordDeleteRequest")
    expect(hookSource).toContain("AUDITED_COLLECTIONS")
    expect(hookSource).toContain("activity_logs")
    expect(hookSource).toContain("app.save")
  })

  it("sanitizes secrets before writing audit records", () => {
    expect(hookSource).toContain("sanitize")
    expect(hookSource).toContain("password")
    expect(hookSource).toContain("[redacted]")
  })

  it("writes wide events with before/after, duration, request, and env context", () => {
    expect(hookSource).toContain('audit.set("before"')
    expect(hookSource).toContain('audit.set("after"')
    expect(hookSource).toContain("Date.now()")
    expect(hookSource).toContain("duration_ms")
    expect(hookSource).toContain("request_id")
    expect(hookSource).toContain("version")
    expect(hookSource).toContain("commit")
  })

  it("carries request auth into delayed success/error hooks", () => {
    expect(hookSource).toContain("REQUEST_CONTEXT")
    expect(hookSource).toContain("REQUEST_CONTEXT_BY_KEY")
    expect(hookSource).toContain("auditRequest")
    expect(hookSource).toContain("REQUEST_CONTEXT.set")
    expect(hookSource).toContain("REQUEST_CONTEXT_BY_KEY.set")
    expect(hookSource).toContain("REQUEST_CONTEXT.get")
  })

  it("uses current PocketBase request auth and event app APIs", () => {
    expect(hookSource).toContain("requestInfo.auth")
    expect(hookSource).toContain("event.auth")
    expect(hookSource).toContain("currentAuth")
    expect(hookSource).toContain("globalThis.$app")
  })

  it("suppresses duplicate request and persistence error audit rows", () => {
    expect(hookSource).toContain("ERROR_AUDITED")
    expect(hookSource).toContain("REQUEST_AUDITED_BY_KEY")
    expect(hookSource).toContain("ERROR_AUDITED.add")
    expect(hookSource).toContain("ERROR_AUDITED.has")
  })

  it("maps _superusers audit actors without writing them into users relation", () => {
    expect(hookSource).toContain("authCollectionName")
    expect(hookSource).toContain("_superusers")
    expect(hookSource).toContain("actorUserId")
  })
})
