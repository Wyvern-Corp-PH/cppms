const migrate = globalThis.migrate

const SUPER_ADMIN_RULE = '@request.auth.id != "" && @request.auth.role = "Super Admin"'
const PROVINCE_RULE = '@request.auth.id != "" && @request.auth.role = "Province"'
const SUPER_ADMIN_OR_PROVINCE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE})`
const MUNICIPALITY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Municipality" && project.municipality = @request.auth.municipality'
const BARANGAY_RELATION_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Barangay" && project.municipality = @request.auth.municipality && project.barangay = @request.auth.barangay'
const LOCAL_PROGRESS_MUTATE_RULE = `(${MUNICIPALITY_RELATION_SCOPE_RULE}) || (${BARANGAY_RELATION_SCOPE_RULE})`

function findCollectionIfExists(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function repairProjectMutationRules(app) {
  const projects = findCollectionIfExists(app, "projects")
  if (!projects) return

  projects.updateRule = SUPER_ADMIN_OR_PROVINCE_RULE
  projects.deleteRule = SUPER_ADMIN_OR_PROVINCE_RULE
  app.save(projects)
}

function repairProgressUpdateRules(app) {
  const progressUpdates = findCollectionIfExists(app, "progress_updates")
  if (!progressUpdates) return

  progressUpdates.createRule = LOCAL_PROGRESS_MUTATE_RULE
  progressUpdates.updateRule = LOCAL_PROGRESS_MUTATE_RULE
  progressUpdates.deleteRule = LOCAL_PROGRESS_MUTATE_RULE
  app.save(progressUpdates)
}

migrate(
  (app) => {
    repairProjectMutationRules(app)
    repairProgressUpdateRules(app)
  },
  () => {
    // Repair-only migration: keep local progress rights and project mutation limits on down.
  }
)
