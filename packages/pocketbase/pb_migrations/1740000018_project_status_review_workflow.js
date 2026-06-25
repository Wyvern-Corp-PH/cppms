const Record = globalThis.Record
const migrate = globalThis.migrate

const PROJECT_STATUS_VALUES = [
  "Planning",
  "Procurement",
  "Ongoing",
  "Ready for Review",
  "For Revision",
  "Completed",
  "Rejected",
]

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function findRecords(app, collectionName, filter, params = {}) {
  if (!findCollection(app, collectionName)) return []
  try {
    return app.findRecordsByFilter(collectionName, filter, "", 1000, 0, params)
  } catch {
    return []
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

function repairProjectStatusSelect(app) {
  const projects = findCollection(app, "projects")
  if (!projects) return

  if (setSelectValues(projects, "status", PROJECT_STATUS_VALUES)) {
    app.save(projects)
  }
}

function optionExists(app, name) {
  return findRecords(app, "project_status_options", "name = {:name}", {
    name,
  }).length > 0
}

function nextSortOrder(app) {
  const rows = findRecords(app, "project_status_options", "id != ''")
  return rows.reduce((max, record) => {
    const value = Number(record.get("sort_order") || 0)
    return value > max ? value : max
  }, 0) + 1
}

function ensureStatusOptions(app) {
  const collection = findCollection(app, "project_status_options")
  if (!collection) return

  let sortOrder = nextSortOrder(app)
  for (const name of PROJECT_STATUS_VALUES) {
    if (optionExists(app, name)) continue

    const record = new Record(collection)
    record.set("name", name)
    record.set("active", true)
    record.set("sort_order", sortOrder)
    app.save(record)
    sortOrder += 1
  }
}

function renameApprovedProjects(app) {
  for (const record of findRecords(app, "projects", "status = 'Approved'")) {
    record.set("status", "Completed")
    app.save(record)
  }
}

migrate(
  (app) => {
    repairProjectStatusSelect(app)
    ensureStatusOptions(app)
    renameApprovedProjects(app)
  },
  () => {
    // Repair-only migration: keep standardized review statuses on down.
  }
)
