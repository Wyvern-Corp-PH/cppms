const audit = require(`${globalThis.__hooks}/audit.js`)

for (const collection of audit.AUDITED_COLLECTIONS) {
  globalThis.onRecordCreate((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditBefore(event)
  }, collection)
  globalThis.onRecordUpdate((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditBefore(event)
  }, collection)
  globalThis.onRecordDelete((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditBefore(event)
  }, collection)

  globalThis.onRecordCreateRequest((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditRequest(event, "create")
  }, collection)
  globalThis.onRecordUpdateRequest((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditRequest(event, "update")
  }, collection)
  globalThis.onRecordDeleteRequest((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditRequest(event, "delete")
  }, collection)

  globalThis.onRecordAfterCreateSuccess((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditSuccess(event, "create")
  }, collection)
  globalThis.onRecordAfterUpdateSuccess((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditSuccess(event, "update")
  }, collection)
  globalThis.onRecordAfterDeleteSuccess((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditSuccess(event, "delete")
  }, collection)

  globalThis.onRecordAfterCreateError((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditError(event, "create")
  }, collection)
  globalThis.onRecordAfterUpdateError((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditError(event, "update")
  }, collection)
  globalThis.onRecordAfterDeleteError((event) => {
    require(`${globalThis.__hooks}/audit.js`).auditError(event, "delete")
  }, collection)
}
