const migrate = globalThis.migrate

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]

const COMPLETION_DOCUMENT_FIELDS = [
  { name: "certification_completion", maxSelect: 1 },
  { name: "certificate_acceptance", maxSelect: 1 },
  { name: "proof_payment_barangay", maxSelect: 1 },
  { name: "acknowledgment_completion", maxSelect: 1 },
  { name: "audit_documents", maxSelect: 10 },
  { name: "verification_documents", maxSelect: 10 },
  { name: "liquidation_documents", maxSelect: 10 },
]

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function fieldNames(collection) {
  return collection.fields.fieldNames()
}

function renameLegacyField(collection, from, to) {
  const names = fieldNames(collection)
  if (names.includes(to)) {
    if (names.includes(from)) collection.fields.removeByName(from)
    return
  }
  if (!names.includes(from)) return

  const field = collection.fields.getByName(from)
  field.name = to
}

function ensureFields(collection, fields) {
  const names = fieldNames(collection)
  const missing = fields.filter((field) => !names.includes(field.name))
  if (missing.length > 0) {
    collection.fields.addMarshaledJSON(JSON.stringify(missing))
  }
}

function repairProjects(app) {
  const projects = findCollection(app, "projects")
  if (!projects) return

  renameLegacyField(projects, "agreement_file", "resolution_file")
  ensureFields(projects, [
    {
      type: "number",
      name: "number_of_students",
      min: 1,
      onlyInt: true,
    },
    {
      type: "file",
      name: "resolution_file",
      maxSelect: 1,
      maxSize: 10485760,
      mimeTypes: DOCUMENT_MIME_TYPES,
    },
  ])
  app.save(projects)
}

function repairBudgetAllocations(app) {
  const allocations = findCollection(app, "budget_allocations")
  if (!allocations) return

  renameLegacyField(allocations, "agreement_file", "resolution_file")
  ensureFields(allocations, [
    {
      type: "file",
      name: "resolution_file",
      maxSelect: 1,
      maxSize: 10485760,
      mimeTypes: DOCUMENT_MIME_TYPES,
    },
  ])
  app.save(allocations)
}

function repairProgressUpdates(app) {
  const progressUpdates = findCollection(app, "progress_updates")
  if (!progressUpdates) return

  ensureFields(
    progressUpdates,
    COMPLETION_DOCUMENT_FIELDS.map((field) => ({
      type: "file",
      name: field.name,
      maxSelect: field.maxSelect,
      maxSize: 10485760,
      mimeTypes: DOCUMENT_MIME_TYPES,
    }))
  )
  app.save(progressUpdates)
}

migrate(
  (app) => {
    repairProjects(app)
    repairBudgetAllocations(app)
    repairProgressUpdates(app)
  },
  () => {
    // Keep repaired field shapes on down; these match the current manifest.
  }
)
