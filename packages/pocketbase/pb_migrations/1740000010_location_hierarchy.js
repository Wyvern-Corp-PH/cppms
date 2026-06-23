const SelectField = globalThis.SelectField
const TextField = globalThis.TextField
const migrate = globalThis.migrate

function fieldExists(collection, name) {
  try {
    const field = collection.fields.getByName(name)
    return field && field.name === name
  } catch {
    return false
  }
}

function ensureLocationHierarchyFields(app, locations) {
  let changed = false

  if (!fieldExists(locations, "level")) {
    locations.fields.add(
      new SelectField({
        name: "level",
        maxSelect: 1,
        values: ["Municipality", "Barangay"],
      })
    )
    changed = true
  }

  for (const name of ["municipality_name", "municipality_slug", "barangay_name"]) {
    if (!fieldExists(locations, name)) {
      locations.fields.add(new TextField({ name }))
      changed = true
    }
  }

  if (changed) {
    app.save(locations)
  }
}

function backfillExistingMunicipalityRows(app, locations) {
  const records = app.findRecordsByFilter(locations.id, "", "", 1000, 0)

  for (const record of records) {
    if (record.get("level")) {
      continue
    }

    record.set("level", "Municipality")
    record.set("municipality_name", record.get("name") || "")
    record.set("municipality_slug", record.get("slug") || "")
    record.set("barangay_name", "")
    app.save(record)
  }
}

migrate(
  (app) => {
    const locations = app.findCollectionByNameOrId("locations")
    ensureLocationHierarchyFields(app, locations)
    backfillExistingMunicipalityRows(app, locations)
  },
  (app) => {
    const locations = app.findCollectionByNameOrId("locations")
    for (const name of [
      "barangay_name",
      "municipality_slug",
      "municipality_name",
      "level",
    ]) {
      if (fieldExists(locations, name)) {
        locations.fields.removeByName(name)
      }
    }
    app.save(locations)
  }
)
