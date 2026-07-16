/**
 * Keep projects.progress_pct in sync when local roles create progress_updates
 * (they cannot call projects.update under collection rules).
 *
 * Always apply the newest update for the project (by created), not merely the
 * row that triggered the hook — editing an older row must not regress %.
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

function latestProgressUpdate(app, projectId) {
  const safeId = sanitizeId(projectId)
  if (!safeId) return null
  const rows = app.findRecordsByFilter(
    "progress_updates",
    `project = "${safeId}"`,
    "-created",
    1,
    0
  )
  return rows?.[0] ?? null
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
  syncProjectFromProgressUpdate,
}
