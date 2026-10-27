globalThis.onRecordCreate((event) => {
  require(`${globalThis.__hooks}/project-budget-allocation.js`).createBudgetAllocationForProject(
    event
  )
}, "projects")