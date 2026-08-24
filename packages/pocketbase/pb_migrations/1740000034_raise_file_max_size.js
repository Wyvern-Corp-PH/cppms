/// <reference path="../pb_data/types.d.ts" />

const migrate = globalThis.migrate

// site_photo is the known 5MB field; raise every file field still below 10MB.
const MIN_MAX_SIZE = 10485760
const COLLECTIONS = ["progress_updates", "projects"]

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function raiseFileMaxSize(collection) {
  let changed = false
  for (const name of collection.fields.fieldNames()) {
    const field = collection.fields.getByName(name)
    if (field.type && field.type !== "file") continue
    if (typeof field.maxSize === "number" && field.maxSize < MIN_MAX_SIZE) {
      field.maxSize = MIN_MAX_SIZE
      changed = true
    }
  }
  return changed
}

migrate(
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = findCollection(app, name)
      if (!collection) continue
      if (raiseFileMaxSize(collection)) {
        app.save(collection)
      }
    }
  },
  () => {
    // Keep raised maxSize on down; applied volumes already accept 10MB files.
  }
)
