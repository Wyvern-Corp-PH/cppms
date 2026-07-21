const migrate = globalThis.migrate

const SUPER_ADMIN_RULE =
  '@request.auth.id != "" && @request.auth.role = "Super Admin"'
const PROVINCE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Province"'
const SUPER_ADMIN_OR_PROVINCE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE})`
const MUNICIPALITY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Municipality" && project.municipality = @request.auth.municipality'
const BARANGAY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Barangay" && project.municipality = @request.auth.municipality && project.barangay = @request.auth.barangay'
const LOCAL_PROGRESS_MUTATE_RULE = `(${MUNICIPALITY_RELATION_SCOPE_RULE}) || (${BARANGAY_RELATION_SCOPE_RULE})`
/** Action matrix: SA + Province + scoped Mun/Barangay may mutate progress_updates. */
const PROGRESS_MUTATE_RULE = `(${SUPER_ADMIN_OR_PROVINCE_RULE}) || (${LOCAL_PROGRESS_MUTATE_RULE})`

function findCollectionIfExists(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function repairProgressUpdateRules(app) {
  const progressUpdates = findCollectionIfExists(app, "progress_updates")
  if (!progressUpdates) return

  progressUpdates.createRule = PROGRESS_MUTATE_RULE
  progressUpdates.updateRule = PROGRESS_MUTATE_RULE
  progressUpdates.deleteRule = PROGRESS_MUTATE_RULE
  app.save(progressUpdates)
}

function repairApprovalActionRules(app) {
  const approvalActions = findCollectionIfExists(app, "approval_actions")
  if (!approvalActions) return

  approvalActions.createRule = SUPER_ADMIN_OR_PROVINCE_RULE
  approvalActions.updateRule = SUPER_ADMIN_OR_PROVINCE_RULE
  approvalActions.deleteRule = SUPER_ADMIN_OR_PROVINCE_RULE
  app.save(approvalActions)
}

migrate(
  (app) => {
    repairProgressUpdateRules(app)
    repairApprovalActionRules(app)
  },
  () => {
    // Repair-only: keep widened SA/Province progress + approval rights on down.
  }
)
