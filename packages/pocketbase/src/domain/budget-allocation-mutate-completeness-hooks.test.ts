import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

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

const completenessHook = loadHook<{
  validateBudgetAllocationMutateCompleteness: (input: {
    isCreate: boolean
    submitted: Record<string, unknown>
  }) => { ok: true } | { ok: false; field: string; message: string }
  applyBudgetAllocationMutateCompleteness: (
    event: {
      next?: () => void
      record: { get: (field: string) => unknown }
    },
    isCreate: boolean
  ) => void
}>("budget-allocation-mutate-completeness.js")

function recordGet(fields: Record<string, unknown>) {
  return {
    get(field: string) {
      return fields[field]
    },
  }
}

describe("budget-allocation-mutate-completeness hook helper", () => {
  it("should reject API allocation create when description is omitted", () => {
    const result = completenessHook.validateBudgetAllocationMutateCompleteness({
      isCreate: true,
      submitted: {
        project: "p1",
        amount: 100_000,
        year: 2026,
        date: "2026-07-09",
        description: "",
        moa_file: ["moa.pdf"],
        resolution_file: ["res.pdf"],
        supporting_docs: ["sup.pdf"],
      },
    })
    expect(result).toEqual({
      ok: false,
      field: "description",
      message: "Description is required.",
    })
  })

  it("should accept update when documents remain on the record", () => {
    const result = completenessHook.validateBudgetAllocationMutateCompleteness({
      isCreate: false,
      submitted: {
        project: "p1",
        amount: 90_000,
        year: 2026,
        date: "2026-07-09",
        description: "Scalar edit",
        moa_file: ["moa-on-record.pdf"],
        resolution_file: ["res-on-record.pdf"],
        supporting_docs: ["sup-on-record.pdf"],
      },
    })
    expect(result).toEqual({ ok: true })
  })
})

describe("budget-allocation-mutate-completeness hook entrypoint", () => {
  it("should wire create and update request hooks", () => {
    const entry = readFileSync(
      resolve(hooksDir, "budget-allocation-mutate-completeness.pb.js"),
      "utf8"
    )
    expect(entry).toContain("budget-allocation-mutate-completeness.js")
    expect(entry).toContain("onRecordCreateRequest")
    expect(entry).toContain("onRecordUpdateRequest")
    expect(entry).toContain("budget_allocations")
  })

  it("should throw BadRequestError when allocation create omits moa_file", () => {
    const next = vi.fn()
    expect(() =>
      completenessHook.applyBudgetAllocationMutateCompleteness(
        {
          next,
          record: recordGet({
            project: "p1",
            amount: 100_000,
            year: 2026,
            date: "2026-07-09",
            description: "FY2026",
            moa_file: [],
            resolution_file: ["res.pdf"],
            supporting_docs: ["sup.pdf"],
          }),
        },
        true
      )
    ).toThrow(/MOA document is required/)
    expect(next).not.toHaveBeenCalled()
  })

  it("should call next when allocation update keeps on-record documents", () => {
    const next = vi.fn()
    completenessHook.applyBudgetAllocationMutateCompleteness(
      {
        next,
        record: recordGet({
          project: "p1",
          amount: 90_000,
          year: 2026,
          date: "2026-07-09",
          description: "Scalar edit",
          moa_file: ["kept-moa.pdf"],
          resolution_file: ["kept-res.pdf"],
          supporting_docs: ["kept-sup.pdf"],
        }),
      },
      false
    )
    expect(next).toHaveBeenCalledOnce()
  })
})
