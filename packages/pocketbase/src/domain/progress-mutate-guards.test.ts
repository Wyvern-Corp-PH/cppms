import { describe, expect, it } from "vitest"

import {
  effectiveProgressSitePhotos,
  normalizeProgressFileNames,
  validateProgressLinkedExpenseCompleteness,
  validateProgressMutateCompleteness,
} from "./progress-mutate-guards"

const progressComplete = {
  notes: "Pouring deck segment B",
  site_photo: ["site.jpg"],
  from_pct: 25,
  to_pct: 40,
}

const expenseComplete = {
  project: "p1",
  progress_update: "pu1",
  amount: 1500,
  year: 2026,
  main_account: "General Fund",
  sub_account: "GF - Proper",
  date: "2026-07-09",
  receipt_number: "OR-1",
  description: "Materials",
}

describe("normalizeProgressFileNames", () => {
  it("should treat empty values as no files", () => {
    expect(normalizeProgressFileNames(undefined)).toEqual([])
    expect(normalizeProgressFileNames(null)).toEqual([])
    expect(normalizeProgressFileNames("")).toEqual([])
    expect(normalizeProgressFileNames([])).toEqual([])
  })

  it("should accept a single filename string or list", () => {
    expect(normalizeProgressFileNames("site.jpg")).toEqual(["site.jpg"])
    expect(normalizeProgressFileNames(["a.jpg", "b.jpg"])).toEqual([
      "a.jpg",
      "b.jpg",
    ])
  })
})

describe("effectiveProgressSitePhotos", () => {
  it("should use submitted names after PocketBase merge", () => {
    expect(effectiveProgressSitePhotos(["kept.jpg"])).toEqual(["kept.jpg"])
    expect(effectiveProgressSitePhotos([])).toEqual([])
  })

  it("should retain original site photo when update omits the field", () => {
    expect(effectiveProgressSitePhotos(undefined, ["old.jpg"])).toEqual([
      "old.jpg",
    ])
  })

  it("should treat an explicit empty submitted set as empty on update", () => {
    expect(effectiveProgressSitePhotos([], ["old.jpg"])).toEqual([])
    expect(effectiveProgressSitePhotos("", ["old.jpg"])).toEqual([])
  })
})

describe("validateProgressMutateCompleteness", () => {
  it("should reject create when update notes are blank", () => {
    const result = validateProgressMutateCompleteness({
      isCreate: true,
      submitted: { ...progressComplete, notes: "   " },
    })
    expect(result).toEqual({
      ok: false,
      field: "notes",
      message: "Update notes are required.",
    })
  })

  it("should reject create when site photo is omitted", () => {
    const result = validateProgressMutateCompleteness({
      isCreate: true,
      submitted: { ...progressComplete, site_photo: [] },
    })
    expect(result).toEqual({
      ok: false,
      field: "site_photo",
      message: "Site photo is required.",
    })
  })

  it("should reject create when from_pct is missing", () => {
    const result = validateProgressMutateCompleteness({
      isCreate: true,
      submitted: {
        notes: progressComplete.notes,
        site_photo: progressComplete.site_photo,
        to_pct: 40,
      },
    })
    expect(result).toEqual({
      ok: false,
      field: "from_pct",
      message: "Progress from percentage is required.",
    })
  })

  it("should accept create when from_pct is zero", () => {
    const result = validateProgressMutateCompleteness({
      isCreate: true,
      submitted: { ...progressComplete, from_pct: 0 },
    })
    expect(result).toEqual({ ok: true })
  })

  it("should accept update when site photo remains on the record", () => {
    const result = validateProgressMutateCompleteness({
      isCreate: false,
      submitted: {
        notes: "Revised notes",
        site_photo: ["site-on-record.jpg"],
        to_pct: 55,
      },
    })
    expect(result).toEqual({ ok: true })
  })

  it("should reject update when site photo is cleared and none remain", () => {
    const result = validateProgressMutateCompleteness({
      isCreate: false,
      submitted: {
        notes: "Revised notes",
        site_photo: [],
        to_pct: 55,
      },
    })
    expect(result).toEqual({
      ok: false,
      field: "site_photo",
      message: "Site photo is required.",
    })
  })

  it("should accept scalar-only update of a complete record", () => {
    const result = validateProgressMutateCompleteness({
      isCreate: false,
      submitted: {
        notes: "Notes only edit",
        site_photo: ["kept.jpg"],
        to_pct: 60,
      },
    })
    expect(result).toEqual({ ok: true })
  })

  it("should accept scalar-only update when site photo is absent but present on original", () => {
    const result = validateProgressMutateCompleteness({
      isCreate: false,
      submitted: {
        notes: "Notes only edit",
        to_pct: 60,
      },
      original: { site_photo: ["kept.jpg"] },
    })
    expect(result).toEqual({ ok: true })
  })

  it("should reject update when site photo is explicitly cleared despite original", () => {
    const result = validateProgressMutateCompleteness({
      isCreate: false,
      submitted: {
        notes: "Cleared photo",
        site_photo: [],
        to_pct: 60,
      },
      original: { site_photo: ["kept.jpg"] },
    })
    expect(result).toEqual({
      ok: false,
      field: "site_photo",
      message: "Site photo is required.",
    })
  })
})

describe("validateProgressLinkedExpenseCompleteness", () => {
  it("should skip when expense is not linked to a progress update", () => {
    const result = validateProgressLinkedExpenseCompleteness({
      submitted: {
        project: "p1",
        amount: 100,
        year: 2026,
        main_account: "Special Education Fund",
        date: "2026-07-09",
      },
    })
    expect(result).toEqual({ ok: true })
  })

  it("should reject progress-linked create when receipt number is blank", () => {
    const result = validateProgressLinkedExpenseCompleteness({
      submitted: { ...expenseComplete, receipt_number: "  " },
    })
    expect(result).toEqual({
      ok: false,
      field: "receipt_number",
      message: "Receipt number is required.",
    })
  })

  it("should reject progress-linked create when description is blank", () => {
    const result = validateProgressLinkedExpenseCompleteness({
      submitted: { ...expenseComplete, description: "" },
    })
    expect(result).toEqual({
      ok: false,
      field: "description",
      message: "Description is required.",
    })
  })

  it("should accept a complete progress-linked expense", () => {
    const result = validateProgressLinkedExpenseCompleteness({
      submitted: expenseComplete,
    })
    expect(result).toEqual({ ok: true })
  })

  it("should reject progress-linked update when receipt number is cleared", () => {
    const result = validateProgressLinkedExpenseCompleteness({
      submitted: { ...expenseComplete, receipt_number: "" },
    })
    expect(result).toEqual({
      ok: false,
      field: "receipt_number",
      message: "Receipt number is required.",
    })
  })
})
