const Collection = globalThis.Collection
const Record = globalThis.Record
const migrate = globalThis.migrate

const AUTH_RULE = '@request.auth.id != ""'
const PUBLIC_OR_AUTH_RULE = '@request.auth.id = "" || @request.auth.id != ""'

const FUND_TYPE_VALUES = [
  "General Fund",
  "Special Education Fund",
  "Special Health Fund",
  "Trust Fund",
  "Others",
]

const OPTION_COLLECTIONS = [
  {
    name: "budget_fund_sources",
    fields: [
      { type: "text", name: "name", required: true },
      { type: "bool", name: "active", required: true },
      { type: "number", name: "sort_order" },
    ],
    options: FUND_TYPE_VALUES,
    rule: AUTH_RULE,
  },
  {
    name: "budget_funding_years",
    fields: [
      { type: "text", name: "name", required: true },
      { type: "bool", name: "active", required: true },
      { type: "number", name: "sort_order" },
    ],
    options: ["2026", "2027", "2028"],
    rule: AUTH_RULE,
  },
  {
    name: "budget_fund_main_accounts",
    fields: [
      { type: "text", name: "name", required: true },
      { type: "bool", name: "active", required: true },
      { type: "number", name: "sort_order" },
    ],
    options: FUND_TYPE_VALUES,
    rule: AUTH_RULE,
  },
  {
    name: "budget_fund_sub_accounts",
    fields: [
      { type: "text", name: "main_account", required: true },
      { type: "text", name: "name", required: true },
      { type: "bool", name: "active", required: true },
      { type: "number", name: "sort_order" },
    ],
    options: [
      { mainAccount: "General Fund", name: "GF - Proper" },
      { mainAccount: "General Fund", name: "20% DF" },
      { mainAccount: "General Fund", name: "Hospital Serv." },
      { mainAccount: "General Fund", name: "Econ. Enterp." },
      { mainAccount: "General Fund", name: "Bayanihan Fund" },
      { mainAccount: "General Fund", name: "SA - Excise Tax" },
      { mainAccount: "Trust Fund", name: "Trust Fund - Proper" },
      { mainAccount: "Trust Fund", name: "LDRRMF - SA" },
    ],
    rule: AUTH_RULE,
  },
  {
    name: "project_status_options",
    fields: [
      { type: "text", name: "name", required: true },
      { type: "bool", name: "active", required: true },
      { type: "number", name: "sort_order" },
    ],
    options: [
      "Planning",
      "Procurement",
      "Ongoing",
      "Ready for Review",
      "For Revision",
      "Completed",
      "Rejected",
    ],
    rule: PUBLIC_OR_AUTH_RULE,
  },
  {
    name: "project_category_options",
    fields: [
      { type: "text", name: "name", required: true },
      { type: "bool", name: "active", required: true },
      { type: "number", name: "sort_order" },
    ],
    options: [
      "Infrastructure",
      "Education",
      "Health",
      "Agriculture",
      "Social Services",
      "Scholarship",
    ],
    rule: PUBLIC_OR_AUTH_RULE,
  },
  {
    name: "user_role_options",
    fields: [
      { type: "text", name: "name", required: true },
      { type: "bool", name: "active", required: true },
      { type: "number", name: "sort_order" },
    ],
    options: ["Super Admin", "Province", "Municipality", "Barangay"],
    rule: AUTH_RULE,
  },
  {
    name: "user_account_status_options",
    fields: [
      { type: "text", name: "name", required: true },
      { type: "bool", name: "active", required: true },
      { type: "number", name: "sort_order" },
    ],
    options: ["Active", "Inactive"],
    rule: AUTH_RULE,
  },
]

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function ensureCollection(app, definition) {
  const collection =
    findCollection(app, definition.name) ??
    new Collection({ type: "base", name: definition.name })

  const existingNames = collection.fields.fieldNames()
  const missingFields = definition.fields.filter(
    (field) => !existingNames.includes(field.name)
  )
  if (missingFields.length > 0) {
    collection.fields.addMarshaledJSON(JSON.stringify(missingFields))
  }

  collection.listRule = definition.rule
  collection.viewRule = definition.rule
  collection.createRule = AUTH_RULE
  collection.updateRule = AUTH_RULE
  collection.deleteRule = AUTH_RULE
  app.save(collection)
  return collection
}

function findRecords(app, collectionName, filter = "", params = {}) {
  const records = []
  const batchSize = 500
  let offset = 0

  try {
    while (true) {
      const batch = app.findRecordsByFilter(
        collectionName,
        filter,
        "",
        batchSize,
        offset,
        params
      )
      records.push(...batch)
      if (batch.length < batchSize) break
      offset += batchSize
    }
  } catch {
    return records
  }

  return records
}

function optionExists(app, collectionName, name, mainAccount) {
  const filter = mainAccount
    ? "name = {:name} && main_account = {:mainAccount}"
    : "name = {:name}"
  const params = mainAccount ? { name, mainAccount } : { name }
  return findRecords(app, collectionName, filter, params).length > 0
}

function deleteIdOnlyRecords(app, collectionName) {
  for (const record of findRecords(app, collectionName)) {
    if (!record.get("name")) {
      app.delete(record)
    }
  }
}

function seedOptions(app, collection, values) {
  values.forEach((value, index) => {
    const name = typeof value === "string" ? value : value.name
    const mainAccount = typeof value === "string" ? undefined : value.mainAccount
    if (optionExists(app, collection.name, name, mainAccount)) return

    const record = new Record(collection)
    if (mainAccount) record.set("main_account", mainAccount)
    record.set("name", name)
    record.set("active", true)
    record.set("sort_order", index + 1)
    app.save(record)
  })
}

migrate(
  (app) => {
    for (const definition of OPTION_COLLECTIONS) {
      const collection = ensureCollection(app, definition)
      deleteIdOnlyRecords(app, collection.name)
      seedOptions(app, collection, definition.options)
    }
  },
  () => {
    // Keep repaired option fields/data on down; id-only records are unusable drift.
  }
)
