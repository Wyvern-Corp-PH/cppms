globalThis.onRecordCreateRequest((event) => {
  require(`${globalThis.__hooks}/project-field-ownership.js`).applyProjectFieldOwnership(
    event,
    true
  )
}, "projects")

globalThis.onRecordUpdateRequest((event) => {
  require(`${globalThis.__hooks}/project-field-ownership.js`).applyProjectFieldOwnership(
    event,
    false
  )
}, "projects")
