/**
 * Keep projects.progress_pct in sync when local roles create progress_updates
 * (they cannot call projects.update under collection rules).
 *
 * Always apply the newest update for the project (by created), not merely the
 * row that triggered the hook — editing an older row must not regress %.
 *
 * Note: findRecordsByFilter rejects sort field "created" in some PB JSAPI
 * paths (see migration 1740000029). Fetch unsorted and pick newest in JS.
 */

function projectProgressPatch(toPct, currentStatus) {
  const progress_pct = Number(toPct)
  const pct = Number.isFinite(progress_pct) ? progress_pct : 0
  return {
    progress_pct: pct,
    status: pct >= 100 ? "Ready for Review" : currentStatus,
  }
}

function sanitizeId(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9]/g, "")
}

function recordRecencyKey(row) {
  return String(row.get("created") || row.get("updated") || row.id || "")
}

function pickLatestProgressUpdate(rows) {
  if (!rows || rows.length === 0) return null
  let latest = rows[0]
  let latestKey = recordRecencyKey(latest)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const key = recordRecencyKey(row)
    if (key.localeCompare(latestKey) > 0) {
      latest = row
      latestKey = key
    }
  }
  return latest
}

function latestProgressUpdate(app, projectId) {
  const safeId = sanitizeId(projectId)
  if (!safeId) return null
  const rows = app.findRecordsByFilter(
    "progress_updates",
    `project = "${safeId}"`,
    "",
    500,
    0
  )
  return pickLatestProgressUpdate(rows)
}

function syncProjectFromProgressUpdate(app, progressRecord) {
  try {
    const projectId = progressRecord.get("project")
    if (!projectId) return

    const source = latestProgressUpdate(app, projectId) ?? progressRecord
    const project = app.findRecordById("projects", projectId)
    const patch = projectProgressPatch(
      source.get("to_pct"),
      project.get("status")
    )
    project.set("progress_pct", patch.progress_pct)
    project.set("status", patch.status)
    app.save(project)
  } catch (error) {
    console.error(
      "Progress update saved, but project summary did not sync.",
      error
    )
  }
}

module.exports = {
  projectProgressPatch,
  latestProgressUpdate,
  pickLatestProgressUpdate,
  syncProjectFromProgressUpdate,
}
