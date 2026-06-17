/// <reference path="../pb_data/types.d.ts" />

const documentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]

const completionFileFields = [
  { name: "certification_completion", maxSelect: 1 },
  { name: "certificate_acceptance", maxSelect: 1 },
  { name: "proof_payment_barangay", maxSelect: 1 },
  { name: "acknowledgment_completion", maxSelect: 1 },
  { name: "audit_documents", maxSelect: 10 },
  { name: "verification_documents", maxSelect: 10 },
  { name: "liquidation_documents", maxSelect: 10 },
]

function fieldExists(collection, name) {
  try {
    collection.fields.getByName(name)
    return true
  } catch {
    return false
  }
}

migrate(
  (app) => {
    const projects = app.findCollectionByNameOrId("projects")
    if (!fieldExists(projects, "number_of_students")) {
      projects.fields.add(
        new NumberField({
          name: "number_of_students",
          min: 1,
          onlyInt: true,
        })
      )
    }
    app.save(projects)

    const progressUpdates = app.findCollectionByNameOrId("progress_updates")
    for (const field of completionFileFields) {
      if (!fieldExists(progressUpdates, field.name)) {
        progressUpdates.fields.add(
          new FileField({
            name: field.name,
            maxSelect: field.maxSelect,
            maxSize: 10485760,
            mimeTypes: documentMimeTypes,
          })
        )
      }
    }

    return app.save(progressUpdates)
  },
  (app) => {
    const progressUpdates = app.findCollectionByNameOrId("progress_updates")
    for (const field of completionFileFields) {
      if (fieldExists(progressUpdates, field.name)) {
        progressUpdates.fields.removeById(
          progressUpdates.fields.getByName(field.name).id
        )
      }
    }
    app.save(progressUpdates)

    const projects = app.findCollectionByNameOrId("projects")
    if (fieldExists(projects, "number_of_students")) {
      projects.fields.removeById(
        projects.fields.getByName("number_of_students").id
      )
    }
    return app.save(projects)
  }
)
