/// <reference path="../pb_data/types.d.ts" />

const DateField = globalThis.DateField
const FileField = globalThis.FileField
const NumberField = globalThis.NumberField
const Record = globalThis.Record
const SelectField = globalThis.SelectField
const TextField = globalThis.TextField
const migrate = globalThis.migrate

const SUPER_ADMIN_RULE = '@request.auth.id != "" && @request.auth.role = "Super Admin"'
const PROVINCE_RULE = '@request.auth.id != "" && @request.auth.role = "Province"'
const PPDO_RULE = '@request.auth.id != "" && @request.auth.role = "PPDO"'
const MUNICIPALITY_PROJECT_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Municipality" && municipality = @request.auth.municipality'
const BARANGAY_PROJECT_SCOPE_RULE =
  '@request.auth.id != "" && @request.auth.role = "Barangay" && municipality = @request.auth.municipality && barangay = @request.auth.barangay'
const PROJECT_CREATE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE}) || (${PPDO_RULE})`
const PROJECT_SCOPE_RULE = `(${PROJECT_CREATE_RULE}) || (${MUNICIPALITY_PROJECT_SCOPE_RULE}) || (${BARANGAY_PROJECT_SCOPE_RULE})`
const PROJECT_LIST_VIEW_RULE = `@request.auth.id = "" || (${PROJECT_SCOPE_RULE})`
const PROJECT_UPDATE_RULE = PROJECT_SCOPE_RULE
const PROJECT_DELETE_RULE = `(${SUPER_ADMIN_RULE}) || (${PROVINCE_RULE})`

const ROLE_VALUES = ["Super Admin", "Province", "PPDO", "Municipality", "Barangay"]
const FUND_TYPE_VALUES = [
  "General Fund",
  "Special Education Fund",
  "Special Health Fund",
  "Trust Fund",
  "Others",
]
const LGU_PHASE_STATUS_VALUES = ["Not Started", "Ongoing", "Completed"]
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

function findCollectionIfExists(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function fieldExists(collection, name) {
  try {
    const field = collection.fields.getByName(name)
    return field && field.name === name
  } catch {
    return false
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

function optionExists(app, collectionName, name) {
  try {
    return Boolean(
      app.findFirstRecordByFilter(collectionName, "name = {:name}", { name })
    )
  } catch {
    return false
  }
}

function ensureRoleSelectValues(app) {
  const users = findCollectionIfExists(app, "users")
  if (users && setSelectValues(users, "role", ROLE_VALUES)) {
    app.save(users)
  }

  const activityLogs = findCollectionIfExists(app, "activity_logs")
  if (activityLogs && setSelectValues(activityLogs, "actor_role", ROLE_VALUES)) {
    app.save(activityLogs)
  }

  const roleOptions = findCollectionIfExists(app, "user_role_options")
  if (!roleOptions) return
  if (optionExists(app, "user_role_options", "PPDO")) return

  const record = new Record(roleOptions)
  record.set("name", "PPDO")
  record.set("active", true)
  record.set("sort_order", ROLE_VALUES.indexOf("PPDO") + 1)
  app.save(record)
}

function ensureProjectOwnershipFields(app) {
  const projects = findCollectionIfExists(app, "projects")
  if (!projects) return

  if (!fieldExists(projects, "fund_source")) {
    projects.fields.add(
      new SelectField({
        name: "fund_source",
        maxSelect: 1,
        values: FUND_TYPE_VALUES,
      })
    )
  }
  if (!fieldExists(projects, "period_of_implementation")) {
    projects.fields.add(new TextField({ name: "period_of_implementation" }))
  }
  if (!fieldExists(projects, "moa_details")) {
    projects.fields.add(new TextField({ name: "moa_details" }))
  }
  if (!fieldExists(projects, "planning_status")) {
    projects.fields.add(
      new SelectField({
        name: "planning_status",
        maxSelect: 1,
        values: LGU_PHASE_STATUS_VALUES,
      })
    )
  }
  if (!fieldExists(projects, "procurement_status")) {
    projects.fields.add(
      new SelectField({
        name: "procurement_status",
        maxSelect: 1,
        values: LGU_PHASE_STATUS_VALUES,
      })
    )
  }
  if (!fieldExists(projects, "bid_price")) {
    projects.fields.add(new NumberField({ name: "bid_price", min: 0 }))
  }
  if (!fieldExists(projects, "project_photos")) {
    projects.fields.add(
      new FileField({
        name: "project_photos",
        maxSelect: 10,
        maxSize: 10485760,
        mimeTypes: IMAGE_MIME_TYPES,
      })
    )
  }
  if (!fieldExists(projects, "lgu_encoded_at")) {
    // Internal Status-handoff marker. field.hidden would also strip it from
    // PPDO/LGU API clients (superuser-only), and this repo has no guest-only
    // field filter. Catalog columns (bid_price, contractor, moa_details) stay
    // on public getOne — do not invent a second public collection.
    projects.fields.add(new DateField({ name: "lgu_encoded_at" }))
  }

  projects.listRule = PROJECT_LIST_VIEW_RULE
  projects.viewRule = PROJECT_LIST_VIEW_RULE
  projects.createRule = PROJECT_CREATE_RULE
  projects.updateRule = PROJECT_UPDATE_RULE
  projects.deleteRule = PROJECT_DELETE_RULE
  app.save(projects)
}

migrate(
  (app) => {
    ensureRoleSelectValues(app)
    ensureProjectOwnershipFields(app)
  },
  () => {
    // Keep PPDO role values, project fields, and widened update rules on down.
  }
)
