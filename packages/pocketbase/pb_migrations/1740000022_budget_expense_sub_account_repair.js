const migrate = globalThis.migrate
const NumberField = globalThis.NumberField
const TextField = globalThis.TextField

const LEGACY_BUDGET_EXPENSE_FIELDS = [
  "category",
  "fund_source",
  "funding_years",
  "fund_type",
  "fund_type_other",
]

const DEFAULT_SUB_ACCOUNT_BY_MAIN_ACCOUNT = {
  "General Fund": "GF - Proper",
  "Trust Fund": "Trust Fund - Proper",
}

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

function repairBudgetExpenseFields(app) {
  const expenses = findCollection(app, "budget_expenses")
  if (!expenses) return

  let changed = false
  if (!fieldExists(expenses, "year")) {
    expenses.fields.add(new NumberField({ name: "year", onlyInt: true }))
    changed = true
  }
  if (!fieldExists(expenses, "main_account")) {
    expenses.fields.add(new TextField({ name: "main_account" }))
    changed = true
  }
  if (!fieldExists(expenses, "sub_account")) {
    expenses.fields.add(new TextField({ name: "sub_account" }))
    changed = true
  }
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

function findRecords(app, collectionName, filter = "") {
  const records = []
  const batchSize = 500
  let offset = 0

  try {
    while (true) {
      const batch = app.findRecordsByFilter(
        collectionName,
        filter,
        "",
        batchSize,
        offset
      )
      records.push(...batch)
      if (batch.length < batchSize) break
      offset += batchSize
    }
  } catch {
    return records
  }

  return records
}

function repairBudgetExpenseRecords(app) {
  for (const record of findRecords(app, "budget_expenses")) {
    let changed = false
    let mainAccount = record.get("main_account")
    const date = record.get("date")

    if (mainAccount === "Other") {
      mainAccount = "Others"
      record.set("main_account", mainAccount)
      changed = true
    }
    if (!mainAccount) {
      mainAccount = "General Fund"
      record.set("main_account", mainAccount)
      changed = true
    }

    const year = record.get("year")
    if (!year && typeof date === "string") {
      const derivedYear = Number(date.slice(0, 4))
      if (Number.isInteger(derivedYear)) {
        record.set("year", derivedYear)
        changed = true
      }
    }

    const subAccount = record.get("sub_account")
    if (subAccount === "GT - Proper") {
      record.set("sub_account", "GF - Proper")
      changed = true
    } else if (!subAccount && DEFAULT_SUB_ACCOUNT_BY_MAIN_ACCOUNT[mainAccount]) {
      record.set("sub_account", DEFAULT_SUB_ACCOUNT_BY_MAIN_ACCOUNT[mainAccount])
      changed = true
    }

    if (changed) {
      app.save(record)
    }
  }
}

migrate(
  (app) => {
    repairBudgetExpenseFields(app)
    repairBudgetExpenseRecords(app)
  },
  () => {
    // Keep repaired fields/data on down; this migration fixes applied-history drift.
  }
)
