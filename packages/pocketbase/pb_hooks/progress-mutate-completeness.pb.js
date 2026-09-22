globalThis.onRecordCreateRequest((event) => {
  require(`${globalThis.__hooks}/progress-mutate-completeness.js`).applyProgressMutateCompleteness(
    event,
    true
  )
}, "progress_updates")

globalThis.onRecordUpdateRequest((event) => {
  require(`${globalThis.__hooks}/progress-mutate-completeness.js`).applyProgressMutateCompleteness(
    event,
    false
  )
}, "progress_updates")

globalThis.onRecordCreateRequest((event) => {
  require(`${globalThis.__hooks}/progress-mutate-completeness.js`).applyProgressLinkedExpenseCompleteness(
    event
  )
}, "budget_expenses")

globalThis.onRecordUpdateRequest((event) => {
  require(`${globalThis.__hooks}/progress-mutate-completeness.js`).applyProgressLinkedExpenseCompleteness(
    event
  )
}, "budget_expenses")
