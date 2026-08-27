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

const FOR_COMPLETION_FROM = [
  "Planning",
  "Procurement",
  "Ongoing",
  "For Revision",
  "Ready for Review",
]
const ONGOING_FROM = ["Planning", "Procurement"]

function projectProgressPatch(toPct, currentStatus) {
  const progress_pct = Number(toPct)
  const pct = Number.isFinite(progress_pct) ? progress_pct : 0
  if (pct >= 100) {
    return {
      progress_pct: pct,
      status: FOR_COMPLETION_FROM.includes(currentStatus)
        ? "For Completion"
        : currentStatus,
    }
  }
  return {
    progress_pct: pct,
    status: ONGOING_FROM.includes(currentStatus) ? "Ongoing" : currentStatus,
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

const HISTORY_EDIT_SKIP_ROLES = ["Super Admin", "Municipality", "Barangay"]

function headerValue(headers, name) {
  if (!headers) return ""
  const lower = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key]
  }
  return ""
}

function headerRequestsSkip(headers) {
  const skip = String(headerValue(headers, "x-skip-progress-sync"))
  return skip === "1" || skip === "true"
}

function actorField(auth, field) {
  if (!auth) return ""
  if (typeof auth.get === "function") return auth.get(field) || ""
  return auth[field] || ""
}

function actorRoleFromAuth(auth) {
  const collection = auth?.collection
  const collectionName =
    typeof collection === "function" ? collection()?.name : collection?.name
  if (collectionName === "_superusers") return "Super Admin"
  return actorField(auth, "role")
}

function sameScopeValue(a, b) {
  const left = String(a ?? "").trim().toLowerCase()
  const right = String(b ?? "").trim().toLowerCase()
  if (!left || !right) return false
  return left === right
}

function isActorInProjectScope(auth, project) {
  const role = actorRoleFromAuth(auth)
  if (role === "Super Admin") return true
  if (!project) return false
  if (role === "Municipality") {
    return sameScopeValue(actorField(auth, "municipality"), project.municipality)
  }
  if (role === "Barangay") {
    return (
      sameScopeValue(actorField(auth, "municipality"), project.municipality) &&
      sameScopeValue(actorField(auth, "barangay"), project.barangay)
    )
  }
  return false
}

function canSkipProgressSync(auth, project) {
  return (
    HISTORY_EDIT_SKIP_ROLES.includes(actorRoleFromAuth(auth)) &&
    isActorInProjectScope(auth, project)
  )
}

function shouldSkipProgressSyncOnUpdate(info, project) {
  if (!headerRequestsSkip(info?.headers)) return false
  return canSkipProgressSync(info?.auth, project)
}

function projectScopeFromApp(app, projectId) {
  if (!app || !projectId) return null
  try {
    const project = app.findRecordById("projects", projectId)
    if (!project) return null
    return {
      municipality: project.get("municipality"),
      barangay: project.get("barangay"),
    }
  } catch {
    return null
  }
}

function handleProgressUpdateAfterUpdate(event, sync) {
  const info =
    typeof event.requestInfo === "function"
      ? event.requestInfo()
      : event.requestInfo
  const record = event.record
  const projectId =
    record && typeof record.get === "function"
      ? record.get("project")
      : record?.project
  const project = projectScopeFromApp(event.app, projectId)
  if (shouldSkipProgressSyncOnUpdate(info, project)) {
    return
  }
  sync(event.app, record)
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
  handleProgressUpdateAfterUpdate,
  shouldSkipProgressSyncOnUpdate,
}
