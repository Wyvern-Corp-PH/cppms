const migrate = globalThis.migrate

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function findRecords(app, collectionName, filter, params = {}) {
  if (!findCollection(app, collectionName)) return []
  try {
    return app.findRecordsByFilter(collectionName, filter, "", 1000, 0, params)
  } catch {
    return []
  }
}

function renameOption(app, collectionName, fromName, toName, mainAccount) {
  const filter = mainAccount
    ? "name = {:fromName} && main_account = {:mainAccount}"
    : "name = {:fromName}"
  for (const record of findRecords(app, collectionName, filter, {
    fromName,
    mainAccount,
  })) {
    record.set("name", toName)
    app.save(record)
  }
}

function repairBudgetExpenses(app) {
  for (const record of findRecords(app, "budget_expenses", "main_account = 'Other'")) {
    record.set("main_account", "Others")
    app.save(record)
  }
  for (const record of findRecords(
    app,
    "budget_expenses",
    "main_account = 'General Fund' && sub_account = 'GT - Proper'"
  )) {
    record.set("sub_account", "GF - Proper")
    app.save(record)
  }
}

migrate(
  (app) => {
    renameOption(app, "budget_fund_sources", "Other", "Others")
    renameOption(app, "budget_fund_main_accounts", "Other", "Others")
    renameOption(app, "budget_fund_sub_accounts", "GT - Proper", "GF - Proper", "General Fund")
    repairBudgetExpenses(app)
  },
  () => {
    renameOption(app, "budget_fund_sources", "Others", "Other")
    renameOption(app, "budget_fund_main_accounts", "Others", "Other")
    renameOption(app, "budget_fund_sub_accounts", "GF - Proper", "GT - Proper", "General Fund")
  }
)
