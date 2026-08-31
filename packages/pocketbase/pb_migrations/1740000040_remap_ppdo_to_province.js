/// <reference path="../pb_data/types.d.ts" />

const migrate = globalThis.migrate

const SUPER_ADMIN_RULE =
  '@request.auth.id != "" && @request.auth.role = "Super Admin"'
const PROVINCE_RULE = '@request.auth.id != "" && @request.auth.role = "Province"'
const MUNICIPALITY_PROJECT_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Municipality" && municipality = @request.auth.municipality'
const BARANGAY_PROJECT_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Barangay" && municipality = @request.auth.municipality && barangay = @request.auth.barangay'
const PROJECT_CREATE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE})`
const PROJECT_SCOPE_RULE = `(${PROJECT_CREATE_RULE}) || (${MUNICIPALITY_PROJECT_SCOPE_RULE}) || (${BARANGAY_PROJECT_SCOPE_RULE})`
const PROJECT_LIST_VIEW_RULE = `@request.auth.id = "" || (${PROJECT_SCOPE_RULE})`

const ROLE_VALUES = ["Super Admin", "Province", "Municipality", "Barangay"]

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

function remapRetiredUserRole(role) {
  return role === "PPDO" ? "Province" : role
}

function remapPpdoUsers(app) {
  const users = findCollectionIfExists(app, "users")
  if (!users) return

  const records = app.findRecordsByFilter("users", 'role = "PPDO"', "", 500, 0)
  for (const record of records) {
    record.set("role", remapRetiredUserRole(record.get("role")))
    app.save(record)
  }
}

function dropPpdoFromUserRoleSelect(app) {
  const users = findCollectionIfExists(app, "users")
  if (users && setSelectValues(users, "role", ROLE_VALUES)) {
    app.save(users)
  }
}

function deletePpdoRoleOption(app) {
  const roleOptions = findCollectionIfExists(app, "user_role_options")
  if (!roleOptions) return
  try {
    const record = app.findFirstRecordByFilter(
      "user_role_options",
      "name = {:name}",
      { name: "PPDO" }
    )
    if (record) app.delete(record)
  } catch {
    // Option already gone.
  }
}

function dropPpdoFromProjectRules(app) {
  const projects = findCollectionIfExists(app, "projects")
  if (!projects) return
  projects.createRule = PROJECT_CREATE_RULE
  projects.listRule = PROJECT_LIST_VIEW_RULE
  projects.viewRule = PROJECT_LIST_VIEW_RULE
  projects.updateRule = PROJECT_SCOPE_RULE
  app.save(projects)
}

migrate(
  (app) => {
    remapPpdoUsers(app)
    dropPpdoFromUserRoleSelect(app)
    deletePpdoRoleOption(app)
    dropPpdoFromProjectRules(app)
  },
  () => {
    // Remap is not reversed. Historical activity_logs.actor_role may still say PPDO.
  }
)
