const migrate = globalThis.migrate

const SUPER_ADMIN_RULE = '@request.auth.id != "" && @request.auth.role = "Super Admin"'
const PROVINCE_RULE = '@request.auth.id != "" && @request.auth.role = "Province"'
const SUPER_ADMIN_OR_PROVINCE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE})`
const MUNICIPALITY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Municipality" && project.municipality = @request.auth.municipality'
const BARANGAY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Barangay" && project.municipality = @request.auth.municipality && project.barangay = @request.auth.barangay'
const BOUND_EXPENSE_CREATE_SAME_PROJECT_RULE =
  'progress_update = "" || progress_update.project = project'
const BUDGET_EXPENSE_CREATE_RULE = `((${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE}) || (${MUNICIPALITY_RELATION_SCOPE_RULE}) || (${BARANGAY_RELATION_SCOPE_RULE})) && (${BOUND_EXPENSE_CREATE_SAME_PROJECT_RULE})`
const BOUND_EXPENSE_NO_RETARGET_RULE =
  'progress_update != "" && (@request.body.progress_update:isset = false || @request.body.progress_update = progress_update) && (@request.body.project:isset = false || @request.body.project = project)'
const MUNICIPALITY_BOUND_EXPENSE_UPDATE_RULE = `(${MUNICIPALITY_RELATION_SCOPE_RULE}) && (${BOUND_EXPENSE_NO_RETARGET_RULE})`
const BARANGAY_BOUND_EXPENSE_UPDATE_RULE = `(${BARANGAY_RELATION_SCOPE_RULE}) && (${BOUND_EXPENSE_NO_RETARGET_RULE})`
const BUDGET_EXPENSE_UPDATE_RULE = `(${SUPER_ADMIN_OR_PROVINCE_RULE}) || (${MUNICIPALITY_BOUND_EXPENSE_UPDATE_RULE}) || (${BARANGAY_BOUND_EXPENSE_UPDATE_RULE})`

function findCollectionIfExists(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function applyBudgetExpenseRules(app, updateRule) {
  const expenses = findCollectionIfExists(app, "budget_expenses")
  if (!expenses) return

  expenses.createRule = BUDGET_EXPENSE_CREATE_RULE
  expenses.updateRule = updateRule
  expenses.deleteRule = SUPER_ADMIN_OR_PROVINCE_RULE
  app.save(expenses)
}

migrate(
  (app) => {
    applyBudgetExpenseRules(app, BUDGET_EXPENSE_UPDATE_RULE)
  },
  (app) => {
    applyBudgetExpenseRules(app, SUPER_ADMIN_OR_PROVINCE_RULE)
  }
)
