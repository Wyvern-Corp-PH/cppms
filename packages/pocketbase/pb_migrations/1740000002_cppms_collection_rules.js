/// <reference path="../pb_data/types.d.ts" />

const COLLECTION_NAMES = [
  "projects",
  "budget_allocations",
  "budget_expenses",
  "progress_updates",
  "approval_actions",
]

const PUBLIC_READ_RULE = ""
const ADMIN_WRITE_RULE = '@request.auth.id != ""'

function applyAccessRules(collection) {
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
      const collection = app.findCollectionByNameOrId(name)
      applyAccessRules(collection)
      app.save(collection)
    }
  },
  (app) => {
    for (const name of COLLECTION_NAMES) {
      try {
        const collection = app.findCollectionByNameOrId(name)
        lockAccessRules(collection)
        app.save(collection)
      } catch {
        // collection already removed
      }
    }
  }
)
