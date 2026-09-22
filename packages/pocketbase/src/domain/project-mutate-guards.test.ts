import { describe, expect, it } from "vitest"

import {
  effectiveProjectFiles,
  normalizeProjectFileNames,
  validateProjectMutateCompleteness,
} from "./project-mutate-guards"

const ppdoComplete = {
  name: "Charter Road",
  description: "Charter encoding",
  category: "Infrastructure",
  municipality: "Tuguegarao City",
  barangay: "Centro 01 (Bagumbayan)",
  location: "Provincial hall",
  budget_year: 2026,
  funding_year: 2025,
  fund_source: "Special Education Fund",
  period_of_implementation: "FY 2026 Q1–Q4",
  moa_file: ["moa.pdf"],
  resolution_file: ["resolution.pdf"],
  supporting_docs: ["support.pdf"],
}

const lguComplete = {
  status: "Ongoing",
  contractor: "Local Builders",
  bid_price: 1_000_000,
  start_date: "2026-06-01",
  target_end_date: "2026-12-01",
  project_photos: ["site.jpg"],
}

describe("normalizeProjectFileNames", () => {
  it("should treat empty values as no files", () => {
    expect(normalizeProjectFileNames(undefined)).toEqual([])
    expect(normalizeProjectFileNames(null)).toEqual([])
    expect(normalizeProjectFileNames("")).toEqual([])
    expect(normalizeProjectFileNames([])).toEqual([])
  })

  it("should accept a single filename string or list", () => {
    expect(normalizeProjectFileNames("moa.pdf")).toEqual(["moa.pdf"])
    expect(normalizeProjectFileNames(["a.pdf", "b.pdf"])).toEqual([
      "a.pdf",
      "b.pdf",
    ])
  })
})

describe("effectiveProjectFiles", () => {
  it("should use submitted names on create and update", () => {
    expect(effectiveProjectFiles(true, ["new.pdf"], [])).toEqual(["new.pdf"])
    expect(effectiveProjectFiles(false, ["kept.pdf"], ["kept.pdf"])).toEqual([
      "kept.pdf",
    ])
  })

  it("should retain original files when update omits the field", () => {
    expect(effectiveProjectFiles(false, undefined, ["old.pdf"])).toEqual([
      "old.pdf",
    ])
    expect(effectiveProjectFiles(false, null, ["old.pdf"])).toEqual(["old.pdf"])
  })

  it("should treat an explicit empty submitted set as empty on update", () => {
    expect(effectiveProjectFiles(false, [], ["old.pdf"])).toEqual([])
    expect(effectiveProjectFiles(false, "", ["old.pdf"])).toEqual([])
  })
})

describe("validateProjectMutateCompleteness", () => {
  it("should reject provincial create when barangay is empty", () => {
    const result = validateProjectMutateCompleteness({
      role: "Province",
      isCreate: true,
      submitted: { ...ppdoComplete, barangay: "" },
    })
    expect(result).toEqual({
      ok: false,
      field: "barangay",
      message: "Barangay is required.",
    })
  })

  it("should reject provincial create when moa_file is omitted", () => {
    const result = validateProjectMutateCompleteness({
      role: "Super Admin",
      isCreate: true,
      submitted: { ...ppdoComplete, moa_file: [] },
    })
    expect(result).toEqual({
      ok: false,
      field: "moa_file",
      message: "MOA document is required.",
    })
  })

  it("should accept provincial update when moa exists on record without new file", () => {
    const result = validateProjectMutateCompleteness({
      role: "Province",
      isCreate: false,
      submitted: { ...ppdoComplete, moa_file: ["moa-on-record.pdf"] },
      original: { moa_file: ["moa-on-record.pdf"] },
    })
    expect(result).toEqual({ ok: true })
  })

  it("should accept scalar-only edit of an already complete provincial project", () => {
    const result = validateProjectMutateCompleteness({
      role: "Province",
      isCreate: false,
      submitted: {
        ...ppdoComplete,
        description: "Updated description",
        moa_file: ["moa.pdf"],
        resolution_file: ["resolution.pdf"],
        supporting_docs: ["support.pdf"],
      },
      original: ppdoComplete,
    })
    expect(result).toEqual({ ok: true })
  })

  it("should accept scalar-only update when files are absent but present on original", () => {
    const result = validateProjectMutateCompleteness({
      role: "Province",
      isCreate: false,
      submitted: {
        name: ppdoComplete.name,
        description: "Updated description",
        category: ppdoComplete.category,
        municipality: ppdoComplete.municipality,
        barangay: ppdoComplete.barangay,
        location: ppdoComplete.location,
        budget_year: ppdoComplete.budget_year,
        funding_year: ppdoComplete.funding_year,
        fund_source: ppdoComplete.fund_source,
        period_of_implementation: ppdoComplete.period_of_implementation,
      },
      original: ppdoComplete,
    })
    expect(result).toEqual({ ok: true })
  })

  it("should reject update when required files are explicitly cleared", () => {
    const result = validateProjectMutateCompleteness({
      role: "Province",
      isCreate: false,
      submitted: {
        ...ppdoComplete,
        moa_file: [],
      },
      original: ppdoComplete,
    })
    expect(result).toEqual({
      ok: false,
      field: "moa_file",
      message: "MOA document is required.",
    })
  })

  it("should reject municipality create when project photos are missing", () => {
    const result = validateProjectMutateCompleteness({
      role: "Municipality",
      isCreate: true,
      submitted: { ...lguComplete, project_photos: [] },
    })
    expect(result).toEqual({
      ok: false,
      field: "project_photos",
      message: "Project photos are required.",
    })
  })

  it("should reject municipality create when contractor is blank", () => {
    const result = validateProjectMutateCompleteness({
      role: "Barangay",
      isCreate: true,
      submitted: { ...lguComplete, contractor: "  " },
    })
    expect(result).toEqual({
      ok: false,
      field: "contractor",
      message: "Contractor is required.",
    })
  })

  it("should accept municipality update when photos exist on record", () => {
    const result = validateProjectMutateCompleteness({
      role: "Municipality",
      isCreate: false,
      submitted: { ...lguComplete, project_photos: ["kept.jpg"] },
      original: { project_photos: ["kept.jpg"] },
    })
    expect(result).toEqual({ ok: true })
  })

  it("should require sub account only for General Fund, Trust Fund, and Others", () => {
    expect(
      validateProjectMutateCompleteness({
        role: "Province",
        isCreate: true,
        submitted: { ...ppdoComplete, fund_source: "General Fund", sub_account: "" },
      })
    ).toMatchObject({ ok: false, field: "sub_account" })

    expect(
      validateProjectMutateCompleteness({
        role: "Province",
        isCreate: true,
        submitted: {
          ...ppdoComplete,
          fund_source: "Special Education Fund",
          sub_account: "",
        },
      })
    ).toEqual({ ok: true })
  })

  it("should reject completeness when actor role is missing", () => {
    expect(
      validateProjectMutateCompleteness({
        role: "",
        isCreate: true,
        submitted: {},
      })
    ).toEqual({
      ok: false,
      field: "role",
      message: "You cannot update this project.",
    })
  })

  it("should skip completeness for unrecognized non-empty roles", () => {
    expect(
      validateProjectMutateCompleteness({
        role: "Auditor",
        isCreate: true,
        submitted: {},
      })
    ).toEqual({ ok: true })
  })
})
