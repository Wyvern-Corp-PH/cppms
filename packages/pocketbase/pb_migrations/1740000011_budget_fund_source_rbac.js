const NumberField = globalThis.NumberField
const SelectField = globalThis.SelectField
const TextField = globalThis.TextField
const migrate = globalThis.migrate

const ROLE_VALUES = ["Super Admin", "Province", "Municipality", "Barangay"]
const MAIN_ACCOUNT_VALUES = [
  "General Fund",
  "Special Education Fund",
  "Special Health Fund",
  "Trust Fund",
  "Other",
]

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

  if (!fieldExists(expenses, "year")) {
    expenses.fields.add(new NumberField({ name: "year", required: true, onlyInt: true }))
    changed = true
  }

  if (!fieldExists(expenses, "main_account")) {
    expenses.fields.add(
      new SelectField({
        name: "main_account",
        required: true,
        maxSelect: 1,
        values: MAIN_ACCOUNT_VALUES,
      })
    )
    changed = true
  } else if (setSelectValues(expenses, "main_account", MAIN_ACCOUNT_VALUES)) {
    changed = true
  }

  if (!fieldExists(expenses, "sub_account")) {
    expenses.fields.add(new TextField({ name: "sub_account" }))
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
    if (!record.get("year")) {
      const date = String(record.get("date") || "")
      record.set("year", Number(date.slice(0, 4)) || new Date().getFullYear())
    }
    if (!record.get("main_account")) {
      record.set("main_account", "General Fund")
    }
    if (category === "Other" && !record.get("sub_account")) {
      record.set("sub_account", "Legacy Other")
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

function removeLegacyBudgetExpenseFundFields(app) {
  const expenses = app.findCollectionByNameOrId("budget_expenses")
  let changed = false
  for (const field of ["fund_source", "funding_years", "fund_type", "fund_type_other"]) {
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
    ensureUserScopeFields(app)
    ensureBudgetExpenseFields(app)
    backfillUsers(app)
    backfillExpenses(app)
    removeLegacyBudgetCategory(app)
    removeLegacyBudgetExpenseFundFields(app)
  },
  () => {
    // Additive business-rule migration; keep repaired schema/data on down.
  }
)
