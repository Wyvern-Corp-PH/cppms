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

function splitProjectLocation(location) {
  const parts = String(location || "").split(" / ")
  return {
    municipality: parts[0] || "",
    barangay: parts.slice(1).join(" / "),
  }
}

migrate(
  (app) => {
    const projects = app.findCollectionByNameOrId("projects")
    let changed = false

    for (const name of ["municipality", "barangay"]) {
      if (!fieldExists(projects, name)) {
        projects.fields.add(new TextField({ name }))
        changed = true
      }
    }

    if (changed) {
      app.save(projects)
    }

    const records = app.findRecordsByFilter(projects.id, "", "", 1000, 0)
    for (const record of records) {
      if (record.get("municipality") || record.get("barangay")) {
        continue
      }

      const split = splitProjectLocation(record.get("location"))
      record.set("municipality", split.municipality)
      record.set("barangay", split.barangay)
      app.save(record)
    }
  },
  (app) => {
    const projects = app.findCollectionByNameOrId("projects")
    let changed = false

    for (const name of ["barangay", "municipality"]) {
      if (fieldExists(projects, name)) {
        projects.fields.removeByName(name)
        changed = true
      }
    }

    if (changed) {
      app.save(projects)
    }
  }
)
