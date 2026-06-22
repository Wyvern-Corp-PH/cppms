const migrate = globalThis.migrate

function syncConfiguredAdmin(app) {
  const adminEmail = globalThis.$os?.getenv?.("POCKETBASE_ADMIN_EMAIL") || ""
  const adminPassword = globalThis.$os?.getenv?.("POCKETBASE_ADMIN_PASSWORD") || ""
  if (!adminEmail || !adminPassword) {
    return
  }

  let admin
  try {
    admin = app.findAuthRecordByEmail("users", adminEmail)
  } catch {
    return
  }

  admin.set("role", "Super Admin")
  admin.set("account_status", "Active")
  if (!admin.get("name")) {
    admin.set("name", "CPPMS Dev Admin")
  }
  admin.setPassword(adminPassword)
  app.save(admin)
}

migrate(
  (app) => {
    syncConfiguredAdmin(app)
  },
  () => {
    // Data repair migration: keep configured admin credentials on down.
  }
)
