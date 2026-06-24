const TextField = globalThis.TextField
const migrate = globalThis.migrate

const SUPER_ADMIN_RULE = '@request.auth.id != "" && @request.auth.role = "Super Admin"'
const PROVINCE_RULE = '@request.auth.id != "" && @request.auth.role = "Province"'
const SUPER_ADMIN_OR_PROVINCE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE})`
const MUNICIPALITY_PROJECT_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Municipality" && municipality = @request.auth.municipality'
const BARANGAY_PROJECT_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Barangay" && municipality = @request.auth.municipality && barangay = @request.auth.barangay'
const PROJECT_SCOPE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE}) || (${MUNICIPALITY_PROJECT_SCOPE_RULE}) || (${BARANGAY_PROJECT_SCOPE_RULE})`
const PUBLIC_OR_PROJECT_SCOPE_RULE = `@request.auth.id = "" || (${PROJECT_SCOPE_RULE})`
const MUNICIPALITY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Municipality" && project.municipality = @request.auth.municipality'
const BARANGAY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Barangay" && project.municipality = @request.auth.municipality && project.barangay = @request.auth.barangay'
const RELATION_SCOPE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE}) || (${MUNICIPALITY_RELATION_SCOPE_RULE}) || (${BARANGAY_RELATION_SCOPE_RULE})`
const PUBLIC_OR_RELATION_SCOPE_RULE = `@request.auth.id = "" || (${RELATION_SCOPE_RULE})`
const BARANGAY_RELATION_MUTATE_RULE = `(${PROVINCE_RULE}) || (${BARANGAY_RELATION_SCOPE_RULE})`
const PUBLIC_ACTIVE_LOCATION_RULE = 'active = true || @request.auth.id != ""'

function findCollectionIfExists(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function fieldExists(collection, name) {
  try {
    const field = collection.fields.getByName(name)
    return field && field.name === name
  } catch {
    return false
  }
}

function ensureAuditScopeFields(app) {
  const logs = findCollectionIfExists(app, "activity_logs")
  if (!logs) return

  if (!fieldExists(logs, "actor_municipality")) {
    logs.fields.add(new TextField({ name: "actor_municipality" }))
  }
  if (!fieldExists(logs, "actor_barangay")) {
    logs.fields.add(new TextField({ name: "actor_barangay" }))
  }

  app.save(logs)
}

function setRules(app, name, rules) {
  const collection = findCollectionIfExists(app, name)
  if (!collection) return

  collection.listRule = rules.listRule
  collection.viewRule = rules.viewRule
  collection.createRule = rules.createRule
  collection.updateRule = rules.updateRule
  collection.deleteRule = rules.deleteRule
  app.save(collection)
}

function applyPbacRules(app) {
  setRules(app, "users", {
    listRule: SUPER_ADMIN_RULE,
    viewRule: SUPER_ADMIN_RULE,
    createRule: SUPER_ADMIN_RULE,
    updateRule: SUPER_ADMIN_RULE,
    deleteRule: SUPER_ADMIN_RULE,
  })

  setRules(app, "activity_logs", {
    listRule: SUPER_ADMIN_RULE,
    viewRule: SUPER_ADMIN_RULE,
    createRule: SUPER_ADMIN_RULE,
    updateRule: SUPER_ADMIN_RULE,
    deleteRule: SUPER_ADMIN_RULE,
  })

  setRules(app, "locations", {
    listRule: PUBLIC_ACTIVE_LOCATION_RULE,
    viewRule: PUBLIC_ACTIVE_LOCATION_RULE,
    createRule: SUPER_ADMIN_RULE,
    updateRule: SUPER_ADMIN_RULE,
    deleteRule: SUPER_ADMIN_RULE,
  })

  setRules(app, "projects", {
    listRule: PUBLIC_OR_PROJECT_SCOPE_RULE,
    viewRule: PUBLIC_OR_PROJECT_SCOPE_RULE,
    createRule: SUPER_ADMIN_OR_PROVINCE_RULE,
    updateRule: `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE}) || (${BARANGAY_PROJECT_SCOPE_RULE})`,
    deleteRule: SUPER_ADMIN_OR_PROVINCE_RULE,
  })

  setRules(app, "budget_allocations", {
    listRule: PUBLIC_OR_RELATION_SCOPE_RULE,
    viewRule: PUBLIC_OR_RELATION_SCOPE_RULE,
    createRule: SUPER_ADMIN_OR_PROVINCE_RULE,
    updateRule: SUPER_ADMIN_OR_PROVINCE_RULE,
    deleteRule: SUPER_ADMIN_OR_PROVINCE_RULE,
  })

  setRules(app, "budget_expenses", {
    listRule: PUBLIC_OR_RELATION_SCOPE_RULE,
    viewRule: PUBLIC_OR_RELATION_SCOPE_RULE,
    createRule: SUPER_ADMIN_OR_PROVINCE_RULE,
    updateRule: SUPER_ADMIN_OR_PROVINCE_RULE,
    deleteRule: SUPER_ADMIN_OR_PROVINCE_RULE,
  })

  setRules(app, "progress_updates", {
    listRule: PUBLIC_OR_RELATION_SCOPE_RULE,
    viewRule: PUBLIC_OR_RELATION_SCOPE_RULE,
    createRule: BARANGAY_RELATION_MUTATE_RULE,
    updateRule: BARANGAY_RELATION_MUTATE_RULE,
    deleteRule: BARANGAY_RELATION_MUTATE_RULE,
  })

  setRules(app, "approval_actions", {
    listRule: RELATION_SCOPE_RULE,
    viewRule: RELATION_SCOPE_RULE,
    createRule: PROVINCE_RULE,
    updateRule: PROVINCE_RULE,
    deleteRule: PROVINCE_RULE,
  })
}

migrate(
  (app) => {
    ensureAuditScopeFields(app)
    applyPbacRules(app)
  },
  () => {
    // Security repair migration: keep tightened PBAC and audit scope fields on down.
  }
)
