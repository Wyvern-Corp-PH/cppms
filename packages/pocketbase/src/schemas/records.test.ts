import { describe, expect, it } from "vitest"

import {
  activityLogRecordSchema,
  approvalActionRecordSchema,
  budgetAllocationRecordSchema,
  budgetExpenseRecordSchema,
  budgetFundOptionRecordSchema,
  locationRecordSchema,
  progressUpdateRecordSchema,
  projectRecordSchema,
  recordSchemas,
  userRecordSchema,
} from "./records"

const base = {
  id: "rec1",
  collectionId: "col1",
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-01T00:00:00.000Z",
}

describe("collection record schemas (V33, V36)", () => {
  it("exports account, location, audit, and module collection schemas", () => {
    expect(Object.keys(recordSchemas)).toEqual([
      "users",
      "projects",
      "budget_allocations",
      "budget_expenses",
      "budget_fund_sources",
      "budget_funding_years",
      "budget_fund_main_accounts",
      "budget_fund_sub_accounts",
      "project_status_options",
      "project_category_options",
      "user_role_options",
      "user_account_status_options",
      "progress_updates",
      "approval_actions",
      "locations",
      "activity_logs",
    ])
  })

  it("parses a valid project record", () => {
    const result = projectRecordSchema.safeParse({
      ...base,
      name: "Bridge repair",
      category: "Infrastructure",
      status: "Planning",
      budget_year: 2026,
      municipality: "Tuguegarao City",
      barangay: "Centro 01 (Bagumbayan)",
      location: "Bridge approach, east bank",
      resolution_file: "resolution.pdf",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.municipality).toBe("Tuguegarao City")
      expect(result.data.barangay).toBe("Centro 01 (Bagumbayan)")
      expect(result.data.location).toBe("Bridge approach, east bank")
      expect(result.data.resolution_file).toBe("resolution.pdf")
    }
  })

  it("retains scholarship student counts on project records (V112)", () => {
    const result = projectRecordSchema.safeParse({
      ...base,
      name: "Scholarship batch",
      category: "Scholarship",
      status: "Planning",
      budget_year: 2026,
      number_of_students: 120,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.number_of_students).toBe(120)
    }
  })

  it("parses PB zero-default number_of_students as unset for non-Scholarship rows", () => {
    const result = projectRecordSchema.safeParse({
      ...base,
      name: "Bridge repair",
      category: "Infrastructure",
      status: "Planning",
      budget_year: 2026,
      number_of_students: 0,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.number_of_students).toBeUndefined()
    }
  })

  it("parses PocketBase project rows with empty optional select fields", () => {
    const result = projectRecordSchema.safeParse({
      ...base,
      collectionName: "projects",
      name: "asdas",
      description: "adaw",
      category: "Infrastructure",
      status: "Planning",
      municipality: "",
      barangay: "",
      location: "",
      lgu_level: "",
      contractor: "",
      start_date: "",
      target_end_date: "",
      budget_year: 2026,
      total_budget: 1_000_000,
      moa_file: "",
      resolution_file: "",
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
      resolution_file: "",
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
        resolution_file: "resolution.pdf",
      }).success
    ).toBe(true)

    expect(
      budgetExpenseRecordSchema.safeParse({
        id: "o9jfia8svz2j0rj",
        collectionId: "pbc_2635419501",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 500,
        year: 2026,
        main_account: "General Fund",
        sub_account: "Road materials",
        date: "2026-06-15 00:00:00.000Z",
        receipt_number: "",
        description: "Rebar",
      }).success
    ).toBe(true)
  })

  it("parses Other main account sub account text on budget expense records", () => {
    const result = budgetExpenseRecordSchema.safeParse({
      id: "o9jfia8svz2j0rj",
      collectionId: "pbc_2635419501",
      collectionName: "budget_expenses",
      project: "p1",
      amount: 500,
      year: 2026,
      main_account: "Other",
      sub_account: "Disaster response fund",
      date: "2026-06-15 00:00:00.000Z",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sub_account).toBe("Disaster response fund")
      expect("category" in result.data).toBe(false)
      expect("funding_years" in result.data).toBe(false)
      expect("fund_type" in result.data).toBe(false)
    }
  })

  it("coerces legacy numeric strings from budget records", () => {
    const result = budgetExpenseRecordSchema.safeParse({
      id: "o9jfia8svz2j0rj",
      collectionId: "pbc_2635419501",
      collectionName: "budget_expenses",
      project: "p1",
      amount: "25,000",
      year: "2026",
      main_account: "General Fund",
      sub_account: "20% DF",
      date: "2026-06-15 00:00:00.000Z",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.amount).toBe(25_000)
      expect(result.data.year).toBe(2026)
    }
  })

  it("parses Budget fund dropdown option records", () => {
    const result = budgetFundOptionRecordSchema.safeParse({
      id: "fs1",
      collectionId: "pbc_budget_fund_sources",
      collectionName: "budget_fund_sources",
      name: "Special Education Fund",
      active: true,
      sort_order: 2,
    })

    expect(result.success).toBe(true)
  })

  it("parses Budget sub account option records with a parent main account", () => {
    const result = budgetFundOptionRecordSchema.safeParse({
      id: "sa1",
      collectionId: "pbc_budget_fund_sub_accounts",
      collectionName: "budget_fund_sub_accounts",
      main_account: "General Fund",
      name: "20% DF",
      active: true,
      sort_order: 2,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.main_account).toBe("General Fund")
    }
  })

  it("parses progress update and approval action records", () => {
    const progress = progressUpdateRecordSchema.safeParse({
      ...base,
      project: "p1",
      from_pct: 0,
      to_pct: 100,
      site_photo: "photo.jpg",
      certification_completion: "certification.pdf",
      certificate_acceptance: "acceptance.pdf",
      proof_payment_barangay: "payment.pdf",
      acknowledgment_completion: "acknowledgment.pdf",
      audit_documents: ["audit.pdf"],
      verification_documents: ["verification.pdf"],
      liquidation_documents: ["liquidation.pdf"],
    })
    expect(progress.success).toBe(true)
    if (progress.success) {
      expect(progress.data.site_photo).toEqual(["photo.jpg"])
      expect(progress.data.audit_documents).toEqual(["audit.pdf"])
    }

    expect(
      approvalActionRecordSchema.safeParse({
        ...base,
        project: "p1",
        action: "approve",
        authority_name: "Provincial Engineer",
      }).success
    ).toBe(true)
  })

  it("parses empty progress update site photo shapes", () => {
    for (const site_photo of ["", null, undefined, []]) {
      const progress = progressUpdateRecordSchema.safeParse({
        ...base,
        project: "p1",
        from_pct: 0,
        to_pct: 50,
        site_photo,
      })

      expect(progress.success).toBe(true)
      if (progress.success) {
        expect(progress.data.site_photo).toEqual([])
      }
    }
  })

  it("parses user, location, and activity log records (V115, V123, V127)", () => {
    expect(
      userRecordSchema.safeParse({
        ...base,
        collectionName: "users",
        email: "super@example.test",
        name: "Super Admin",
        role: "Super Admin",
        account_status: "Active",
      }).success
    ).toBe(true)

    expect(
      locationRecordSchema.safeParse({
        ...base,
        collectionName: "locations",
        name: "Tuguegarao City",
        slug: "tuguegarao-city",
        level: "Municipality",
        municipality_name: "Tuguegarao City",
        municipality_slug: "tuguegarao-city",
        active: true,
      }).success
    ).toBe(true)

    expect(
      locationRecordSchema.safeParse({
        ...base,
        collectionName: "locations",
        name: "Tuguegarao City / Centro 01 (Bagumbayan)",
        slug: "tuguegarao-city/centro-01-bagumbayan",
        level: "Barangay",
        municipality_name: "Tuguegarao City",
        municipality_slug: "tuguegarao-city",
        barangay_name: "Centro 01 (Bagumbayan)",
        active: true,
      }).success
    ).toBe(true)

    const legacyLocation = locationRecordSchema.safeParse({
      ...base,
      collectionName: "locations",
      name: "Tuguegarao City",
      slug: "tuguegarao-city",
      level: "",
      active: true,
    })
    expect(legacyLocation.success).toBe(true)
    if (legacyLocation.success) {
      expect(legacyLocation.data.level).toBeUndefined()
    }

    expect(
      activityLogRecordSchema.safeParse({
        ...base,
        collectionName: "activity_logs",
        actor_user: "u1",
        actor_role: "Super Admin",
        actor_municipality: "Tuguegarao City",
        actor_barangay: "Centro 01",
        action: "update",
        resource: "projects",
        resource_id: "p1",
        policy_key: "projects.update",
        outcome: "success",
        duration_ms: 12,
        request_id: "req_1",
        env: { version: "test" },
      }).success
    ).toBe(true)
  })
})
