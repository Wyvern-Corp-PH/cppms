const migrate = globalThis.migrate

const LEGACY_BUDGET_EXPENSE_FIELDS = [
  "category",
  "fund_source",
  "funding_years",
  "fund_type",
  "fund_type_other",
]

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

function removeLegacyBudgetExpenseFields(app) {
  const expenses = findCollection(app, "budget_expenses")
  if (!expenses) return

  let changed = false
  for (const field of LEGACY_BUDGET_EXPENSE_FIELDS) {
    if (fieldExists(expenses, field)) {
      expenses.fields.removeByName(field)
      changed = true
    }
  }

  if (changed) {
    app.save(expenses)
  }
}

migrate(
  (app) => {
    removeLegacyBudgetExpenseFields(app)
  },
  () => {
    // Legacy fields are intentionally not restored; current clients no longer send them.
  }
)
