/**
 * Set Planning or Procurement projects to Ongoing on the first budget allocation.
 * System write — LGU/Province cannot client-write this status flip.
 * Failed cap validation never reaches this after-create hook.
 */

const FIRST_ALLOCATION_FROM = ["Planning", "Procurement"]

function projectStatusAfterAllocation(currentStatus, allocationCount) {
  if (allocationCount !== 1) return currentStatus
  return FIRST_ALLOCATION_FROM.includes(currentStatus) ? "Ongoing" : currentStatus
}

function sanitizeId(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9]/g, "")
}

function syncProjectProcurementFromAllocation(app, allocationRecord) {
  try {
    const projectId = sanitizeId(allocationRecord.get("project"))
    if (!projectId) return

    const rows = app.findRecordsByFilter(
      "budget_allocations",
      `project = "${projectId}"`,
      "",
      2,
      0
    )
    const allocationCount = (rows || []).length
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
  syncProjectProcurementFromAllocation,
}
