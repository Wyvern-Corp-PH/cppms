const hooksDir = globalThis.__hooks

globalThis.onRecordAfterCreateSuccess((event) => {
  require(`${hooksDir}/sync-project-progress.js`).syncProjectFromProgressUpdate(
    event.app,
    event.record
  )
}, "progress_updates")

globalThis.onRecordAfterUpdateSuccess((event) => {
  require(`${hooksDir}/sync-project-progress.js`).syncProjectFromProgressUpdate(
    event.app,
    event.record
  )
}, "progress_updates")
