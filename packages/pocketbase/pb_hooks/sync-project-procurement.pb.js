globalThis.onRecordCreate((event) => {
  require(`${globalThis.__hooks}/sync-project-procurement.js`).syncProjectProcurementFromAllocation(
    event.app,
    event.record
  )
  if (typeof event.next === "function") event.next()
}, "budget_allocations")

globalThis.onRecordAfterCreateSuccess((event) => {
  require(`${globalThis.__hooks}/sync-project-procurement.js`).syncProjectProcurementFromAllocation(
    event.app,
    event.record
  )
}, "budget_allocations")
