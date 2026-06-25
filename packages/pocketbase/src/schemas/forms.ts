import { z } from "zod"

import {
  accountStatusSchema,
  approvalActionSchema,
  lguLevelSchema,
  projectCategorySchema,
  projectStatusSchema,
  roleSchema,
} from "@workspace/pocketbase/schemas/enums"

const uploadedFileSchema = z
  .custom<File>((value) => value instanceof File, "File is required.")
  .refine((file) => file.size > 0, "File is required.")

const uploadedFileListSchema = z
  .array(uploadedFileSchema)
  .min(1, "At least one file is required.")

const sitePhotoListSchema = z.preprocess(
  (value) => (value instanceof File ? [value] : value),
  z.array(uploadedFileSchema).min(1, "Site photo is required.")
)

const optionalUploadedFileListSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined
    if (value instanceof File) return [value]
    if (Array.isArray(value) && value.length === 0) return undefined
    return value
  },
  uploadedFileListSchema.optional()
)

export const REQUIRED_COMPLETION_DOCUMENTS = [
  {
    field: "certification_completion",
    label: "Certification of Completion",
    multiple: true,
  },
  {
    field: "certificate_acceptance",
    label: "Certificate of Acceptance",
    multiple: true,
  },
  {
    field: "proof_payment_barangay",
    label: "Proof of Payment from Barangay",
    multiple: true,
  },
  {
    field: "acknowledgment_completion",
    label: "Acknowledgment of Completion",
    multiple: true,
  },
  {
    field: "audit_documents",
    label: "Audit Documents",
    multiple: true,
  },
  {
    field: "verification_documents",
    label: "Verification Documents",
    multiple: true,
  },
  {
    field: "liquidation_documents",
    label: "Liquidation Documents",
    multiple: true,
  },
] as const

export type CompletionDocumentField =
  (typeof REQUIRED_COMPLETION_DOCUMENTS)[number]["field"]

const completionDocsSchema = z.object({
  certification_completion: optionalUploadedFileListSchema,
  certificate_acceptance: optionalUploadedFileListSchema,
  proof_payment_barangay: optionalUploadedFileListSchema,
  acknowledgment_completion: optionalUploadedFileListSchema,
  audit_documents: optionalUploadedFileListSchema,
  verification_documents: optionalUploadedFileListSchema,
  liquidation_documents: optionalUploadedFileListSchema,
})

export const loginFormSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

export const projectMutateSchema = z
  .object({
    name: z.string().trim().min(1, "Project name is required."),
    description: z.string().optional(),
    category: projectCategorySchema,
    status: projectStatusSchema,
    municipality: z.string().optional(),
    barangay: z.string().optional(),
    location: z.string().optional(),
    lgu_level: lguLevelSchema.optional(),
    contractor: z.string().optional(),
    start_date: z.string().optional(),
    target_end_date: z.string().optional(),
    budget_year: z.coerce.number().int().min(2000).max(2100),
    total_budget: z.coerce.number().min(0).optional(),
    number_of_students: z.coerce.number().int().positive().optional(),
    progress_pct: z.number().min(0).max(100).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.category === "Scholarship" && !value.number_of_students) {
      ctx.addIssue({
        code: "custom",
        path: ["number_of_students"],
        message: "Number of students is required for Scholarship projects.",
      })
    }
  })

export const budgetAllocationMutateSchema = z.object({
  project: z.string().min(1, "Project is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  year: z.coerce.number().int().min(2000).max(2100),
  date: z.string().min(1),
  description: z.string().optional(),
  allocated_by: z.string().optional(),
})

const mainAccountsRequiringSubAccount = new Set(["General Fund", "Trust Fund"])

export const budgetExpenseMutateSchema = z
  .object({
    project: z.string().min(1, "Project is required."),
    amount: z.coerce.number().positive("Amount must be greater than zero."),
    year: z.coerce.number().int().min(2000).max(2100),
    main_account: z.string().trim().min(1, "Main account is required."),
    sub_account: z.string().optional(),
    date: z.string().min(1),
    receipt_number: z.string().optional(),
    description: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.main_account === "Others" && !value.sub_account?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["sub_account"],
        message: "Other purpose is required.",
      })
    }
    if (
      mainAccountsRequiringSubAccount.has(value.main_account) &&
      !value.sub_account?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["sub_account"],
        message: "Sub account is required.",
      })
    }
  })

export const progressUpdateFormSchema = z
  .object({
    projectId: z.string().min(1, "Project is required."),
    toPct: z.number().min(0).max(100),
    notes: z.string().optional(),
    sitePhoto: sitePhotoListSchema,
    completionDocs: completionDocsSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.toPct < 100) {
      return
    }

    for (const doc of REQUIRED_COMPLETION_DOCUMENTS) {
      const fieldValue = value.completionDocs?.[doc.field]
      const missing = Array.isArray(fieldValue)
        ? fieldValue.length === 0
        : !fieldValue
      if (missing) {
        ctx.addIssue({
          code: "custom",
          path: [doc.field],
          message: doc.label.endsWith("Documents")
            ? `${doc.label} are required.`
            : `${doc.label} is required.`,
        })
      }
    }
  })

export const approvalFormSchema = z
  .object({
    action: approvalActionSchema,
    authority_name: z.string().trim().min(1, "Authority name is required."),
    reason: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.action === "reject" || value.action === "request_revision") &&
      !value.reason?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message:
          value.action === "reject"
            ? "Rejection reason is required."
            : "Revision notes are required.",
      })
    }
  })

export const userAccountFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required."),
    email: z.email("Enter a valid email address."),
    role: roleSchema,
    account_status: accountStatusSchema,
    password: z.string().optional(),
    municipality: z.string().trim().optional().default(""),
    barangay: z.string().trim().optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.password !== undefined && value.password.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Initial password is required.",
      })
    }
    if (
      (value.role === "Municipality" || value.role === "Barangay") &&
      !value.municipality
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["municipality"],
        message: "Municipality is required.",
      })
    }
    if (value.role === "Barangay" && !value.barangay) {
      ctx.addIssue({
        code: "custom",
        path: ["barangay"],
        message: "Barangay is required.",
      })
    }
  })
  .transform((value) => {
    if (value.role === "Super Admin" || value.role === "Province") {
      return { ...value, municipality: "", barangay: "" }
    }
    if (value.role === "Municipality") {
      return { ...value, barangay: "" }
    }
    return value
  })

export type LoginFormInput = z.infer<typeof loginFormSchema>
export type ProjectMutateInput = z.infer<typeof projectMutateSchema>
export type BudgetAllocationMutateInput = z.infer<
  typeof budgetAllocationMutateSchema
>
export type BudgetExpenseMutateInput = z.infer<typeof budgetExpenseMutateSchema>
export type ProgressUpdateFormInput = z.infer<typeof progressUpdateFormSchema>
export type ApprovalFormInput = z.infer<typeof approvalFormSchema>
export type UserAccountFormInput = z.infer<typeof userAccountFormSchema>
