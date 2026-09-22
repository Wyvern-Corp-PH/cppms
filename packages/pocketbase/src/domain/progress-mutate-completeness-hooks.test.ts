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
  validateProgressMutateCompleteness: (input: {
    isCreate: boolean
    submitted: Record<string, unknown>
  }) => { ok: true } | { ok: false; field: string; message: string }
  validateProgressLinkedExpenseCompleteness: (input: {
    submitted: Record<string, unknown>
  }) => { ok: true } | { ok: false; field: string; message: string }
  applyProgressMutateCompleteness: (
    event: {
      next?: () => void
      record: { get: (field: string) => unknown }
    },
    isCreate: boolean
  ) => void
  applyProgressLinkedExpenseCompleteness: (event: {
    next?: () => void
    record: { get: (field: string) => unknown }
  }) => void
}>("progress-mutate-completeness.js")

function recordGet(fields: Record<string, unknown>) {
  return {
    get(field: string) {
      return fields[field]
    },
  }
}

describe("progress-mutate-completeness hook helper", () => {
  it("should reject API progress create when notes are omitted", () => {
    const result = completenessHook.validateProgressMutateCompleteness({
      isCreate: true,
      submitted: {
        notes: "",
        site_photo: ["site.jpg"],
        from_pct: 10,
        to_pct: 20,
      },
    })
    expect(result).toEqual({
      ok: false,
      field: "notes",
      message: "Update notes are required.",
    })
  })

  it("should accept update when site photo remains on the record", () => {
    const result = completenessHook.validateProgressMutateCompleteness({
      isCreate: false,
      submitted: {
        notes: "Kept photo",
        site_photo: ["site-on-record.jpg"],
        to_pct: 30,
      },
    })
    expect(result).toEqual({ ok: true })
  })

  it("should reject progress-linked expense create when receipt is blank", () => {
    const result = completenessHook.validateProgressLinkedExpenseCompleteness({
      submitted: {
        project: "p1",
        progress_update: "pu1",
        amount: 1500,
        year: 2026,
        main_account: "Special Education Fund",
        date: "2026-07-09",
        receipt_number: "",
        description: "Materials",
      },
    })
    expect(result).toEqual({
      ok: false,
      field: "receipt_number",
      message: "Receipt number is required.",
    })
  })
})

describe("progress-mutate-completeness hook entrypoint", () => {
  it("should wire create and update request hooks", () => {
    const entry = readFileSync(
      resolve(hooksDir, "progress-mutate-completeness.pb.js"),
      "utf8"
    )
    expect(entry).toContain("progress-mutate-completeness.js")
    expect(entry).toContain("onRecordCreateRequest")
    expect(entry).toContain("onRecordUpdateRequest")
    expect(entry).toContain("progress_updates")
    expect(entry).toContain("budget_expenses")
  })

  it("should throw BadRequestError when progress create omits site photo", () => {
    const next = vi.fn()
    expect(() =>
      completenessHook.applyProgressMutateCompleteness(
        {
          next,
          record: recordGet({
            notes: "Notes",
            site_photo: [],
            from_pct: 0,
            to_pct: 10,
          }),
        },
        true
      )
    ).toThrow(/Site photo is required/)
    expect(next).not.toHaveBeenCalled()
  })

  it("should call next when progress update keeps on-record site photo", () => {
    const next = vi.fn()
    completenessHook.applyProgressMutateCompleteness(
      {
        next,
        record: recordGet({
          notes: "Scalar edit",
          site_photo: ["kept.jpg"],
          to_pct: 40,
        }),
      },
      false
    )
    expect(next).toHaveBeenCalledOnce()
  })

  it("should throw BadRequestError when nested expense omits description", () => {
    const next = vi.fn()
    expect(() =>
      completenessHook.applyProgressLinkedExpenseCompleteness({
        next,
        record: recordGet({
          project: "p1",
          progress_update: "pu1",
          amount: 1500,
          year: 2026,
          main_account: "Special Education Fund",
          date: "2026-07-09",
          receipt_number: "OR-1",
          description: "",
        }),
      })
    ).toThrow(/Description is required/)
    expect(next).not.toHaveBeenCalled()
  })
})
