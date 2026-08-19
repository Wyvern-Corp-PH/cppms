const migrate = globalThis.migrate
const TextField = globalThis.TextField
const SelectField = globalThis.SelectField

// tradeoff: same-wave drop of planning_status/procurement_status/moa_details —
// rolling deploys can break old writers still sending these columns. Ceiling:
// stop old app writers (or deploy app that no longer writes them) before running
// this migration. Upgrade path: expand-contract (nullable keep → dual-write stop
// → drop) if zero-downtime rolling is required.

const DROPPED_PROJECT_FIELDS = [
  "planning_status",
  "procurement_status",
  "moa_details",
]

const LGU_PHASE_STATUS = ["Not Started", "Ongoing", "Completed"]

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
    for (const field of DROPPED_PROJECT_FIELDS) {
      if (fieldExists(projects, field)) {
        projects.fields.removeByName(field)
        changed = true
      }
    }

    if (changed) {
      app.save(projects)
    }
  },
  (app) => {
    // Expand-contract rollback: restore dropped columns without data backfill.
    const projects = findCollection(app, "projects")
    if (!projects) return

    let changed = false
    if (!fieldExists(projects, "moa_details")) {
      projects.fields.add(new TextField({ name: "moa_details" }))
      changed = true
    }
    if (!fieldExists(projects, "planning_status")) {
      projects.fields.add(
        new SelectField({
          name: "planning_status",
          values: [...LGU_PHASE_STATUS],
          maxSelect: 1,
        })
      )
      changed = true
    }
    if (!fieldExists(projects, "procurement_status")) {
      projects.fields.add(
        new SelectField({
          name: "procurement_status",
          values: [...LGU_PHASE_STATUS],
          maxSelect: 1,
        })
      )
      changed = true
    }

    if (changed) {
      app.save(projects)
    }
  }
)
