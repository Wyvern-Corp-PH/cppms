import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

import {
  ALLOCATION_AMOUNT_INVALID_MESSAGE,
  ALLOCATION_EXCEEDS_BUDGET_MESSAGE,
  ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE,
} from "./budget-allocation-guards"

const hooksDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../pb_hooks"
)

class BadRequestError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "BadRequestError"
  }
}

function loadHook<T extends Record<string, unknown>>(fileName: string): T {
  const sandbox = {
    module: { exports: {} as T },
    exports: {} as T,
    console,
    BadRequestError,
  }
  runInNewContext(readFileSync(resolve(hooksDir, fileName), "utf8"), sandbox)
  return sandbox.module.exports
}

const capHook = loadHook<{
  ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE: string
  ALLOCATION_EXCEEDS_BUDGET_MESSAGE: string
  ALLOCATION_AMOUNT_INVALID_MESSAGE: string
  ALLOCATION_LIST_TRUNCATED_MESSAGE: string
  PROJECT_ROW_LOCK_SQL: string
  validateAllocationAgainstBidPrice: (input: {
    newAmount: number | string
    existingAllocations: readonly { amount: number }[]
    bidPrice: unknown
    replaceOldAmount?: number
  }) => { ok: true } | { ok: false; message: string }
  applyAllocationBidPriceCap: (event: {
    next?: () => void
    app: {
      db?: () => {
        newQuery: (sql: string) => {
          bind: (params: { id: string }) => { execute: () => void }
        }
      }
      findRecordById: (collection: string, id: string) => { get: (field: string) => unknown }
      findRecordsByFilter: (
        collection: string,
        filter: string,
        sort: string,
        limit: number,
        offset: number
      ) => Array<{ id: string; get: (field: string) => unknown }>
    }
    record: { id?: string; get: (field: string) => unknown }
  }) => void
}>("cap-budget-allocation.js")

function row(id: string, amount: number) {
  return {
    id,
    get(field: string) {
      if (field === "amount") return amount
      if (field === "id") return id
      return ""
    },
  }
}

function capEvent(options: {
  id?: string
  amount: unknown
  project?: string
  bidPrice?: unknown
  totalBudget?: unknown
  sourceOfFund?: unknown
  existing?: Array<{ id: string; amount: number }>
  missingProject?: boolean
  omitDb?: boolean
  lockFailure?: "db" | "query" | "bind" | "execute"
}) {
  const next = vi.fn()
  const lockQueries: Array<{ sql: string; params: { id: string } }> = []
  const callOrder: string[] = []
  const existingRows = options.existing ?? []
  return {
    next,
    lockQueries,
    callOrder,
    event: {
      next,
      app: {
        ...(options.omitDb
          ? {}
          : {
              db() {
                if (options.lockFailure === "db") throw new Error("db failure")
                return {
                  newQuery(sql: string) {
                    if (options.lockFailure === "query") {
                      throw new Error("query failure")
                    }
                    return {
                      bind(params: { id: string }) {
                        if (options.lockFailure === "bind") {
                          throw new Error("bind failure")
                        }
                        return {
                          execute() {
                            if (options.lockFailure === "execute") {
                              throw new Error("execute failure")
                            }
                            callOrder.push("lock")
                            lockQueries.push({ sql, params })
                          },
                        }
                      },
                    }
                  },
                }
              },
            }),
        findRecordById(collection: string, id: string) {
          if (options.missingProject) throw new Error("missing")
          if (collection === "projects" && id === "proj1") {
            return {
              get: (field: string) => {
                if (field === "bid_price") return options.bidPrice
                if (field === "total_budget") return options.totalBudget
                if (field === "source_of_fund") return options.sourceOfFund
                return ""
              },
            }
          }
          throw new Error("missing record")
        },
        findRecordsByFilter() {
          callOrder.push("read")
          return existingRows.map((item) => row(item.id, item.amount))
        },
      },
      record: {
        id: options.id ?? "new-alloc",
        get(field: string) {
          if (field === "amount") return options.amount
          if (field === "project") return options.project ?? "proj1"
          if (field === "id") return options.id ?? "new-alloc"
          return ""
        },
      },
    },
  }
}

describe("cap-budget-allocation hook helper", () => {
  it("should export the same exceed and invalid strings as the TypeScript helper", () => {
    expect(capHook.ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE).toBe(
      ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE
    )
    expect(capHook.ALLOCATION_AMOUNT_INVALID_MESSAGE).toBe(
      ALLOCATION_AMOUNT_INVALID_MESSAGE
    )
  })

  it("should reject a create that would exceed bid price", () => {
    expect(
      capHook.validateAllocationAgainstBidPrice({
        newAmount: 60_000,
        existingAllocations: [{ amount: 50_000 }],
        bidPrice: 100_000,
      })
    ).toEqual({
      ok: false,
      message: ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE,
    })
  })
})

describe("applyAllocationBidPriceCap", () => {
  it("should block persist on create when existing plus new exceeds bid price", () => {
    const { next, event } = capEvent({
      amount: 60_000,
      bidPrice: 100_000,
      existing: [{ id: "a1", amount: 50_000 }],
    })

    expect(() => capHook.applyAllocationBidPriceCap(event)).toThrow(
      ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should use Total Budget as the cap for marked projects", () => {
    const { next, event } = capEvent({
      amount: 750_001,
      bidPrice: 1_000_000,
      totalBudget: 750_000,
      sourceOfFund: "General Fund",
    })

    expect(() => capHook.applyAllocationBidPriceCap(event)).toThrow(
      ALLOCATION_EXCEEDS_BUDGET_MESSAGE
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should allow create when existing plus new equals bid price", () => {
    const { next, event } = capEvent({
      amount: 50_000,
      bidPrice: 100_000,
      existing: [{ id: "a1", amount: 50_000 }],
    })

    capHook.applyAllocationBidPriceCap(event)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("should exclude the bound row on update so a reshuffle under the cap can save", () => {
    const { next, event } = capEvent({
      id: "a1",
      amount: 60_000,
      bidPrice: 100_000,
      existing: [
        { id: "a1", amount: 50_000 },
        { id: "a2", amount: 40_000 },
      ],
    })

    capHook.applyAllocationBidPriceCap(event)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("should block update when others plus new exceeds bid price", () => {
    const { next, event } = capEvent({
      id: "a1",
      amount: 70_000,
      bidPrice: 100_000,
      existing: [
        { id: "a1", amount: 50_000 },
        { id: "a2", amount: 40_000 },
      ],
    })

    expect(() => capHook.applyAllocationBidPriceCap(event)).toThrow(
      ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should keep the invalid-amount message for a non-finite allocation", () => {
    const { next, event } = capEvent({
      amount: Number.NaN,
      bidPrice: 100_000,
    })

    expect(() => capHook.applyAllocationBidPriceCap(event)).toThrow(
      ALLOCATION_AMOUNT_INVALID_MESSAGE
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should reject persist when the allocation list is truncated at 500", () => {
    const existing = Array.from({ length: 500 }, (_, index) => ({
      id: `a${index}`,
      amount: 1,
    }))
    const { next, event } = capEvent({
      amount: 1,
      bidPrice: 1_000_000,
      existing,
    })

    expect(() => capHook.applyAllocationBidPriceCap(event)).toThrow(
      capHook.ALLOCATION_LIST_TRUNCATED_MESSAGE
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should treat a missing bid price as zero and reject a positive create", () => {
    const { event } = capEvent({
      amount: 1,
      missingProject: true,
    })

    expect(() => capHook.applyAllocationBidPriceCap(event)).toThrow(
      ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE
    )
  })

  it("should lock the project row before reading allocations", () => {
    const { event, lockQueries, callOrder } = capEvent({
      amount: 50_000,
      bidPrice: 100_000,
    })

    capHook.applyAllocationBidPriceCap(event)

    expect(lockQueries).toEqual([
      { sql: capHook.PROJECT_ROW_LOCK_SQL, params: { id: "proj1" } },
    ])
    expect(callOrder[0]).toBe("lock")
    expect(callOrder).toContain("read")
  })

  it("should reject the second persist when remaining is already consumed", () => {
    const existing: Array<{ id: string; amount: number }> = []
    const persist = (id: string, amount: number) => {
      const { next, event } = capEvent({
        id,
        amount,
        bidPrice: 100_000,
      })
      event.app.findRecordsByFilter = () =>
        existing.map((item) => row(item.id, item.amount))
      capHook.applyAllocationBidPriceCap(event)
      existing.push({ id, amount })
      return next
    }

    expect(persist("a1", 60_000)).toHaveBeenCalledTimes(1)
    expect(() => persist("a2", 60_000)).toThrow(
      ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE
    )
  })

  it.each([
    { stage: "missing db method", options: { omitDb: true } },
    { stage: "database access", options: { lockFailure: "db" as const } },
    { stage: "query construction", options: { lockFailure: "query" as const } },
    { stage: "parameter binding", options: { lockFailure: "bind" as const } },
    { stage: "lock execution", options: { lockFailure: "execute" as const } },
  ])("fails closed when project-row lock $stage fails", ({ options }) => {
    const { next, event, callOrder } = capEvent({
      amount: 1,
      bidPrice: 100_000,
      ...options,
    })

    expect(() => capHook.applyAllocationBidPriceCap(event)).toThrow(
      "Unable to validate allocation cap because the project lock could not be established."
    )
    expect(next).not.toHaveBeenCalled()
    expect(callOrder).not.toContain("read")
  })
})

const floorHook = loadHook<{
  TOTAL_BUDGET_BELOW_ALLOCATED_MESSAGE: string
  PROJECT_ROW_LOCK_SQL: string
  applyProjectTotalBudgetFloor: (event: unknown) => void
}>("cap-budget-allocation.js")

function projectUpdateEvent(options: {
  sourceOfFund: string
  totalBudget: number
  original: { source_of_fund: string; total_budget: number }
  allocated: number[]
}) {
  const callOrder: string[] = []
  const lockQueries: Array<{ sql: string; params: { id: string } }> = []
  const saved = vi.fn()
  const fields: Record<string, unknown> = {
    source_of_fund: options.sourceOfFund,
    total_budget: options.totalBudget,
  }
  const txApp = {
    db: () => ({
      newQuery: (sql: string) => ({
        bind: (params: { id: string }) => ({
          execute: () => {
            callOrder.push("lock")
            lockQueries.push({ sql, params })
          },
        }),
      }),
    }),
    findRecordsByFilter: vi.fn(() => {
      callOrder.push("read")
      return options.allocated.map((amount, index) => row(`a${index}`, amount))
    }),
    save: saved,
  }
  const app = {
    runInTransaction: vi.fn((work: (tx: typeof txApp) => void) => {
      callOrder.push("tx")
      work(txApp)
    }),
  }
  const event = {
    app: app as unknown,
    record: {
      id: "proj1",
      get: (field: string) => fields[field],
      originalCopy: {
        get: (field: string) =>
          (options.original as Record<string, unknown>)[field],
      },
    },
    next: vi.fn(() => {
      callOrder.push(event.app === txApp ? "next" : "next-outside-tx")
    }),
  }
  return { event, app, txApp, saved, callOrder, lockQueries }
}

describe("applyProjectTotalBudgetFloor", () => {
  it("should reject a Total Budget below the allocated sum under the project row lock", () => {
    const { event, saved, callOrder, lockQueries } = projectUpdateEvent({
      sourceOfFund: "General Fund",
      totalBudget: 500_000,
      original: { source_of_fund: "General Fund", total_budget: 750_000 },
      allocated: [400_000, 200_000],
    })

    expect(() => floorHook.applyProjectTotalBudgetFloor(event)).toThrow(
      "Total Budget cannot be less than the amount already allocated."
    )
    expect(callOrder).toEqual(["tx", "lock", "read"])
    expect(lockQueries).toEqual([
      { sql: floorHook.PROJECT_ROW_LOCK_SQL, params: { id: "proj1" } },
    ])
    expect(event.next).not.toHaveBeenCalled()
    expect(saved).not.toHaveBeenCalled()
  })

  it("should save a Total Budget at or above the allocated sum without touching allocations", () => {
    const { event, saved, callOrder } = projectUpdateEvent({
      sourceOfFund: "General Fund",
      totalBudget: 600_000,
      original: { source_of_fund: "General Fund", total_budget: 750_000 },
      allocated: [400_000, 200_000],
    })

    floorHook.applyProjectTotalBudgetFloor(event)

    expect(callOrder).toEqual(["tx", "lock", "read", "next"])
    expect(saved).not.toHaveBeenCalled()
  })

  it("should not create an allocation when a legacy project gains Source of Fund on edit", () => {
    const { event, saved, callOrder } = projectUpdateEvent({
      sourceOfFund: "20% LDF (Local Development Fund)",
      totalBudget: 900_000,
      original: { source_of_fund: "", total_budget: 0 },
      allocated: [],
    })

    floorHook.applyProjectTotalBudgetFloor(event)

    expect(callOrder).toEqual(["tx", "lock", "read", "next"])
    expect(saved).not.toHaveBeenCalled()
  })

  it("should skip the floor when neither Source of Fund nor Total Budget changes", () => {
    const { event, app, txApp } = projectUpdateEvent({
      sourceOfFund: "General Fund",
      totalBudget: 750_000,
      original: { source_of_fund: "General Fund", total_budget: 750_000 },
      allocated: [900_000],
    })

    floorHook.applyProjectTotalBudgetFloor(event)

    expect(app.runInTransaction).not.toHaveBeenCalled()
    expect(txApp.findRecordsByFilter).not.toHaveBeenCalled()
    expect(event.next).toHaveBeenCalledOnce()
  })

  it("should skip the floor for projects without Source of Fund", () => {
    const { event, app } = projectUpdateEvent({
      sourceOfFund: "",
      totalBudget: 0,
      original: { source_of_fund: "", total_budget: 10 },
      allocated: [900_000],
    })

    floorHook.applyProjectTotalBudgetFloor(event)

    expect(app.runInTransaction).not.toHaveBeenCalled()
    expect(event.next).toHaveBeenCalledOnce()
  })
})

describe("cap-budget-allocation hook entrypoint", () => {
  it("should run the Total Budget floor on the projects model update", () => {
    const entry = readFileSync(
      resolve(hooksDir, "cap-budget-allocation.pb.js"),
      "utf8"
    )
    expect(entry).toMatch(
      /onRecordUpdate\(\(event\) => \{\s*require\([^)]*cap-budget-allocation\.js`\)\.applyProjectTotalBudgetFloor\(\s*event\s*\)\s*\}, "projects"\)/
    )
  })

  it("should enforce the cap on budget_allocations create and update requests", () => {
    const entry = readFileSync(
      resolve(hooksDir, "cap-budget-allocation.pb.js"),
      "utf8"
    )
    expect(entry).toContain("cap-budget-allocation.js")
    expect(entry).toContain("onRecordCreateRequest")
    expect(entry).toContain("onRecordUpdateRequest")
    expect(entry).toContain("onRecordCreate(")
    expect(entry).toContain("onRecordUpdate(")
    expect(entry).toContain("budget_allocations")
  })
})
