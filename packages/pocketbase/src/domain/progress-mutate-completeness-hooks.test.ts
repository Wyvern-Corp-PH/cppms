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
    __hooks: hooksDir,
    require(specifier: string) {
      const base = specifier.split(/[/\\]/).pop() ?? specifier
      return loadHook(base)
    },
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
      app?: {
        findRecordById: (collection: string, id: string) => unknown
        findRecordsByFilter: (
          collection: string,
          filter: string,
          sort: string,
          limit: number,
          offset: number
        ) => unknown[]
      }
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

function progressRow(fields: Record<string, unknown>) {
  return recordGet(fields)
}

function progressLookupApp(options: {
  progress_pct?: unknown
  rows: ReturnType<typeof progressRow>[]
}) {
  return {
    findRecordById() {
      return progressRow({ id: "p1", progress_pct: options.progress_pct })
    },
    findRecordsByFilter() {
      return options.rows
    },
  }
}

function dateTime(iso: string) {
  return {
    string() {
      return iso
    },
  }
}

function expenseRecordFields(overrides: Record<string, unknown> = {}) {
  return {
    project: "p1",
    progress_update: "pu1",
    amount: 1500,
    year: 2026,
    main_account: "Special Education Fund",
    date: dateTime("2026-07-09 00:00:00.000Z"),
    receipt_number: "OR-1",
    description: "Materials",
    ...overrides,
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

  it("should accept progress-linked expense create when receipt is blank", () => {
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
    expect(result).toEqual({ ok: true })
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

  it("should wire budget_expenses update completeness", () => {
    const entry = readFileSync(
      resolve(hooksDir, "progress-mutate-completeness.pb.js"),
      "utf8"
    )
    const updateExpenseHooks = entry.match(
      /onRecordUpdateRequest[\s\S]*?budget_expenses/g
    )
    expect(updateExpenseHooks?.length).toBeGreaterThanOrEqual(1)
    expect(entry).toContain("applyProgressLinkedExpenseCompleteness")
  })

  it("should accept expense date DateTime as filled", () => {
    const next = vi.fn()
    completenessHook.applyProgressLinkedExpenseCompleteness({
      next,
      record: recordGet(expenseRecordFields()),
    })
    expect(next).toHaveBeenCalledOnce()
  })

  it("should reject blank expense date", () => {
    const next = vi.fn()
    expect(() =>
      completenessHook.applyProgressLinkedExpenseCompleteness({
        next,
        record: recordGet(expenseRecordFields({ date: "" })),
      })
    ).toThrow(/Expense date is required/)
    expect(next).not.toHaveBeenCalled()
  })

  it("should reject empty DateTime expense date", () => {
    const next = vi.fn()
    expect(() =>
      completenessHook.applyProgressLinkedExpenseCompleteness({
        next,
        record: recordGet(expenseRecordFields({ date: dateTime("") })),
      })
    ).toThrow(/Expense date is required/)
    expect(next).not.toHaveBeenCalled()
  })

  it("should treat a later updated_at as newer than a later id", () => {
    const next = vi.fn()
    expect(() =>
      completenessHook.applyProgressMutateCompleteness(
        {
          next,
          app: {
            findRecordById() {
              return progressRow({ id: "p1", progress_pct: 10 })
            },
            findRecordsByFilter() {
              return [
                {
                  id: "z-later-id",
                  get(field: string) {
                    if (field === "updated_at") return "2026-01-01 00:00:00.000Z"
                    if (field === "to_pct") return 10
                    return undefined
                  },
                },
                {
                  id: "a-earlier-id",
                  get(field: string) {
                    if (field === "updated_at") return "2026-08-01 00:00:00.000Z"
                    if (field === "to_pct") return 70
                    return undefined
                  },
                },
              ]
            },
          },
          record: recordGet({
            project: "p1",
            notes: "Notes",
            site_photo: ["site.jpg"],
            from_pct: 0,
            to_pct: 20,
          }),
        },
        true
      )
    ).toThrow("Progress cannot be lower than the current value (70%).")
    expect(next).not.toHaveBeenCalled()
  })

  it("should reject create when to_pct is below the newest saved progress", () => {
    const next = vi.fn()
    const findRecordsByFilter = vi.fn(() => [
      progressRow({
        id: "older",
        created: "2026-01-01 00:00:00.000Z",
        to_pct: 80,
      }),
      progressRow({
        id: "newer",
        created: "2026-06-01 00:00:00.000Z",
        to_pct: 40,
      }),
    ])
    expect(() =>
      completenessHook.applyProgressMutateCompleteness(
        {
          next,
          app: {
            findRecordById() {
              return progressRow({ id: "p1", progress_pct: 10 })
            },
            findRecordsByFilter,
          },
          record: recordGet({
            project: "p1",
            notes: "Notes",
            site_photo: ["site.jpg"],
            from_pct: 90,
            to_pct: 20,
          }),
        },
        true
      )
    ).toThrow("Progress cannot be lower than the current value (40%).")
    expect(next).not.toHaveBeenCalled()
  })

  it("should accept create when to_pct equals the newest saved progress", () => {
    const next = vi.fn()
    completenessHook.applyProgressMutateCompleteness(
      {
        next,
        app: progressLookupApp({
          progress_pct: 10,
          rows: [
            progressRow({
              id: "newer",
              created: "2026-06-01 00:00:00.000Z",
              to_pct: 40,
            }),
          ],
        }),
        record: recordGet({
          project: "p1",
          notes: "Notes",
          site_photo: ["site.jpg"],
          from_pct: 0,
          to_pct: 40,
        }),
      },
      true
    )
    expect(next).toHaveBeenCalledOnce()
  })

  it("should accept create at the project percent when no progress rows exist", () => {
    const next = vi.fn()
    completenessHook.applyProgressMutateCompleteness(
      {
        next,
        app: progressLookupApp({ progress_pct: 25, rows: [] }),
        record: recordGet({
          project: "p1",
          notes: "Notes",
          site_photo: ["site.jpg"],
          from_pct: 0,
          to_pct: 25,
        }),
      },
      true
    )
    expect(next).toHaveBeenCalledOnce()
  })

  it("should reject create below the project percent when no progress rows exist", () => {
    const next = vi.fn()
    expect(() =>
      completenessHook.applyProgressMutateCompleteness(
        {
          next,
          app: progressLookupApp({ progress_pct: 25, rows: [] }),
          record: recordGet({
            project: "p1",
            notes: "Notes",
            site_photo: ["site.jpg"],
            from_pct: 99,
            to_pct: 10,
          }),
        },
        true
      )
    ).toThrow("Progress cannot be lower than the current value (25%).")
    expect(next).not.toHaveBeenCalled()
  })

  it("should reject create when the project cannot be read", () => {
    const next = vi.fn()
    const findRecordsByFilter = vi.fn()
    expect(() =>
      completenessHook.applyProgressMutateCompleteness(
        {
          next,
          app: {
            findRecordById() {
              throw new Error("missing")
            },
            findRecordsByFilter,
          },
          record: recordGet({
            project: "missing",
            notes: "Notes",
            site_photo: ["site.jpg"],
            from_pct: 0,
            to_pct: 10,
          }),
        },
        true
      )
    ).toThrow(/could not be read/)
    expect(next).not.toHaveBeenCalled()
    expect(findRecordsByFilter).not.toHaveBeenCalled()
  })

  it("should allow an update that lowers to_pct", () => {
    const next = vi.fn()
    completenessHook.applyProgressMutateCompleteness(
      {
        next,
        app: {
          findRecordById() {
            throw new Error("update must not read the project")
          },
          findRecordsByFilter() {
            throw new Error("update must not list progress")
          },
        },
        record: recordGet({
          project: "p1",
          notes: "Lowered",
          site_photo: ["kept.jpg"],
          to_pct: 10,
        }),
      },
      false
    )
    expect(next).toHaveBeenCalledOnce()
  })

  it("should accept progress-linked expense update when receipt is cleared", () => {
    const next = vi.fn()
    completenessHook.applyProgressLinkedExpenseCompleteness({
      next,
      record: recordGet({
        project: "p1",
        progress_update: "pu1",
        amount: 1500,
        year: 2026,
        main_account: "Special Education Fund",
        date: "2026-07-09",
        receipt_number: "",
        description: "Materials",
      }),
    })
    expect(next).toHaveBeenCalled()
  })
})
