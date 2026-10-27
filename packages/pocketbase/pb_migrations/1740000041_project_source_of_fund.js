/// <reference path="../pb_data/types.d.ts" />

const SelectField = globalThis.SelectField
const TextField = globalThis.TextField
const migrate = globalThis.migrate

const SOURCE_OF_FUND_VALUES = [
  "General Fund",
  "20% LDF (Local Development Fund)",
  "Others",
]

function findProjects(app) {
  try {
    return app.findCollectionByNameOrId("projects")
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
    const projects = findProjects(app)
    if (!projects) return

    let changed = false
    if (!fieldExists(projects, "source_of_fund")) {
      projects.fields.add(
        new SelectField({
          name: "source_of_fund",
          maxSelect: 1,
          values: SOURCE_OF_FUND_VALUES,
        })
      )
      changed = true
    }
    if (!fieldExists(projects, "source_of_fund_other")) {
      projects.fields.add(new TextField({ name: "source_of_fund_other" }))
      changed = true
    }

    if (changed) app.save(projects)
  },
  (app) => {
    const projects = findProjects(app)
    if (!projects) return

    let changed = false
    for (const name of ["source_of_fund_other", "source_of_fund"]) {
      if (!fieldExists(projects, name)) continue
      projects.fields.removeByName(name)
      changed = true
    }

    if (changed) app.save(projects)
  }
)