/// <reference path="../pb_data/types.d.ts" />

const migrate = globalThis.migrate

const SUPER_ADMIN_RULE =
  '@request.auth.id != "" && @request.auth.role = "Super Admin"'
const AUTH_RULE = '@request.auth.id != ""'

function findCollectionIfExists(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function applyUsersViewRule(app, viewRule) {
  const users = findCollectionIfExists(app, "users")
  if (!users) return

  users.listRule = SUPER_ADMIN_RULE
  users.viewRule = viewRule
  app.save(users)
}

migrate(
  (app) => {
    applyUsersViewRule(app, AUTH_RULE)
  },
  (app) => {
    applyUsersViewRule(app, SUPER_ADMIN_RULE)
  }
)
