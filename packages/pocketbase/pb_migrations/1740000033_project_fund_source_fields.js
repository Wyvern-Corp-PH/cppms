/// <reference path="../pb_data/types.d.ts" />

const NumberField = globalThis.NumberField
const TextField = globalThis.TextField
const migrate = globalThis.migrate

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function fieldExists(collection, name) {
  try {
    return Boolean(collection.fields.getByName(name))
  } catch {
    return false
  }
}

migrate(
  (app) => {
    const projects = findCollection(app, "projects")
    if (!projects) return

    let changed = false
    if (!fieldExists(projects, "funding_year")) {
      projects.fields.add(new NumberField({ name: "funding_year", onlyInt: true }))
      changed = true
    }
    if (!fieldExists(projects, "sub_account")) {
      projects.fields.add(new TextField({ name: "sub_account" }))
      changed = true
    }

    if (changed) {
      app.save(projects)
    }
  },
  (app) => {
    const projects = findCollection(app, "projects")
    if (!projects) return

    let changed = false
    if (fieldExists(projects, "funding_year")) {
      projects.fields.removeByName("funding_year")
      changed = true
    }
    if (fieldExists(projects, "sub_account")) {
      projects.fields.removeByName("sub_account")
      changed = true
    }

    if (changed) {
      app.save(projects)
    }
  }
)
