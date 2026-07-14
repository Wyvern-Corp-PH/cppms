const migrate = globalThis.migrate

const SUPER_ADMIN_RULE = '@request.auth.id != "" && @request.auth.role = "Super Admin"'
const PROVINCE_RULE = '@request.auth.id != "" && @request.auth.role = "Province"'
const SUPER_ADMIN_OR_PROVINCE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE})`
const MUNICIPALITY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Municipality" && project.municipality = @request.auth.municipality'
const BARANGAY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Barangay" && project.municipality = @request.auth.municipality && project.barangay = @request.auth.barangay'
const BUDGET_EXPENSE_CREATE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE}) || (${MUNICIPALITY_RELATION_SCOPE_RULE}) || (${BARANGAY_RELATION_SCOPE_RULE})`

function findCollectionIfExists(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function repairBudgetExpensesScopedCreateRule(app) {
  const expenses = findCollectionIfExists(app, "budget_expenses")
  if (!expenses) return

  expenses.createRule = BUDGET_EXPENSE_CREATE_RULE
  expenses.updateRule = SUPER_ADMIN_OR_PROVINCE_RULE
  expenses.deleteRule = SUPER_ADMIN_OR_PROVINCE_RULE
  app.save(expenses)
}

migrate(
  (app) => {
    repairBudgetExpensesScopedCreateRule(app)
  },
  (app) => {
    // Repair-only: keep scoped create so Mun/Barangay progress sync stays allowed.
    repairBudgetExpensesScopedCreateRule(app)
  }
)
