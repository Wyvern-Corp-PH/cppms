import { describe, expect, it } from "vitest"

import {
  effectiveBudgetAllocationFiles,
  normalizeBudgetAllocationFileNames,
  validateBudgetAllocationMutateCompleteness,
} from "./budget-allocation-mutate-guards"

const allocationComplete = {
  project: "p1",
  amount: 100_000,
  year: 2026,
  date: "2026-07-09",
  description: "FY2026 tranche",
  moa_file: ["moa.pdf"],
  resolution_file: ["res.pdf"],
  supporting_docs: ["sup.pdf"],
}

describe("normalizeBudgetAllocationFileNames", () => {
  it("should treat empty values as no files", () => {
    expect(normalizeBudgetAllocationFileNames(undefined)).toEqual([])
    expect(normalizeBudgetAllocationFileNames(null)).toEqual([])
    expect(normalizeBudgetAllocationFileNames("")).toEqual([])
    expect(normalizeBudgetAllocationFileNames([])).toEqual([])
  })

  it("should accept a single filename string or list", () => {
    expect(normalizeBudgetAllocationFileNames("moa.pdf")).toEqual(["moa.pdf"])
    expect(normalizeBudgetAllocationFileNames(["a.pdf", "b.pdf"])).toEqual([
      "a.pdf",
      "b.pdf",
    ])
  })
})

describe("effectiveBudgetAllocationFiles", () => {
  it("should use submitted names after PocketBase merge", () => {
    expect(effectiveBudgetAllocationFiles(["kept.pdf"])).toEqual(["kept.pdf"])
    expect(effectiveBudgetAllocationFiles([])).toEqual([])
  })
})

describe("validateBudgetAllocationMutateCompleteness", () => {
  it("should reject create when description is blank", () => {
    const result = validateBudgetAllocationMutateCompleteness({
      isCreate: true,
      submitted: { ...allocationComplete, description: "   " },
    })
    expect(result).toEqual({
      ok: false,
      field: "description",
      message: "Description is required.",
    })
  })

  it("should reject create when moa_file is omitted", () => {
    const result = validateBudgetAllocationMutateCompleteness({
      isCreate: true,
      submitted: { ...allocationComplete, moa_file: [] },
    })
    expect(result).toEqual({
      ok: false,
      field: "moa_file",
      message: "MOA document is required.",
    })
  })

  it("should reject create when resolution_file is omitted", () => {
    const result = validateBudgetAllocationMutateCompleteness({
      isCreate: true,
      submitted: { ...allocationComplete, resolution_file: [] },
    })
    expect(result).toEqual({
      ok: false,
      field: "resolution_file",
      message: "Resolution document is required.",
    })
  })

  it("should reject create when supporting_docs are omitted", () => {
    const result = validateBudgetAllocationMutateCompleteness({
      isCreate: true,
      submitted: { ...allocationComplete, supporting_docs: [] },
    })
    expect(result).toEqual({
      ok: false,
      field: "supporting_docs",
      message: "Supporting documents are required.",
    })
  })

  it("should accept complete create", () => {
    const result = validateBudgetAllocationMutateCompleteness({
      isCreate: true,
      submitted: allocationComplete,
    })
    expect(result).toEqual({ ok: true })
  })

  it("should accept update when documents remain on the record", () => {
    const result = validateBudgetAllocationMutateCompleteness({
      isCreate: false,
      submitted: {
        ...allocationComplete,
        description: "Scalar edit",
        moa_file: ["moa-on-record.pdf"],
        resolution_file: ["res-on-record.pdf"],
        supporting_docs: ["sup-on-record.pdf"],
      },
    })
    expect(result).toEqual({ ok: true })
  })

  it("should reject update when a required document is cleared and none remain", () => {
    const result = validateBudgetAllocationMutateCompleteness({
      isCreate: false,
      submitted: {
        ...allocationComplete,
        moa_file: [],
        resolution_file: ["res-on-record.pdf"],
        supporting_docs: ["sup-on-record.pdf"],
      },
    })
    expect(result).toEqual({
      ok: false,
      field: "moa_file",
      message: "MOA document is required.",
    })
  })

  it("should accept scalar-only update of a complete allocation", () => {
    const result = validateBudgetAllocationMutateCompleteness({
      isCreate: false,
      submitted: {
        project: "p1",
        amount: 90_000,
        year: 2026,
        date: "2026-07-09",
        description: "Notes only",
        moa_file: ["kept-moa.pdf"],
        resolution_file: ["kept-res.pdf"],
        supporting_docs: ["kept-sup.pdf"],
      },
    })
    expect(result).toEqual({ ok: true })
  })
})
