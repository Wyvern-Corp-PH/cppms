const migrate = globalThis.migrate

const AUTH_RULE = '@request.auth.id != ""'
const BUDGET_FUND_OPTION_COLLECTIONS = [
  "budget_fund_sources",
  "budget_funding_years",
  "budget_fund_main_accounts",
  "budget_fund_sub_accounts",
]

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function repairRules(app, name) {
  const collection = findCollection(app, name)
  if (!collection) return

  collection.listRule = AUTH_RULE
  collection.viewRule = AUTH_RULE
  collection.createRule = AUTH_RULE
  collection.updateRule = AUTH_RULE
  collection.deleteRule = AUTH_RULE
  app.save(collection)
}

migrate(
  (app) => {
    for (const name of BUDGET_FUND_OPTION_COLLECTIONS) {
      repairRules(app, name)
    }
  },
  () => {
    // Keep repaired option collection rules on down; applied history may vary by environment.
  }
)
