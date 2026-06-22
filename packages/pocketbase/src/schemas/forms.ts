import { z } from "zod"

import {
  approvalActionSchema,
  expenseCategorySchema,
  lguLevelSchema,
  projectCategorySchema,
  projectStatusSchema,
} from "./enums"

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
  (value) => (Array.isArray(value) && value.length === 0 ? undefined : value),
  uploadedFileListSchema.optional()
)

const optionalUploadedFileSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  uploadedFileSchema.optional()
)

export const REQUIRED_COMPLETION_DOCUMENTS = [
  {
    field: "certification_completion",
    label: "Certification of Completion",
    multiple: false,
  },
  {
    field: "certificate_acceptance",
    label: "Certificate of Acceptance",
    multiple: false,
  },
  {
    field: "proof_payment_barangay",
    label: "Proof of Payment from Barangay",
    multiple: false,
  },
  {
    field: "acknowledgment_completion",
    label: "Acknowledgment of Completion",
    multiple: false,
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
  certification_completion: optionalUploadedFileSchema,
  certificate_acceptance: optionalUploadedFileSchema,
  proof_payment_barangay: optionalUploadedFileSchema,
  acknowledgment_completion: optionalUploadedFileSchema,
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
})

export const budgetExpenseMutateSchema = z.object({
  project: z.string().min(1, "Project is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  category: expenseCategorySchema,
  date: z.string().min(1),
  receipt_number: z.string().optional(),
  description: z.string().optional(),
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
          message: doc.multiple
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
    if (value.action === "reject" && !value.reason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Rejection reason is required.",
      })
    }
  })

export type LoginFormInput = z.infer<typeof loginFormSchema>
export type ProjectMutateInput = z.infer<typeof projectMutateSchema>
export type BudgetAllocationMutateInput = z.infer<
  typeof budgetAllocationMutateSchema
>
export type BudgetExpenseMutateInput = z.infer<typeof budgetExpenseMutateSchema>
export type ProgressUpdateFormInput = z.infer<typeof progressUpdateFormSchema>
export type ApprovalFormInput = z.infer<typeof approvalFormSchema>
