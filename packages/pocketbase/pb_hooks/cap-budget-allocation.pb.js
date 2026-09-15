globalThis.onRecordCreateRequest((event) => {
  require(`${globalThis.__hooks}/cap-budget-allocation.js`).applyAllocationBidPriceCap(
    event
  )
}, "budget_allocations")

globalThis.onRecordUpdateRequest((event) => {
  require(`${globalThis.__hooks}/cap-budget-allocation.js`).applyAllocationBidPriceCap(
    event
  )
}, "budget_allocations")
