globalThis.onRecordCreateRequest((event) => {
  require(`${globalThis.__hooks}/project-mutate-completeness.js`).applyProjectMutateCompleteness(
    event,
    true
  )
}, "projects")

globalThis.onRecordUpdateRequest((event) => {
  require(`${globalThis.__hooks}/project-mutate-completeness.js`).applyProjectMutateCompleteness(
    event,
    false
  )
}, "projects")
