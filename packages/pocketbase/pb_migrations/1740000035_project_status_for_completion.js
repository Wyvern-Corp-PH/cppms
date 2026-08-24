const Record = globalThis.Record
const migrate = globalThis.migrate

const PROJECT_STATUS_VALUES = [
  "Planning",
  "Procurement",
  "Ongoing",
  "For Completion",
  "For Approval",
  "Completed",
  "For Revision",
  "Rejected",
  "Cancelled",
]

const READY_FOR_REVIEW = "Ready for Review"
const FOR_COMPLETION = "For Completion"
const PAGE_SIZE = 500

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function findRecords(app, collectionName, filter, params = {}) {
  if (!findCollection(app, collectionName)) return []

  const records = []
  let offset = 0
  while (true) {
    const batch = app.findRecordsByFilter(
      collectionName,
      filter,
      "",
      PAGE_SIZE,
      offset,
      params
    )
    records.push(...batch)
    if (batch.length < PAGE_SIZE) break
    offset += batch.length
  }
  return records
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

function expandThenRewriteStatus(app) {
  const projects = findCollection(app, "projects")
  if (!projects) return

  const field = projects.fields.getByName("status")
  const current = field?.values || []
  const expanded = [
    ...new Set([...current, ...PROJECT_STATUS_VALUES, READY_FOR_REVIEW]),
  ]
  if (setSelectValues(projects, "status", expanded)) {
    app.save(projects)
  }

  for (const record of findRecords(app, "projects", "status = {:status}", {
    status: READY_FOR_REVIEW,
  })) {
    record.set("status", FOR_COMPLETION)
    app.save(record)
  }

  if (setSelectValues(projects, "status", PROJECT_STATUS_VALUES)) {
    app.save(projects)
  }
}

function optionRows(app, name) {
  return findRecords(app, "project_status_options", "name = {:name}", { name })
}

function nextSortOrder(app) {
  const rows = findRecords(app, "project_status_options", "id != ''")
  return (
    rows.reduce((max, record) => {
      const value = Number(record.get("sort_order") || 0)
      return value > max ? value : max
    }, 0) + 1
  )
}

function upsertStatusOptions(app) {
  const collection = findCollection(app, "project_status_options")
  if (!collection) return

  let sortOrder = nextSortOrder(app)
  for (const name of [FOR_COMPLETION, "For Approval", "Cancelled"]) {
    if (optionRows(app, name).length > 0) continue
    const record = new Record(collection)
    record.set("name", name)
    record.set("active", true)
    record.set("sort_order", sortOrder)
    app.save(record)
    sortOrder += 1
  }

  const leftover = optionRows(app, READY_FOR_REVIEW)
  const completionExists = optionRows(app, FOR_COMPLETION).length > 0
  for (const record of leftover) {
    if (completionExists) {
      app.delete(record)
      continue
    }
    record.set("name", FOR_COMPLETION)
    app.save(record)
  }
}

migrate(
  (app) => {
    expandThenRewriteStatus(app)
    upsertStatusOptions(app)
  },
  () => {
    // Expand-contract: keep new statuses on down.
  }
)
