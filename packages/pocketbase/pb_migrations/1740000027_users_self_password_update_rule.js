const migrate = globalThis.migrate

const SUPER_ADMIN_RULE =
  '@request.auth.id != "" && @request.auth.role = "Super Admin"'
const USER_SELF_PASSWORD_UPDATE_RULE =
  '@request.auth.id != "" && @request.auth.id = id && @request.body.oldPassword:isset = true'

function findCollectionIfExists(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function applyUsersSelfPasswordUpdateRule(app) {
  const users = findCollectionIfExists(app, "users")
  if (!users) return

  users.updateRule = `(${SUPER_ADMIN_RULE}) || (${USER_SELF_PASSWORD_UPDATE_RULE})`
  app.save(users)
}

migrate(
  (app) => {
    applyUsersSelfPasswordUpdateRule(app)
  },
  (app) => {
    applyUsersSelfPasswordUpdateRule(app)
  }
)
