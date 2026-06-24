const migrate = globalThis.migrate

const APPROVAL_ACTION_VALUES = ["approve", "reject", "request_revision"]
const AUDIT_ROLE_VALUES = ["Super Admin", "Province", "Municipality", "Barangay"]
const AUDIT_ACTION_VALUES = [
  "create",
  "update",
  "delete",
  "deactivate",
  "approve",
  "reject",
  "request_revision",
  "reset_password",
]

const BARANGAY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Barangay" && project.municipality = @request.auth.municipality && project.barangay = @request.auth.barangay'

function findCollectionIfExists(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function setSelectValues(collection, fieldName, values) {
  try {
    const field = collection.fields.getByName(fieldName)
    field.values = values
    return true
  } catch {
    return false
  }
}

function repairApprovalActions(app) {
  const approvalActions = findCollectionIfExists(app, "approval_actions")
  if (!approvalActions) return

  if (setSelectValues(approvalActions, "action", APPROVAL_ACTION_VALUES)) {
    app.save(approvalActions)
  }
}

function repairActivityLogs(app) {
  const activityLogs = findCollectionIfExists(app, "activity_logs")
  if (!activityLogs) return

  let changed = false
  changed = setSelectValues(activityLogs, "actor_role", AUDIT_ROLE_VALUES) || changed
  changed = setSelectValues(activityLogs, "action", AUDIT_ACTION_VALUES) || changed

  if (changed) {
    app.save(activityLogs)
  }
}

function repairProgressUpdateRules(app) {
  const progressUpdates = findCollectionIfExists(app, "progress_updates")
  if (!progressUpdates) return

  progressUpdates.createRule = BARANGAY_RELATION_SCOPE_RULE
  progressUpdates.updateRule = BARANGAY_RELATION_SCOPE_RULE
  progressUpdates.deleteRule = BARANGAY_RELATION_SCOPE_RULE
  app.save(progressUpdates)
}

migrate(
  (app) => {
    repairApprovalActions(app)
    repairActivityLogs(app)
    repairProgressUpdateRules(app)
  },
  () => {
    // Repair-only migration: keep enum/rule fixes on down.
  }
)
