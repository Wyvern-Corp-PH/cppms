/**
 * Move Planning projects to Procurement when a budget allocation is created.
 * System write — LGU/Province cannot client-write this status flip.
 */

function projectStatusAfterAllocation(currentStatus) {
  return currentStatus === "Planning" ? "Procurement" : currentStatus
}

function sanitizeId(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9]/g, "")
}

function syncProjectProcurementFromAllocation(app, allocationRecord) {
  try {
    const projectId = sanitizeId(allocationRecord.get("project"))
    if (!projectId) return

    const project = app.findRecordById("projects", projectId)
    const currentStatus = project.get("status")
    const nextStatus = projectStatusAfterAllocation(currentStatus)
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
