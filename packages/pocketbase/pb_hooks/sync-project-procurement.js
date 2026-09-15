/**
 * Set Planning or Procurement projects to Ongoing on the first budget allocation.
 * System write — LGU/Province cannot client-write this status flip.
 * Failed cap validation never reaches this after-create hook.
 */

const FIRST_ALLOCATION_FROM = ["Planning", "Procurement"]
// tradeoff: same project-row UPDATE as cap-budget-allocation.js. PocketBase
// JSVM has no row-lock API. Holds a SQLite write lock until Save commits
// when this runs as onRecordCreate. After-create is after commit.
// Ceiling: no-op when app.db is missing. Upgrade: allocated_total column.
const PROJECT_ROW_LOCK_SQL = "UPDATE projects SET updated = updated WHERE id = {:id}"

function projectStatusAfterAllocation(currentStatus, allocationCount) {
  if (allocationCount !== 1) return currentStatus
  return FIRST_ALLOCATION_FROM.includes(currentStatus) ? "Ongoing" : currentStatus
}

function sanitizeId(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9]/g, "")
}

function recordId(record) {
  if (!record) return ""
  if (record.id) return String(record.id)
  if (typeof record.get === "function") return String(record.get("id") || "")
  return ""
}

function lockProjectRow(app, projectId) {
  const id = sanitizeId(projectId)
  if (!id || !app || typeof app.db !== "function") return
  try {
    app.db().newQuery(PROJECT_ROW_LOCK_SQL).bind({ id }).execute()
  } catch {
    // cannot prove a lock; caller still re-reads count
  }
}

function syncProjectProcurementFromAllocation(app, allocationRecord) {
  try {
    const projectId = sanitizeId(allocationRecord.get("project"))
    if (!projectId) return

    lockProjectRow(app, projectId)
    const rows = app.findRecordsByFilter(
      "budget_allocations",
      `project = "${projectId}"`,
      "",
      2,
      0
    )
    const currentId = recordId(allocationRecord)
    const others = (rows || []).filter((row) => recordId(row) !== currentId)
    const allocationCount = others.length + 1
    const project = app.findRecordById("projects", projectId)
    const currentStatus = project.get("status")
    const nextStatus = projectStatusAfterAllocation(currentStatus, allocationCount)
    if (nextStatus === currentStatus) return

    project.set("status", nextStatus)
    app.save(project)
  } catch (error) {
    console.error(
      "Allocation saved, but project status did not sync.",
      error
    )
  }
}

module.exports = {
  projectStatusAfterAllocation,
  PROJECT_ROW_LOCK_SQL,
  lockProjectRow,
  syncProjectProcurementFromAllocation,
}
