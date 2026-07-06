const BoolField = globalThis.BoolField
const migrate = globalThis.migrate

const SUPER_ADMIN_RULE =
  '@request.auth.id != "" && @request.auth.role = "Super Admin"'

function fieldExists(collection, name) {
  try {
    const field = collection.fields.getByName(name)
    return field && field.name === name
  } catch {
    return false
  }
}

function applyUsersPasswordResetFields(app) {
  const users = app.findCollectionByNameOrId("users")
  if (!fieldExists(users, "must_change_password")) {
    users.fields.add(new BoolField({ name: "must_change_password" }))
  }
  users.manageRule = SUPER_ADMIN_RULE
  app.save(users)
}

migrate(
  (app) => {
    applyUsersPasswordResetFields(app)
  },
  (app) => {
    applyUsersPasswordResetFields(app)
  }
)
