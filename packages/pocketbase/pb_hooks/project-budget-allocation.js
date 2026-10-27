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
      txApp.save(allocation)
    })
  } finally {
    event.app = app
  }
}

module.exports = { createBudgetAllocationForProject }