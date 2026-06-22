/// <reference path="../pb_data/types.d.ts" />

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
    const progressUpdates = app.findCollectionByNameOrId("progress_updates")
    if (fieldExists(progressUpdates, "site_photo")) {
      const field = progressUpdates.fields.getByName("site_photo")
      field.maxSelect = 10
    }
    return app.save(progressUpdates)
  },
  (app) => {
    const progressUpdates = app.findCollectionByNameOrId("progress_updates")
    if (fieldExists(progressUpdates, "site_photo")) {
      const field = progressUpdates.fields.getByName("site_photo")
      field.maxSelect = 1
    }
    return app.save(progressUpdates)
  }
)
