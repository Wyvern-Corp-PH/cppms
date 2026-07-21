globalThis.onRecordAfterCreateSuccess((event) => {
  require(`${globalThis.__hooks}/sync-project-progress.js`).syncProjectFromProgressUpdate(
    event.app,
    event.record
  )
}, "progress_updates")

globalThis.onRecordAfterUpdateSuccess((event) => {
  require(`${globalThis.__hooks}/sync-project-progress.js`).syncProjectFromProgressUpdate(
    event.app,
    event.record
  )
}, "progress_updates")
