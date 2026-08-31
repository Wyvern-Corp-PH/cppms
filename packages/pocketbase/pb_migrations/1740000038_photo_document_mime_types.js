/// <reference path="../pb_data/types.d.ts" />

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

const PHOTO_FIELDS = [
  { collection: "projects", name: "project_photos" },
  { collection: "progress_updates", name: "site_photo" },
]

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function setPhotoDocumentMimeTypes(app) {
  for (const target of PHOTO_FIELDS) {
    const collection = findCollection(app, target.collection)
    if (!collection) continue
    try {
      const field = collection.fields.getByName(target.name)
      field.mimeTypes = DOCUMENT_MIME_TYPES
      app.save(collection)
    } catch {
      // Field missing on this volume; skip.
    }
  }
}

migrate(
  (app) => {
    setPhotoDocumentMimeTypes(app)
  },
  () => {
    // Keep document MIME list on down. Stored WEBP files remain readable.
  }
)
