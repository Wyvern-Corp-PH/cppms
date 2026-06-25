const BoolField = globalThis.BoolField
const Collection = globalThis.Collection
const NumberField = globalThis.NumberField
const TextField = globalThis.TextField
const migrate = globalThis.migrate
const Record = globalThis.Record

const READ_ALL_RULE = '@request.auth.id = "" || @request.auth.id != ""'
const AUTH_RULE = '@request.auth.id != ""'

const OPTION_COLLECTIONS = [
  {
    name: "project_status_options",
    options: ["Planning", "Procurement", "Ongoing", "Completed", "Approved", "Rejected"],
    rule: READ_ALL_RULE,
  },
  {
    name: "project_category_options",
    options: [
      "Infrastructure",
      "Education",
      "Health",
      "Agriculture",
      "Social Services",
      "Scholarship",
    ],
    rule: READ_ALL_RULE,
  },
  {
    name: "user_role_options",
    options: ["Super Admin", "Province", "Municipality", "Barangay"],
    rule: AUTH_RULE,
  },
  {
    name: "user_account_status_options",
    options: ["Active", "Inactive"],
    rule: AUTH_RULE,
  },
]

function collectionExists(app, name) {
  try {
    return Boolean(app.findCollectionByNameOrId(name))
  } catch {
    return false
  }
}

function optionExists(app, collectionName, name) {
  try {
    return Boolean(app.findFirstRecordByFilter(collectionName, "name = {:name}", { name }))
  } catch {
    return false
  }
}

function createOptionCollection(app, definition) {
  if (collectionExists(app, definition.name)) return app.findCollectionByNameOrId(definition.name)

  const collection = new Collection({
    type: "base",
    name: definition.name,
    fields: [
      new TextField({ name: "name", required: true }),
      new BoolField({ name: "active", required: true }),
      new NumberField({ name: "sort_order" }),
    ],
    listRule: definition.rule,
    viewRule: definition.rule,
    createRule: AUTH_RULE,
    updateRule: AUTH_RULE,
    deleteRule: AUTH_RULE,
  })

  app.save(collection)
  return collection
}

function seedOptions(app, collection, values) {
  values.forEach((name, index) => {
    if (optionExists(app, collection.name, name)) return

    const record = new Record(collection)
    record.set("name", name)
    record.set("active", true)
    record.set("sort_order", index + 1)
    app.save(record)
  })
}

migrate(
  (app) => {
    for (const definition of OPTION_COLLECTIONS) {
      const collection = createOptionCollection(app, definition)
      seedOptions(app, collection, definition.options)
    }
  },
  () => {
    // Keep option collections/data on down; user-managed dropdown values are config data.
  }
)
