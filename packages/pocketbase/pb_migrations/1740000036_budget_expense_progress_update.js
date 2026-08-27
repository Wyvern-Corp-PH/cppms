/// <reference path="../pb_data/types.d.ts" />

const RelationField = globalThis.RelationField
const migrate = globalThis.migrate

const UNIQUE_INDEX_NAME = "idx_budget_expenses_progress_update"
const UNIQUE_WHERE = "progress_update != ''"

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function fieldExists(collection, name) {
  try {
    return Boolean(collection.fields.getByName(name))
  } catch {
    return false
  }
}

migrate(
  (app) => {
    const expenses = findCollection(app, "budget_expenses")
    const progressUpdates = findCollection(app, "progress_updates")
    if (!expenses || !progressUpdates) return

    if (!fieldExists(expenses, "progress_update")) {
      expenses.fields.add(
        new RelationField({
          name: "progress_update",
          collectionId: progressUpdates.id,
          maxSelect: 1,
          cascadeDelete: false,
        })
      )
    }

    expenses.addIndex(UNIQUE_INDEX_NAME, true, "progress_update", UNIQUE_WHERE)
    app.save(expenses)
  },
  (app) => {
    const expenses = findCollection(app, "budget_expenses")
    if (!expenses) return

    expenses.removeIndex(UNIQUE_INDEX_NAME)
    if (fieldExists(expenses, "progress_update")) {
      expenses.fields.removeByName("progress_update")
    }
    app.save(expenses)
  }
)
