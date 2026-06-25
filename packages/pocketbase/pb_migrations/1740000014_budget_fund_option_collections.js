const BoolField = globalThis.BoolField
const Collection = globalThis.Collection
const NumberField = globalThis.NumberField
const TextField = globalThis.TextField
const migrate = globalThis.migrate
const Record = globalThis.Record

const FUND_TYPE_VALUES = [
  "General Fund",
  "Special Education Fund",
  "Special Health Fund",
  "Trust Fund",
  "Other",
]

const SUB_ACCOUNT_VALUES = [
  { mainAccount: "General Fund", name: "GT - Proper" },
  { mainAccount: "General Fund", name: "20% DF" },
  { mainAccount: "General Fund", name: "Hospital Serv." },
  { mainAccount: "General Fund", name: "Econ. Enterp." },
  { mainAccount: "General Fund", name: "Bayanihan Fund" },
  { mainAccount: "General Fund", name: "SA - Excise Tax" },
  { mainAccount: "Trust Fund", name: "Trust Fund - Proper" },
  { mainAccount: "Trust Fund", name: "LDRRMF - SA" },
]

const OPTION_COLLECTIONS = [
  {
    name: "budget_fund_sources",
    options: FUND_TYPE_VALUES,
  },
  {
    name: "budget_funding_years",
    options: ["2026", "2027", "2028"],
  },
  {
    name: "budget_fund_main_accounts",
    options: FUND_TYPE_VALUES,
  },
  {
    name: "budget_fund_sub_accounts",
    options: SUB_ACCOUNT_VALUES,
    subAccounts: true,
  },
]

function collectionExists(app, name) {
  try {
    return Boolean(app.findCollectionByNameOrId(name))
  } catch {
    return false
  }
}

function optionExists(app, collectionName, name, mainAccount) {
  try {
    if (mainAccount) {
      return Boolean(
        app.findFirstRecordByFilter(
          collectionName,
          "name = {:name} && main_account = {:mainAccount}",
          { name, mainAccount }
        )
      )
    }
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
      ...(definition.subAccounts ? [new TextField({ name: "main_account", required: true })] : []),
      new TextField({ name: "name", required: true }),
      new BoolField({ name: "active", required: true }),
      new NumberField({ name: "sort_order" }),
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  })

  app.save(collection)
  return collection
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

function fieldExists(collection, name) {
  try {
    const field = collection.fields.getByName(name)
    return field && field.name === name
  } catch {
    return false
  }
}

function repairBudgetExpenseMainAccount(app) {
  const expenses = app.findCollectionByNameOrId("budget_expenses")
  const records = app.findRecordsByFilter("budget_expenses", "", "", 1000, 0)
  const mainAccountsById = records.map((record) => ({
    id: record.id,
    mainAccount: FUND_TYPE_VALUES.includes(record.get("main_account"))
      ? record.get("main_account")
      : "General Fund",
  }))

  if (fieldExists(expenses, "main_account")) {
    expenses.fields.removeByName("main_account")
  }
  expenses.fields.add(new TextField({ name: "main_account" }))
  app.save(expenses)

  for (const snapshot of mainAccountsById) {
    const record = app.findRecordById("budget_expenses", snapshot.id)
    record.set("main_account", snapshot.mainAccount)
    app.save(record)
  }
}

migrate(
  (app) => {
    for (const definition of OPTION_COLLECTIONS) {
      const collection = createOptionCollection(app, definition)
      seedOptions(app, collection, definition.options)
    }
    repairBudgetExpenseMainAccount(app)
  },
  () => {
    // Keep option collections/data on down; user-managed dropdown values are config data.
  }
)
