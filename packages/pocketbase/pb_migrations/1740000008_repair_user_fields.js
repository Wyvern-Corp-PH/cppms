const SelectField = globalThis.SelectField
const TextField = globalThis.TextField
const migrate = globalThis.migrate

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

migrate(
  (app) => {
    ensureUserFields(app)
    backfillUsers(app)
    promoteConfiguredAdmin(app)
  },
  () => {
    // Security/data repair migration: keep corrected user fields on down.
  }
)
