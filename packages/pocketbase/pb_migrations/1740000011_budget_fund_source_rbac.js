const SelectField = globalThis.SelectField
const TextField = globalThis.TextField
const migrate = globalThis.migrate

const ROLE_VALUES = ["Super Admin", "Province", "Municipality", "Barangay"]
const FUND_TYPE_VALUES = ["Local", "National", "Grant", "Other"]

function fieldExists(collection, name) {
  try {
    const field = collection.fields.getByName(name)
    return field && field.name === name
  } catch {
    return false
  }
}

function setSelectValues(collection, name, values) {
  try {
    const field = collection.fields.getByName(name)
    field.values = values
    return true
  } catch {
    return false
  }
}

function ensureUserScopeFields(app) {
  const users = app.findCollectionByNameOrId("users")
  let changed = false

  if (!fieldExists(users, "role")) {
    users.fields.add(
      new SelectField({
        name: "role",
        required: true,
        maxSelect: 1,
        values: ROLE_VALUES,
      })
    )
    changed = true
  } else if (setSelectValues(users, "role", ROLE_VALUES)) {
    changed = true
  }

  for (const field of [{ name: "municipality" }, { name: "barangay" }]) {
    if (!fieldExists(users, field.name)) {
      users.fields.add(new TextField({ name: field.name }))
      changed = true
    }
  }

  if (changed) {
    app.save(users)
  }
}

function ensureBudgetExpenseFields(app) {
  const expenses = app.findCollectionByNameOrId("budget_expenses")
  let changed = false

  for (const field of [
    { name: "fund_source" },
    { name: "funding_years" },
    { name: "fund_type_other" },
  ]) {
    if (!fieldExists(expenses, field.name)) {
      expenses.fields.add(new TextField({ name: field.name }))
      changed = true
    }
  }

  if (!fieldExists(expenses, "fund_type")) {
    expenses.fields.add(
      new SelectField({
        name: "fund_type",
        required: true,
        maxSelect: 1,
        values: FUND_TYPE_VALUES,
      })
    )
    changed = true
  } else if (setSelectValues(expenses, "fund_type", FUND_TYPE_VALUES)) {
    changed = true
  }

  if (changed) {
    app.save(expenses)
  }
}

function backfillUsers(app) {
  const records = app.findRecordsByFilter("users", "", "", 1000, 0)
  for (const record of records) {
    const role = record.get("role")
    if (role === "Admin") {
      record.set("role", "Province")
    } else if (role === "User") {
      record.set("role", "Barangay")
    } else if (!ROLE_VALUES.includes(role)) {
      record.set("role", "Province")
    }
    if (!record.get("account_status")) {
      record.set("account_status", "Active")
    }
    app.save(record)
  }
}

function backfillExpenses(app) {
  const records = app.findRecordsByFilter("budget_expenses", "", "", 1000, 0)
  for (const record of records) {
    const category = record.get("category")
    if (!record.get("fund_source")) {
      record.set("fund_source", "Legacy expense")
    }
    if (!record.get("funding_years")) {
      const date = String(record.get("date") || "")
      record.set("funding_years", date.slice(0, 4) || String(new Date().getFullYear()))
    }
    if (!record.get("fund_type")) {
      record.set("fund_type", category === "Other" ? "Other" : "Local")
    }
    if (category === "Other" && !record.get("fund_type_other")) {
      record.set("fund_type_other", "Legacy Other")
    }
    app.save(record)
  }
}

function removeLegacyBudgetCategory(app) {
  const expenses = app.findCollectionByNameOrId("budget_expenses")
  if (fieldExists(expenses, "category")) {
    expenses.fields.removeByName("category")
    app.save(expenses)
  }
}

migrate(
  (app) => {
    ensureUserScopeFields(app)
    ensureBudgetExpenseFields(app)
    backfillUsers(app)
    backfillExpenses(app)
    removeLegacyBudgetCategory(app)
  },
  () => {
    // Additive business-rule migration; keep repaired schema/data on down.
  }
)
