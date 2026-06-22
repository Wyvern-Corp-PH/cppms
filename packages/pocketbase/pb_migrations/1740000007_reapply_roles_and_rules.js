const SelectField = globalThis.SelectField
const TextField = globalThis.TextField
const migrate = globalThis.migrate

const COLLECTION_NAMES = [
  "users",
  "projects",
  "budget_allocations",
  "budget_expenses",
  "progress_updates",
  "approval_actions",
  "locations",
  "activity_logs",
]

const PUBLIC_READ_RULE = ""
const ADMIN_WRITE_RULE = '@request.auth.id != ""'
const SUPER_ADMIN_RULE = '@request.auth.id != "" && @request.auth.role = "Super Admin"'
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

function ensureUserFields(app) {
  const users = app.findCollectionByNameOrId("users")
  if (!fieldExists(users, "name")) {
    users.fields.add(new TextField({ name: "name" }))
  }
  if (!fieldExists(users, "role")) {
    users.fields.add(
      new SelectField({
        name: "role",
        required: true,
        maxSelect: 1,
        values: ["Super Admin", "Admin", "User"],
      })
    )
  }
  if (!fieldExists(users, "account_status")) {
    users.fields.add(
      new SelectField({
        name: "account_status",
        required: true,
        maxSelect: 1,
        values: ["Active", "Inactive"],
      })
    )
  }
  app.save(users)
}

function backfillUsers(app) {
  const limit = 500
  let offset = 0

  while (true) {
    const records = app.findRecordsByFilter("users", "", "", limit, offset)
    if (records.length === 0) {
      return
    }

    for (const record of records) {
      let changed = false
      if (!record.get("role")) {
        record.set("role", "Admin")
        changed = true
      }
      if (!record.get("account_status")) {
        record.set("account_status", "Active")
        changed = true
      }
      if (changed) {
        app.save(record)
      }
    }

    offset += records.length
  }
}

function promoteConfiguredAdmin(app) {
  const adminEmail = globalThis.$os?.getenv?.("POCKETBASE_ADMIN_EMAIL") || ""
  if (!adminEmail) {
    return
  }

  let admin
  try {
    admin = app.findAuthRecordByEmail("users", adminEmail)
  } catch {
    return
  }

  admin.set("role", "Super Admin")
  admin.set("account_status", "Active")
  if (!admin.get("name")) {
    admin.set("name", "CPPMS Dev Admin")
  }
  app.save(admin)
}

function applyAccessRules(collection, name) {
  if (name === "users" || name === "activity_logs") {
    collection.listRule = SUPER_ADMIN_RULE
    collection.viewRule = SUPER_ADMIN_RULE
    collection.createRule = SUPER_ADMIN_RULE
    collection.updateRule = SUPER_ADMIN_RULE
    collection.deleteRule = SUPER_ADMIN_RULE
    return
  }

  if (name === "locations") {
    collection.listRule = PUBLIC_ACTIVE_LOCATION_RULE
    collection.viewRule = PUBLIC_ACTIVE_LOCATION_RULE
    collection.createRule = SUPER_ADMIN_RULE
    collection.updateRule = SUPER_ADMIN_RULE
    collection.deleteRule = SUPER_ADMIN_RULE
    return
  }

  collection.listRule = PUBLIC_READ_RULE
  collection.viewRule = PUBLIC_READ_RULE
  collection.createRule = ADMIN_WRITE_RULE
  collection.updateRule = ADMIN_WRITE_RULE
  collection.deleteRule = ADMIN_WRITE_RULE
}

function reapplyAccessRules(app) {
  for (const name of COLLECTION_NAMES) {
    const collection = findCollectionIfExists(app, name)
    if (!collection) {
      continue
    }
    applyAccessRules(collection, name)
    app.save(collection)
  }
}

migrate(
  (app) => {
    ensureUserFields(app)
    backfillUsers(app)
    promoteConfiguredAdmin(app)
    reapplyAccessRules(app)
  },
  () => {
    // Security/data repair migration: keep corrected roles and rules on down.
  }
)
