globalThis.onRecordAfterCreateSuccess((event) => {
  require(`${globalThis.__hooks}/sync-project-progress.js`).syncProjectFromProgressUpdate(
    event.app,
    event.record
  )
}, "progress_updates")

globalThis.onRecordAfterUpdateSuccess((event) => {
  const info =
    typeof event.requestInfo === "function"
      ? event.requestInfo()
      : event.requestInfo
  const headers = info?.headers || {}
  const skip = headers["x-skip-progress-sync"] || headers["X-Skip-Progress-Sync"]
  if (skip === "1" || skip === "true") {
    return
  }
  require(`${globalThis.__hooks}/sync-project-progress.js`).syncProjectFromProgressUpdate(
    event.app,
    event.record
  )
}, "progress_updates")
