import { describe, expect, it } from "vitest"

import {
  approvalFormSchema,
  budgetExpenseMutateSchema,
  loginFormSchema,
  progressUpdateFormSchema,
  projectMutateSchema,
} from "./forms"
import { fieldErrorsFromZod } from "./parse"

function makeFile(name: string) {
  return new File(["content"], name, { type: "application/pdf" })
}

describe("loginFormSchema (V35, V15)", () => {
  it("rejects invalid email", () => {
    const result = loginFormSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).email).toBeTruthy()
    }
  })
})

describe("projectMutateSchema (V34)", () => {
  it("requires a project name", () => {
    const result = projectMutateSchema.safeParse({
      name: "",
      category: "Infrastructure",
      status: "Planning",
      budget_year: 2026,
    })
    expect(result.success).toBe(false)
  })

  it("requires number of students for Scholarship projects (V112)", () => {
    const result = projectMutateSchema.safeParse({
      name: "Scholarship batch",
      category: "Scholarship",
      status: "Planning",
      budget_year: 2026,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).number_of_students).toMatch(
        /students/i
      )
    }
  })

  it("accepts municipality, barangay, and free-form location as separate project fields", () => {
    const result = projectMutateSchema.safeParse({
      name: "Bridge repair",
      category: "Infrastructure",
      status: "Planning",
      budget_year: 2026,
      municipality: "Tuguegarao City",
      barangay: "Centro 01 (Bagumbayan)",
      location: "East bank approach",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
        location: "East bank approach",
      })
    }
  })
})

describe("approvalFormSchema (V5, V35)", () => {
  it("requires reason on reject", () => {
    const result = approvalFormSchema.safeParse({
      action: "reject",
      authority_name: "Governor",
      reason: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).reason).toMatch(/required/i)
    }
  })

  it("accepts approve with authority name only", () => {
    const result = approvalFormSchema.safeParse({
      action: "approve",
      authority_name: "Governor",
    })
    expect(result.success).toBe(true)
  })
})

describe("budgetExpenseMutateSchema (V34, V157)", () => {
  it("accepts fund source fields without a category", () => {
    const result = budgetExpenseMutateSchema.safeParse({
      project: "p1",
      amount: "25000",
      fund_source: "General Fund",
      funding_years: "2026",
      fund_type: "Local",
      date: "2026-06-24",
      receipt_number: "OR-1",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
      })
      expect("category" in result.data).toBe(false)
    }
  })

  it("requires manual fund type text when fund type is Other", () => {
    const result = budgetExpenseMutateSchema.safeParse({
      project: "p1",
      amount: "25000",
      fund_source: "General Fund",
      funding_years: "2026",
      fund_type: "Other",
      fund_type_other: "",
      date: "2026-06-24",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).fund_type_other).toMatch(/required/i)
    }
  })
})

describe("progressUpdateFormSchema (V6, V35)", () => {
  it("requires a site photo file", () => {
    const result = progressUpdateFormSchema.safeParse({
      projectId: "1",
      toPct: 50,
      sitePhoto: undefined,
    })
    expect(result.success).toBe(false)
  })

  it("requires all completion documents when progress reaches 100% (V110)", () => {
    const result = progressUpdateFormSchema.safeParse({
      projectId: "1",
      toPct: 100,
      sitePhoto: makeFile("site.jpg"),
      completionDocs: {
        certification_completion: makeFile("certification.pdf"),
        certificate_acceptance: makeFile("acceptance.pdf"),
        proof_payment_barangay: makeFile("payment.pdf"),
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = fieldErrorsFromZod(result.error)
      expect(errors.acknowledgment_completion).toMatch(/required/i)
      expect(errors.audit_documents).toMatch(/required/i)
      expect(errors.verification_documents).toMatch(/required/i)
      expect(errors.liquidation_documents).toMatch(/required/i)
    }
  })

  it("ignores empty completion document arrays below 100% progress", () => {
    const result = progressUpdateFormSchema.safeParse({
      projectId: "1",
      toPct: 22,
      sitePhoto: makeFile("site.jpg"),
      completionDocs: {
        certification_completion: null,
        certificate_acceptance: null,
        proof_payment_barangay: null,
        acknowledgment_completion: null,
        audit_documents: [],
        verification_documents: [],
        liquidation_documents: [],
      },
    })

    expect(result.success).toBe(true)
  })

  it("accepts multiple site photos", () => {
    const result = progressUpdateFormSchema.safeParse({
      projectId: "1",
      toPct: 50,
      sitePhoto: [makeFile("site-1.jpg"), makeFile("site-2.jpg")],
    })

    expect(result.success).toBe(true)
  })
})
