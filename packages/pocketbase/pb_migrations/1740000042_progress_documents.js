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

const progressDocumentFields = [
  { name: "completion_site_photo", maxSelect: 10 },
  { name: "certificate_of_liquidation", maxSelect: 10 },
]

function fieldExists(collection, name) {
  try {
    return Boolean(collection.fields.getByName(name))
  } catch {
    return false
  }
}

migrate(
  (app) => {
    const progressUpdates = app.findCollectionByNameOrId("progress_updates")
    for (const field of progressDocumentFields) {
      if (fieldExists(progressUpdates, field.name)) continue
      progressUpdates.fields.add(
        new FileField({
          name: field.name,
          maxSelect: field.maxSelect,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        })
      )
    }

    return app.save(progressUpdates)
  },
  (app) => {
    const progressUpdates = app.findCollectionByNameOrId("progress_updates")
    for (const field of progressDocumentFields) {
      if (!fieldExists(progressUpdates, field.name)) continue
      progressUpdates.fields.removeById(
        progressUpdates.fields.getByName(field.name).id
      )
    }

    return app.save(progressUpdates)
  }
)