migrate((app) => {
  const collection = app.findCollectionByNameOrId("progress_updates")
  const field = collection.fields.getByName("from_pct")
  field.required = false

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("progress_updates")
  const field = collection.fields.getByName("from_pct")
  field.required = true

  return app.save(collection)
})
