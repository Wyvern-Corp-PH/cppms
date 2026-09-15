import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

import {
  ALLOCATION_AMOUNT_INVALID_MESSAGE,
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
  ALLOCATION_AMOUNT_INVALID_MESSAGE: string
  ALLOCATION_LIST_TRUNCATED_MESSAGE: string
  validateAllocationAgainstBidPrice: (input: {
    newAmount: number | string
    existingAllocations: readonly { amount: number }[]
    bidPrice: unknown
    replaceOldAmount?: number
  }) => { ok: true } | { ok: false; message: string }
  applyAllocationBidPriceCap: (event: {
    next?: () => void
    app: {
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
  existing?: Array<{ id: string; amount: number }>
  missingProject?: boolean
}) {
  const next = vi.fn()
  return {
    next,
    event: {
      next,
      app: {
        findRecordById(collection: string, id: string) {
          if (options.missingProject) throw new Error("missing")
          if (collection === "projects" && id === "proj1") {
            return { get: (field: string) => (field === "bid_price" ? options.bidPrice : "") }
          }
          throw new Error("missing record")
        },
        findRecordsByFilter() {
          return (options.existing ?? []).map((item) => row(item.id, item.amount))
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
})

describe("cap-budget-allocation hook entrypoint", () => {
  it("should enforce the cap on budget_allocations create and update requests", () => {
    const entry = readFileSync(
      resolve(hooksDir, "cap-budget-allocation.pb.js"),
      "utf8"
    )
    expect(entry).toContain("cap-budget-allocation.js")
    expect(entry).toContain("onRecordCreateRequest")
    expect(entry).toContain("onRecordUpdateRequest")
    expect(entry).toContain("budget_allocations")
  })
})
