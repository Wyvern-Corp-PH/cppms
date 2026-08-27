globalThis.onRecordAfterCreateSuccess((event) => {
  require(`${globalThis.__hooks}/sync-project-progress.js`).syncProjectFromProgressUpdate(
    event.app,
    event.record
  )
}, "progress_updates")

globalThis.onRecordAfterUpdateSuccess((event) => {
  const hook = require(`${globalThis.__hooks}/sync-project-progress.js`)
  hook.handleProgressUpdateAfterUpdate(event, hook.syncProjectFromProgressUpdate)
}, "progress_updates")
