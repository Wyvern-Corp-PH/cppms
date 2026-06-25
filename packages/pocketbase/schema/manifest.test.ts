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
  FUND_TYPE,
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
const locationHierarchyMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000010_location_hierarchy.js"
)
const budgetFundSourceRbacMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000011_budget_fund_source_rbac.js"
)
const pbacRulesMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000012_pbac_scope_rules_audit_scope.js"
)
const enumRepairMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000013_approval_audit_select_values.js"
)
const budgetFundOptionCollectionsMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000014_budget_fund_option_collections.js"
)
const dropdownOptionCollectionsMigrationPath = resolve(
  packageRoot,
  "pb_migrations",
  "1740000015_dropdown_option_collections.js"
)

describe("schema manifest (SPEC §I)", () => {
  it("defines auth, module, location, and audit collections", () => {
    expect(COLLECTION_NAMES).toEqual([
      "users",
      "projects",
      "budget_allocations",
      "budget_expenses",
      "budget_fund_sources",
      "budget_funding_years",
      "budget_fund_main_accounts",
      "budget_fund_sub_accounts",
      "project_status_options",
      "project_category_options",
      "user_role_options",
      "user_account_status_options",
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
    expect(FUND_TYPE).toContain("Other")
    expect(APPROVAL_ACTION).toEqual(["approve", "reject", "request_revision"])
    expect(ROLE).toEqual(["Super Admin", "Province", "Municipality", "Barangay"])
    expect(ACCOUNT_STATUS).toEqual(["Active", "Inactive"])
    expect(AUDIT_ACTION).toContain("request_revision")
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

  it("declares hierarchical location fields from SQL source", () => {
    const locations = COLLECTION_MANIFEST.find(
      (collection) => collection.name === "locations"
    )

    expect(locations?.fields).toEqual(
      expect.arrayContaining([
        "level",
        "municipality_name",
        "municipality_slug",
        "barangay_name",
      ])
    )
  })

  it("declares Budget fund dropdown option collections", () => {
    for (const name of [
      "budget_fund_sources",
      "budget_funding_years",
      "budget_fund_main_accounts",
      "project_status_options",
      "project_category_options",
      "user_role_options",
      "user_account_status_options",
    ]) {
      const collection = COLLECTION_MANIFEST.find(
        (manifestCollection) => manifestCollection.name === name
      )

      expect(collection?.fields).toEqual(["name", "active", "sort_order"])
    }

    expect(
      COLLECTION_MANIFEST.find(
        (manifestCollection) =>
          manifestCollection.name === "budget_fund_sub_accounts"
      )?.fields
    ).toEqual(["main_account", "name", "active", "sort_order"])
  })
})

describe("pb migration file", () => {
  const migrationSource = readFileSync(migrationPath, "utf8")
  const additiveMigrationSource = [
    completionDocsMigrationPath,
    userFieldRepairMigrationPath,
    locationHierarchyMigrationPath,
    budgetFundSourceRbacMigrationPath,
    pbacRulesMigrationPath,
    budgetFundOptionCollectionsMigrationPath,
    dropdownOptionCollectionsMigrationPath,
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n")

  it("exists and exports migrate()", () => {
    expect(migrationSource).toMatch(/migrate\s*\(/)
  })

  it("creates every collection from manifest", () => {
    const allMigrationSource = `${migrationSource}\n${additiveMigrationSource}`

    for (const { name } of COLLECTION_MANIFEST) {
      expect(allMigrationSource).toContain(`name: "${name}"`)
    }
  })

  it("declares every custom field from manifest", () => {
    for (const { name, fields } of COLLECTION_MANIFEST) {
      for (const field of fields) {
        expect(
          `${migrationSource}\n${additiveMigrationSource}`,
          `${name}.${field} missing in initial/additive migrations`
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
  it("manifest defines scoped PBAC baseline rule strings", () => {
    expect(PUBLIC_READ_RULE).toBe('@request.auth.id = ""')
    expect(ADMIN_WRITE_RULE).toBe('@request.auth.id != ""')
    expect(COLLECTION_ACCESS_RULES).toEqual({
      listRule: '@request.auth.id = ""',
      viewRule: '@request.auth.id = ""',
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

  it("rules migration applies scoped PBAC rules to every collection", () => {
    const ruleBearingMigrationSource = `${rulesMigrationSource}\n${readFileSync(
      budgetFundOptionCollectionsMigrationPath,
      "utf8"
    )}\n${readFileSync(dropdownOptionCollectionsMigrationPath, "utf8")}`

    for (const name of COLLECTION_NAMES) {
      expect(
        ruleBearingMigrationSource,
        `${name} missing in access-rule migrations`
      ).toContain(`"${name}"`)
    }

    expect(rulesMigrationSource).toContain("listRule")
    expect(rulesMigrationSource).toContain("viewRule")
    expect(rulesMigrationSource).toContain("createRule")
    expect(rulesMigrationSource).toContain("updateRule")
    expect(rulesMigrationSource).toContain("deleteRule")
    expect(rulesMigrationSource).toContain(ADMIN_WRITE_RULE)
    expect(readFileSync(pbacRulesMigrationPath, "utf8")).toContain("applyPbacRules")
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

  it("adds hierarchy fields for existing location collections", () => {
    const migrationSource = readFileSync(locationHierarchyMigrationPath, "utf8")

    expect(migrationSource).toContain("ensureLocationHierarchyFields")
    expect(migrationSource).toContain("municipality_slug")
    expect(migrationSource).toContain("barangay_name")
    expect(seedScriptSource).toContain("CAGAYAN_LOCATION_TREE")
    expect(seedScriptSource).toContain("barangay_name")
  })

  it("adds fund source fields and four-role RBAC for existing collections", () => {
    const migrationSource = readFileSync(budgetFundSourceRbacMigrationPath, "utf8")

    expect(migrationSource).toContain("ensureBudgetExpenseFields")
    expect(migrationSource).toContain("year")
    expect(migrationSource).toContain("main_account")
    expect(migrationSource).toContain("sub_account")
    expect(migrationSource).toContain("ROLE_VALUES")
    expect(migrationSource).toContain("Province")
    expect(migrationSource).toContain("Barangay")
    expect(seedScriptSource).toContain("main_account: expense.main_account")
  })

  it("adds PBAC scope rules and audit actor scope fields for existing collections", () => {
    const migrationSource = readFileSync(pbacRulesMigrationPath, "utf8")

    expect(migrationSource).toContain("PROVINCE_RULE")
    expect(migrationSource).toContain("BARANGAY_PROJECT_SCOPE_RULE")
    expect(migrationSource).toContain("MUNICIPALITY_PROJECT_SCOPE_RULE")
    expect(migrationSource).toContain("applyPbacRules")
    expect(migrationSource).toContain("approval_actions")
    expect(migrationSource).toContain('role = "Province"')
    expect(migrationSource).toContain("actor_municipality")
    expect(migrationSource).toContain("actor_barangay")
  })

  it("repairs approval and audit select values to match manifest enums", () => {
    const migrationSource = readFileSync(enumRepairMigrationPath, "utf8")

    expect(migrationSource).toContain("approval_actions")
    expect(migrationSource).toContain("activity_logs")
    expect(migrationSource).toContain("request_revision")
    expect(migrationSource).toContain("Province")
    expect(migrationSource).toContain("Municipality")
    expect(migrationSource).toContain("Barangay")
  })

  it("adds editable Budget fund dropdown option collections", () => {
    const migrationSource = readFileSync(
      budgetFundOptionCollectionsMigrationPath,
      "utf8"
    )

    expect(migrationSource).not.toContain("Client TBD Source")
    expect(migrationSource).toContain("budget_funding_years")
    expect(migrationSource).toContain("budget_fund_main_accounts")
    expect(migrationSource).toContain("budget_fund_sub_accounts")
    expect(migrationSource).toContain("main_account")
    expect(migrationSource).toContain("20% DF")
    expect(migrationSource).toContain("LDRRMF - SA")
    expect(migrationSource).toContain("General Fund")
    expect(migrationSource).toContain("Special Education Fund")
    expect(migrationSource).toContain("Special Health Fund")
    expect(migrationSource).toContain("Trust Fund")
    expect(migrationSource).toContain("Other")
  })

  it("adds editable project and user dropdown option collections", () => {
    const migrationSource = readFileSync(
      dropdownOptionCollectionsMigrationPath,
      "utf8"
    )

    expect(migrationSource).toContain("project_status_options")
    expect(migrationSource).toContain("project_category_options")
    expect(migrationSource).toContain("user_role_options")
    expect(migrationSource).toContain("user_account_status_options")
    expect(migrationSource).toContain("Planning")
    expect(migrationSource).toContain("Infrastructure")
    expect(migrationSource).toContain("Super Admin")
    expect(migrationSource).toContain("Active")
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

  it("writes actor municipality and barangay scope in wide events", () => {
    expect(hookSource).toContain("actorScope")
    expect(hookSource).toContain('audit.set("actor_municipality"')
    expect(hookSource).toContain('audit.set("actor_barangay"')
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
