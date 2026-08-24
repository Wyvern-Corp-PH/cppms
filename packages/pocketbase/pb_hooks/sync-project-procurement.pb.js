globalThis.onRecordAfterCreateSuccess((event) => {
  require(`${globalThis.__hooks}/sync-project-procurement.js`).syncProjectProcurementFromAllocation(
    event.app,
    event.record
  )
}, "budget_allocations")
