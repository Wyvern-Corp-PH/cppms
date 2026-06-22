/// <reference path="../pb_data/types.d.ts" />

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

function applyAccessRules(collection, name) {
  if (name === "users" || name === "activity_logs") {
    collection.listRule = SUPER_ADMIN_RULE
    collection.viewRule = SUPER_ADMIN_RULE
    collection.createRule = SUPER_ADMIN_RULE
    collection.updateRule = SUPER_ADMIN_RULE
    collection.deleteRule = SUPER_ADMIN_RULE
    return collection
  }

  if (name === "locations") {
    collection.listRule = PUBLIC_ACTIVE_LOCATION_RULE
    collection.viewRule = PUBLIC_ACTIVE_LOCATION_RULE
    collection.createRule = SUPER_ADMIN_RULE
    collection.updateRule = SUPER_ADMIN_RULE
    collection.deleteRule = SUPER_ADMIN_RULE
    return collection
  }

  collection.listRule = PUBLIC_READ_RULE
  collection.viewRule = PUBLIC_READ_RULE
  collection.createRule = ADMIN_WRITE_RULE
  collection.updateRule = ADMIN_WRITE_RULE
  collection.deleteRule = ADMIN_WRITE_RULE
  return collection
}

function lockAccessRules(collection) {
  collection.listRule = null
  collection.viewRule = null
  collection.createRule = null
  collection.updateRule = null
  collection.deleteRule = null
  return collection
}

migrate(
  (app) => {
    for (const name of COLLECTION_NAMES) {
      const collection = findCollectionIfExists(app, name)
      if (!collection) {
        continue
      }
      applyAccessRules(collection, name)
      app.save(collection)
    }
  },
  (app) => {
    for (const name of COLLECTION_NAMES) {
      const collection = findCollectionIfExists(app, name)
      if (!collection) {
        continue
      }
      lockAccessRules(collection)
      app.save(collection)
    }
  }
)
