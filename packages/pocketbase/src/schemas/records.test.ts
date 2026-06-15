import { describe, expect, it } from "vitest"

import {
  approvalActionRecordSchema,
  budgetAllocationRecordSchema,
  budgetExpenseRecordSchema,
  progressUpdateRecordSchema,
  projectRecordSchema,
  recordSchemas,
} from "./records"

const base = {
  id: "rec1",
  collectionId: "col1",
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-01T00:00:00.000Z",
}

describe("collection record schemas (V33, V36)", () => {
  it("exports all five collection schemas", () => {
    expect(Object.keys(recordSchemas)).toEqual([
      "projects",
      "budget_allocations",
      "budget_expenses",
      "progress_updates",
      "approval_actions",
    ])
  })

  it("parses a valid project record", () => {
    const result = projectRecordSchema.safeParse({
      ...base,
      name: "Bridge repair",
      category: "Infrastructure",
      status: "Planning",
      budget_year: 2026,
    })
    expect(result.success).toBe(true)
  })

  it("parses PocketBase project rows with empty optional select fields", () => {
    const result = projectRecordSchema.safeParse({
      ...base,
      collectionName: "projects",
      name: "asdas",
      description: "adaw",
      category: "Infrastructure",
      status: "Planning",
      location: "",
      lgu_level: "",
      contractor: "",
      start_date: "",
      target_end_date: "",
      budget_year: 2026,
      total_budget: 1_000_000,
      moa_file: "",
      agreement_file: "",
      supporting_docs: [],
      progress_pct: 0,
      approval_status: "",
      approved_at: "",
      approved_by: "",
      rejection_reason: "",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.approval_status).toBeUndefined()
      expect(result.data.lgu_level).toBeUndefined()
    }
  })

  it("parses PocketBase list API rows without created/updated timestamps", () => {
    const result = projectRecordSchema.safeParse({
      id: "afu37rf2ozro79v",
      collectionId: "pbc_484305853",
      collectionName: "projects",
      name: "Demo: Tuguegarao Bridge Rehabilitation",
      description: "Structural repairs",
      category: "Infrastructure",
      status: "Ongoing",
      location: "Tuguegarao City",
      lgu_level: "Municipality",
      contractor: "Cagayan Builders Consortium",
      start_date: "2026-01-15 00:00:00.000Z",
      target_end_date: "2026-12-31 00:00:00.000Z",
      budget_year: 2026,
      total_budget: 15_000_000,
      progress_pct: 62,
      moa_file: "",
      agreement_file: "",
      supporting_docs: [],
      approval_status: "",
      approved_at: "",
      approved_by: "",
      rejection_reason: "",
    })
    expect(result.success).toBe(true)
  })

  it("parses budget allocation and expense records", () => {
    expect(
      budgetAllocationRecordSchema.safeParse({
        ...base,
        project: "p1",
        amount: 1000,
        year: 2026,
        date: "2026-06-01",
      }).success
    ).toBe(true)

    expect(
      budgetExpenseRecordSchema.safeParse({
        id: "o9jfia8svz2j0rj",
        collectionId: "pbc_2635419501",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 500,
        category: "Materials",
        date: "2026-06-15 00:00:00.000Z",
        receipt_number: "",
        description: "Rebar",
      }).success
    ).toBe(true)
  })

  it("parses progress update and approval action records", () => {
    expect(
      progressUpdateRecordSchema.safeParse({
        ...base,
        project: "p1",
        from_pct: 0,
        to_pct: 50,
        site_photo: "photo.jpg",
      }).success
    ).toBe(true)

    expect(
      approvalActionRecordSchema.safeParse({
        ...base,
        project: "p1",
        action: "approve",
        authority_name: "Provincial Engineer",
      }).success
    ).toBe(true)
  })
})
