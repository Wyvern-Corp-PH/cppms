import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

const hooksDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../pb_hooks"
)

class RecordModel {
  fields: Record<string, unknown> = {}

  constructor(readonly collection: unknown) {}

  set(field: string, value: unknown) {
    this.fields[field] = value
  }
}

const hook = (() => {
  const sandbox = {
    module: { exports: {} as Record<string, unknown> },
    exports: {} as Record<string, unknown>,
    Record: RecordModel,
    Date,
  }
  runInNewContext(
    readFileSync(resolve(hooksDir, "project-budget-allocation.js"), "utf8"),
    sandbox
  )
  return sandbox.module.exports as {
    createBudgetAllocationForProject: (event: {
      app: unknown
      record: { id: string; get: (field: string) => unknown }
      next: () => void
    }) => void
    setAllocatedByFromCreateRequest: (event: {
      app: {
        runInTransaction: (work: (txApp: unknown) => void) => void
      }
      record: { id: string }
      auth?: unknown
      next: () => void
    }) => void
  }
})()

describe("createBudgetAllocationForProject", () => {
  it("saves the project and linked allocation in the same transaction", () => {
    const project = {
      id: "project-1",
      get: (field: string) =>
        ({
          source_of_fund: "General Fund",
          total_budget: 750_000,
          budget_year: 2026,
        })[field],
    }
    const projectSaved = vi.fn()
    const allocationSaved = vi.fn()
    const transactionApp = {
      findCollectionByNameOrId: vi.fn(() => "budget_allocations"),
      findRecordById: vi.fn(() => project),
      save: allocationSaved,
    }
    const app = {
      runInTransaction: vi.fn((work: (txApp: typeof transactionApp) => void) =>
        work(transactionApp)
      ),
    }
    const event = {
      app,
      record: project,
      next: vi.fn(() => projectSaved()),
    }

    hook.createBudgetAllocationForProject(event)

    expect(app.runInTransaction).toHaveBeenCalledTimes(1)
    expect(event.next).toHaveBeenCalledTimes(1)
    expect(allocationSaved).toHaveBeenCalledTimes(1)
    const allocation = allocationSaved.mock.calls[0]?.[0] as RecordModel
    expect(allocation.fields).toMatchObject({
      project: "project-1",
      amount: 750_000,
      year: 2026,
      description: "System-generated from Provincial project creation.",
    })
    expect(allocation.fields.allocated_by).toBeUndefined()
  })

  it("propagates allocation errors so the transaction can roll back", () => {
    const project = {
      id: "project-1",
      get: (field: string) =>
        ({
          source_of_fund: "General Fund",
          total_budget: 750_000,
          budget_year: 2026,
        })[field],
    }
    const failure = new Error("allocation failed")
    const transactionApp = {
      findCollectionByNameOrId: vi.fn(() => "budget_allocations"),
      findRecordById: vi.fn(() => project),
      save: vi.fn(() => {
        throw failure
      }),
    }
    const event = {
      app: {
        runInTransaction: (work: (txApp: typeof transactionApp) => void) =>
          work(transactionApp),
      },
      record: project,
      next: vi.fn(),
    }

    expect(() => hook.createBudgetAllocationForProject(event)).toThrow(failure)
    expect(event.next).toHaveBeenCalledTimes(1)
  })

  it("does not create allocations for unmarked legacy projects", () => {
    const event = {
      app: { runInTransaction: vi.fn() },
      record: { id: "legacy-project", get: () => "" },
      next: vi.fn(),
    }

    hook.createBudgetAllocationForProject(event)

    expect(event.next).toHaveBeenCalledTimes(1)
    expect(event.app.runInTransaction).not.toHaveBeenCalled()
  })
})

const SYSTEM_ALLOCATION_DESCRIPTION =
  "System-generated from Provincial project creation."

function createRequestEvent(auth?: unknown) {
  const allocation = new RecordModel("budget_allocations")
  allocation.set("project", "proj1")
  allocation.set("amount", 750_000)
  allocation.set("year", 2026)
  allocation.set("description", SYSTEM_ALLOCATION_DESCRIPTION)
  const calls: string[] = []
  const transactionApp = {
    findRecordsByFilter: vi.fn(() => {
      calls.push("find")
      return [allocation]
    }),
    save: vi.fn(() => {
      calls.push("save")
    }),
  }
  const app = {
    runInTransaction: vi.fn((work: (txApp: typeof transactionApp) => void) => {
      calls.push("tx")
      work(transactionApp)
    }),
  }
  const event = {
    app,
    record: { id: "proj1" },
    auth,
    next: vi.fn(() => {
      calls.push("next")
    }),
  }
  return { allocation, app, calls, event, transactionApp }
}

describe("setAllocatedByFromCreateRequest", () => {
  it("should set allocated_by from the signed-in user after the allocation is created", () => {
    const { allocation, app, calls, event, transactionApp } = createRequestEvent({
      id: "user1",
      collection: () => ({ name: "users" }),
    })

    hook.setAllocatedByFromCreateRequest(event)

    expect(calls).toEqual(["tx", "next", "find", "save"])
    expect(event.app).toBe(app)
    expect(transactionApp.findRecordsByFilter).toHaveBeenCalledWith(
      "budget_allocations",
      `project = "proj1" && description = "${SYSTEM_ALLOCATION_DESCRIPTION}"`,
      "",
      1,
      0
    )
    expect(transactionApp.save).toHaveBeenCalledWith(allocation)
    expect(allocation.fields).toMatchObject({
      project: "proj1",
      amount: 750_000,
      year: 2026,
      description: SYSTEM_ALLOCATION_DESCRIPTION,
      allocated_by: "user1",
    })
  })

  it("should leave allocated_by empty when the actor is a superuser", () => {
    const { allocation, calls, event, transactionApp } = createRequestEvent({
      id: "super1",
      collection: () => ({ name: "_superusers" }),
    })

    hook.setAllocatedByFromCreateRequest(event)

    expect(calls).toEqual(["tx", "next"])
    expect(transactionApp.save).not.toHaveBeenCalled()
    expect(allocation.fields.allocated_by).toBeUndefined()
  })

  it("should leave allocated_by empty when the create has no request auth", () => {
    const { allocation, calls, event, transactionApp } = createRequestEvent()

    hook.setAllocatedByFromCreateRequest(event)

    expect(calls).toEqual(["tx", "next"])
    expect(transactionApp.save).not.toHaveBeenCalled()
    expect(allocation.fields.allocated_by).toBeUndefined()
  })
})