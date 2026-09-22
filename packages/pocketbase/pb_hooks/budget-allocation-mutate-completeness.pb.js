globalThis.onRecordCreateRequest((event) => {
  require(`${globalThis.__hooks}/budget-allocation-mutate-completeness.js`).applyBudgetAllocationMutateCompleteness(
    event,
    true
  )
}, "budget_allocations")

globalThis.onRecordUpdateRequest((event) => {
  require(`${globalThis.__hooks}/budget-allocation-mutate-completeness.js`).applyBudgetAllocationMutateCompleteness(
    event,
    false
  )
}, "budget_allocations")
