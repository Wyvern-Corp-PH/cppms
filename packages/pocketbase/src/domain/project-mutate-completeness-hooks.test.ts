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
  validateProjectMutateCompleteness: (input: {
    role: string | undefined
    isCreate: boolean
    submitted: Record<string, unknown>
  }) => { ok: true } | { ok: false; field: string; message: string }
  applyProjectMutateCompleteness: (
    event: {
      next?: () => void
      hasSuperuserAuth?: () => boolean
      auth?: { get?: (field: string) => unknown; role?: string; collection?: { name: string } }
      record: { get: (field: string) => unknown }
    },
    isCreate: boolean
  ) => void
}>("project-mutate-completeness.js")

function recordGet(fields: Record<string, unknown>) {
  return {
    get(field: string) {
      return fields[field]
    },
  }
}

describe("project-mutate-completeness hook helper", () => {
  it("should reject API project create when moa_file omitted", () => {
    const result = completenessHook.validateProjectMutateCompleteness({
      role: "Province",
      isCreate: true,
      submitted: {
        name: "Road",
        description: "Desc",
        category: "Infrastructure",
        municipality: "Tuguegarao City",
        barangay: "Centro",
        location: "East",
        budget_year: 2026,
        funding_year: 2025,
        fund_source: "Special Education Fund",
        period_of_implementation: "FY 2026",
        moa_file: [],
        resolution_file: ["r.pdf"],
        supporting_docs: ["s.pdf"],
      },
    })
    expect(result).toEqual({
      ok: false,
      field: "moa_file",
      message: "MOA document is required.",
    })
  })

  it("should accept update when required files remain on the record", () => {
    const result = completenessHook.validateProjectMutateCompleteness({
      role: "Province",
      isCreate: false,
      submitted: {
        name: "Road",
        description: "Desc",
        category: "Infrastructure",
        municipality: "Tuguegarao City",
        barangay: "Centro",
        location: "East",
        budget_year: 2026,
        funding_year: 2025,
        fund_source: "Special Education Fund",
        period_of_implementation: "FY 2026",
        moa_file: ["moa.pdf"],
        resolution_file: ["r.pdf"],
        supporting_docs: ["s.pdf"],
      },
    })
    expect(result).toEqual({ ok: true })
  })
})

describe("project-mutate-completeness hook entrypoint", () => {
  it("should wire create and update request hooks", () => {
    const entry = readFileSync(
      resolve(hooksDir, "project-mutate-completeness.pb.js"),
      "utf8"
    )
    expect(entry).toContain("project-mutate-completeness.js")
    expect(entry).toContain("onRecordCreateRequest")
    expect(entry).toContain("onRecordUpdateRequest")
  })

  it("should throw BadRequestError when municipality create omits photos", () => {
    const next = vi.fn()
    expect(() =>
      completenessHook.applyProjectMutateCompleteness(
        {
          next,
          auth: { get: (field: string) => (field === "role" ? "Municipality" : "") },
          record: recordGet({
            status: "Ongoing",
            contractor: "Builder",
            bid_price: 100,
            start_date: "2026-01-01",
            target_end_date: "2026-12-01",
            project_photos: [],
          }),
        },
        true
      )
    ).toThrow(/Project photos are required/)
    expect(next).not.toHaveBeenCalled()
  })

  it("should call next when provincial update keeps on-record documents", () => {
    const next = vi.fn()
    completenessHook.applyProjectMutateCompleteness(
      {
        next,
        auth: { get: (field: string) => (field === "role" ? "Province" : "") },
        record: recordGet({
          name: "Road",
          description: "Desc",
          category: "Infrastructure",
          municipality: "Tuguegarao City",
          barangay: "Centro",
          location: "East",
          budget_year: 2026,
          funding_year: 2025,
          fund_source: "Special Education Fund",
          period_of_implementation: "FY 2026",
          moa_file: ["moa.pdf"],
          resolution_file: ["r.pdf"],
          supporting_docs: ["s.pdf"],
        }),
      },
      false
    )
    expect(next).toHaveBeenCalledOnce()
  })

  it("should throw BadRequestError when actor role is missing", () => {
    const next = vi.fn()
    expect(() =>
      completenessHook.applyProjectMutateCompleteness(
        {
          next,
          record: recordGet({
            name: "Road",
            description: "Desc",
            category: "Infrastructure",
            municipality: "Tuguegarao City",
            barangay: "Centro",
            location: "East",
            budget_year: 2026,
            funding_year: 2025,
            fund_source: "Special Education Fund",
            period_of_implementation: "FY 2026",
            moa_file: ["moa.pdf"],
            resolution_file: ["r.pdf"],
            supporting_docs: ["s.pdf"],
          }),
        },
        false
      )
    ).toThrow(/You cannot update this project/)
    expect(next).not.toHaveBeenCalled()
  })

  it("should accept scalar-only update when files remain on the record", () => {
    const next = vi.fn()
    completenessHook.applyProjectMutateCompleteness(
      {
        next,
        auth: { get: (field: string) => (field === "role" ? "Province" : "") },
        record: {
          get(field: string) {
            const fields: Record<string, unknown> = {
              name: "Road",
              description: "Scalar edit",
              category: "Infrastructure",
              municipality: "Tuguegarao City",
              barangay: "Centro",
              location: "East",
              budget_year: 2026,
              funding_year: 2025,
              fund_source: "Special Education Fund",
              period_of_implementation: "FY 2026",
              moa_file: ["moa.pdf"],
              resolution_file: ["r.pdf"],
              supporting_docs: ["s.pdf"],
            }
            return fields[field]
          },
          originalCopy: {
            get(field: string) {
              const fields: Record<string, unknown> = {
                moa_file: ["moa.pdf"],
                resolution_file: ["r.pdf"],
                supporting_docs: ["s.pdf"],
              }
              return fields[field]
            },
          },
        },
      },
      false
    )
    expect(next).toHaveBeenCalledOnce()
  })
})
