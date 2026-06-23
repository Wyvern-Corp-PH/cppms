const Collection = globalThis.Collection
const SelectField = globalThis.SelectField
const TextField = globalThis.TextField
const migrate = globalThis.migrate

const documentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]

function collectionExists(app, name) {
  try {
    app.findCollectionByNameOrId(name)
    return true
  } catch {
    return false
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

function renameField(collection, from, to) {
  if (fieldExists(collection, to)) return
  if (!fieldExists(collection, from)) return
  const field = collection.fields.getByName(from)
  field.name = to
}

function ensureUserFields(app, users) {
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
  const users = app.findCollectionByNameOrId("users")
  const records = app.findRecordsByFilter(users.id, "", "", 500, 0)

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
}

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    ensureUserFields(app, users)
    backfillUsers(app)
    const usersId = users.id

    const projects = app.findCollectionByNameOrId("projects")
    renameField(projects, "agreement_file", "resolution_file")
    app.save(projects)

    const allocations = app.findCollectionByNameOrId("budget_allocations")
    renameField(allocations, "agreement_file", "resolution_file")
    app.save(allocations)

    if (!collectionExists(app, "locations")) {
      app.save(
        new Collection({
          type: "base",
          name: "locations",
          fields: [
            { type: "text", name: "name", required: true },
            { type: "text", name: "slug", required: true },
            {
              type: "select",
              name: "level",
              maxSelect: 1,
              values: ["Municipality", "Barangay"],
            },
            { type: "text", name: "municipality_name" },
            { type: "text", name: "municipality_slug" },
            { type: "text", name: "barangay_name" },
            { type: "bool", name: "active", required: true },
            { type: "number", name: "sort_order", min: 0, onlyInt: true },
            { type: "relation", name: "created_by", collectionId: usersId, maxSelect: 1 },
            { type: "relation", name: "updated_by", collectionId: usersId, maxSelect: 1 },
          ],
          indexes: ["CREATE UNIQUE INDEX idx_locations_slug ON locations (slug)"],
        })
      )
    }

    if (!collectionExists(app, "activity_logs")) {
      app.save(
        new Collection({
          type: "base",
          name: "activity_logs",
          fields: [
            { type: "relation", name: "actor_user", collectionId: usersId, maxSelect: 1 },
            {
              type: "select",
              name: "actor_role",
              required: true,
              maxSelect: 1,
              values: ["Super Admin", "Admin", "User"],
            },
            {
              type: "select",
              name: "action",
              required: true,
              maxSelect: 1,
              values: ["create", "update", "delete", "deactivate", "approve", "reject", "reset_password"],
            },
            { type: "text", name: "resource", required: true },
            { type: "text", name: "resource_id" },
            { type: "text", name: "policy_key" },
            { type: "relation", name: "target_user", collectionId: usersId, maxSelect: 1 },
            { type: "json", name: "before" },
            { type: "json", name: "after" },
            {
              type: "select",
              name: "outcome",
              required: true,
              maxSelect: 1,
              values: ["success", "error", "denied"],
            },
            { type: "text", name: "error" },
            { type: "number", name: "duration_ms", required: true, min: 0 },
            { type: "text", name: "request_id" },
            { type: "json", name: "env" },
            { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
          ],
        })
      )
    }
  },
  (app) => {
    for (const name of ["activity_logs", "locations"]) {
      if (collectionExists(app, name)) {
        app.delete(app.findCollectionByNameOrId(name))
      }
    }

    for (const name of ["projects", "budget_allocations"]) {
      const collection = app.findCollectionByNameOrId(name)
      renameField(collection, "resolution_file", "agreement_file")
      app.save(collection)
    }
  }
)
