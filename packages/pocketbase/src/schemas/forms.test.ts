import { describe, expect, it } from "vitest"

import {
  approvalFormSchema,
  budgetExpenseMutateSchema,
  changePasswordFormSchema,
  loginFormSchema,
  progressUpdateFormSchema,
  progressUpdateWithReleasedAmountFormSchema,
  projectMutateSchema,
  userAccountFormSchema,
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

describe("changePasswordFormSchema (V210)", () => {
  it("rejects mismatched new passwords", () => {
    const result = changePasswordFormSchema.safeParse({
      currentPassword: "TempPass1234",
      password: "newsecret99",
      passwordConfirm: "different99",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).passwordConfirm).toBe(
        "Passwords do not match."
      )
    }
  })

  it("accepts valid password change payloads", () => {
    const result = changePasswordFormSchema.safeParse({
      currentPassword: "TempPass1234",
      password: "newsecret99",
      passwordConfirm: "newsecret99",
    })
    expect(result.success).toBe(true)
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
  it("accepts released amount fund source fields without a category", () => {
    const result = budgetExpenseMutateSchema.safeParse({
      project: "p1",
      amount: "25000",
      year: "2026",
      main_account: "General Fund",
      sub_account: "Road materials",
      date: "2026-06-24",
      receipt_number: "OR-1",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({
        year: 2026,
        main_account: "General Fund",
        sub_account: "Road materials",
      })
      expect("category" in result.data).toBe(false)
      expect("funding_years" in result.data).toBe(false)
      expect("fund_type" in result.data).toBe(false)
    }
  })

  it("requires other-purpose text when main account is Others", () => {
    const result = budgetExpenseMutateSchema.safeParse({
      project: "p1",
      amount: "25000",
      year: "2026",
      main_account: "Others",
      sub_account: "",
      date: "2026-06-24",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).sub_account).toBe(
        "Other purpose is required."
      )
    }
  })

  it("requires sub account when main account has sub accounts", () => {
    const result = budgetExpenseMutateSchema.safeParse({
      project: "p1",
      amount: "25000",
      year: "2026",
      main_account: "General Fund",
      sub_account: "",
      date: "2026-06-24",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).sub_account).toBe(
        "Sub account is required."
      )
    }
  })

  it("accepts Special Education Fund without sub account", () => {
    const result = budgetExpenseMutateSchema.safeParse({
      project: "p1",
      amount: "25000",
      year: "2027",
      main_account: "Special Education Fund",
      date: "2026-06-24",
    })

    expect(result.success).toBe(true)
  })
})

describe("progressUpdateWithReleasedAmountFormSchema (V216)", () => {
  it("requires released amount fields for scoped progress updates", () => {
    const result = progressUpdateWithReleasedAmountFormSchema.safeParse({
      projectId: "1",
      toPct: 50,
      sitePhoto: makeFile("site.jpg"),
      releasedAmount: {
        amount: "",
        year: "2026",
        main_account: "",
        date: "2026-07-09",
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = fieldErrorsFromZod(result.error)
      expect(errors["releasedAmount.amount"]).toMatch(/greater than zero/i)
      expect(errors["releasedAmount.main_account"]).toMatch(/required/i)
    }
  })
})

describe("userAccountFormSchema (V115, V168, V195)", () => {
  const baseInput = {
    name: "Scoped User",
    email: "scoped@example.test",
    account_status: "Active",
    password: "secret123",
  }

  it("requires municipality for Municipality role", () => {
    const result = userAccountFormSchema.safeParse({
      ...baseInput,
      role: "Municipality",
      municipality: "",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).municipality).toBe(
        "Municipality is required."
      )
    }
  })

  it("requires municipality and barangay for Barangay role", () => {
    const result = userAccountFormSchema.safeParse({
      ...baseInput,
      role: "Barangay",
      municipality: "Tuguegarao City",
      barangay: "",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error).barangay).toBe(
        "Barangay is required."
      )
    }
  })

  it("clears scope fields for Province and Super Admin roles", () => {
    const result = userAccountFormSchema.safeParse({
      ...baseInput,
      role: "Province",
      municipality: "Tuguegarao City",
      barangay: "Centro 01 (Bagumbayan)",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.municipality).toBe("")
      expect(result.data.barangay).toBe("")
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

  it("accepts multiple files for each completion document", () => {
    const result = progressUpdateFormSchema.safeParse({
      projectId: "1",
      toPct: 100,
      sitePhoto: [makeFile("site-1.jpg"), makeFile("site-2.jpg")],
      completionDocs: {
        certification_completion: [
          makeFile("certification-1.pdf"),
          makeFile("certification-2.pdf"),
        ],
        certificate_acceptance: [
          makeFile("acceptance-1.pdf"),
          makeFile("acceptance-2.pdf"),
        ],
        proof_payment_barangay: [
          makeFile("payment-1.pdf"),
          makeFile("payment-2.pdf"),
        ],
        acknowledgment_completion: [
          makeFile("acknowledgment-1.pdf"),
          makeFile("acknowledgment-2.pdf"),
        ],
        audit_documents: [makeFile("audit-1.pdf"), makeFile("audit-2.pdf")],
        verification_documents: [
          makeFile("verification-1.pdf"),
          makeFile("verification-2.pdf"),
        ],
        liquidation_documents: [
          makeFile("liquidation-1.pdf"),
          makeFile("liquidation-2.pdf"),
        ],
      },
    })

    expect(result.success).toBe(true)
  })
})
