const SYSTEM_ALLOCATION_DESCRIPTION =
  "System-generated from Provincial project creation."

function authCollectionName(auth) {
  const collection = auth?.collection
  if (typeof collection === "function") {
    return collection()?.name || ""
  }
  return collection?.name || auth?.collectionName || ""
}

function actorUserId(auth) {
  if (!auth || authCollectionName(auth) !== "users") return ""
  return auth.id || auth.get?.("id") || ""
}

function requestAuth(event) {
  const requestInfo =
    typeof event.requestInfo === "function"
      ? event.requestInfo()
      : event.requestInfo
  return requestInfo?.auth || event.auth
}

function createBudgetAllocationForProject(event) {
  if (!event.record.get("source_of_fund")) {
    event.next()
    return
  }

  const app = event.app
  try {
    app.runInTransaction((txApp) => {
      event.app = txApp
      event.next()

      const project = txApp.findRecordById("projects", event.record.id)
      const amount = Number(project.get("total_budget"))
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestError(
          "Total Budget must be greater than zero to create the project allocation."
        )
      }

      const allocation = new Record(
        txApp.findCollectionByNameOrId("budget_allocations")
      )
      allocation.set("project", project.id)
      allocation.set("amount", amount)
      allocation.set("year", project.get("budget_year"))
      allocation.set("date", new Date().toISOString().slice(0, 10))
      allocation.set("description", SYSTEM_ALLOCATION_DESCRIPTION)
      txApp.save(allocation)
    })
  } finally {
    event.app = app
  }
}

// Model create has no request auth (seed, migration). Stamp allocated_by
// only for a users-collection actor on the create request.
function setAllocatedByFromCreateRequest(event) {
  const app = event.app
  try {
    app.runInTransaction((txApp) => {
      event.app = txApp
      event.next()

      const userId = actorUserId(requestAuth(event))
      if (!userId) return

      const projectId = String(event.record.id || "").replace(
        /[^a-zA-Z0-9]/g,
        ""
      )
      if (!projectId) return

      const rows =
        txApp.findRecordsByFilter(
          "budget_allocations",
          `project = "${projectId}" && description = "${SYSTEM_ALLOCATION_DESCRIPTION}"`,
          "",
          1,
          0
        ) || []
      const allocation = rows[0]
      if (!allocation) return

      allocation.set("allocated_by", userId)
      txApp.save(allocation)
    })
  } finally {
    event.app = app
  }
}

module.exports = {
  createBudgetAllocationForProject,
  setAllocatedByFromCreateRequest,
}
