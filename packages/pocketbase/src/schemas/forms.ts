import { z } from "zod"

import { PASSWORD_MIN_LENGTH } from "@workspace/pocketbase/domain/password-policy"
import {
  accountStatusSchema,
  approvalActionSchema,
  fundTypeSchema,
  lguLevelSchema,
  projectCategorySchema,
  projectStatusSchema,
  roleSchema,
} from "@workspace/pocketbase/schemas/enums"
import { pbEmptyAsUndefined } from "@workspace/pocketbase/schemas/coerce"

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

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    password: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `New password must be at least ${PASSWORD_MIN_LENGTH} characters.`
      ),
    passwordConfirm: z.string().min(1, "Confirm your new password."),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.passwordConfirm) {
      ctx.addIssue({
        code: "custom",
        path: ["passwordConfirm"],
        message: "Passwords do not match.",
      })
    }
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
    fund_source: fundTypeSchema.optional(),
    funding_year: pbEmptyAsUndefined(
      z.coerce.number().int().min(2000).max(2100).optional()
    ),
    sub_account: z.string().optional(),
    period_of_implementation: z.string().optional(),
    bid_price: z.coerce.number().min(0).optional(),
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

const PROJECT_FORM_OWNERS = new Set(["Province", "Super Admin"])
const LGU_DATE_OWNERS = new Set(["Municipality", "Barangay"])
const MAIN_ACCOUNTS_REQUIRING_SUB_ACCOUNT = new Set([
  "General Fund",
  "Trust Fund",
])

const optionalFileListInput = z.preprocess(
  (value) => (value instanceof File ? [value] : (value ?? [])),
  z.array(uploadedFileSchema)
)

function attachmentSatisfied(
  isCreate: boolean,
  files: unknown,
  existingNames: unknown
) {
  const hasNew = Array.isArray(files) && files.length > 0
  if (hasNew) return true
  if (isCreate) return false
  return Array.isArray(existingNames) && existingNames.length > 0
}

function refineBudgetExpenseSubAccount(
  value: { main_account: string; sub_account?: string },
  ctx: z.RefinementCtx
) {
  if (value.main_account === "Others" && !value.sub_account?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["sub_account"],
      message: "Other purpose is required.",
    })
  }
  if (
    MAIN_ACCOUNTS_REQUIRING_SUB_ACCOUNT.has(value.main_account) &&
    !value.sub_account?.trim()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["sub_account"],
      message: "Sub account is required.",
    })
  }
}

function requireTrimmed(
  value: string | undefined,
  path: string,
  message: string,
  ctx: z.RefinementCtx
) {
  if (!value?.trim()) {
    ctx.addIssue({ code: "custom", path: [path], message })
  }
}

export function projectMutateSchemaForActor(
  role: string | undefined,
  isCreate: boolean,
  _options?: { form?: boolean }
) {
  const requirePpdo = PROJECT_FORM_OWNERS.has(role ?? "")
  const requireLgu = LGU_DATE_OWNERS.has(role ?? "")

  if (!requirePpdo && !requireLgu) {
    return projectMutateSchema
  }

  return projectMutateSchema
    .extend({
      moa_file: optionalFileListInput.optional(),
      resolution_file: optionalFileListInput.optional(),
      supporting_docs: optionalFileListInput.optional(),
      project_photos: optionalFileListInput.optional(),
      existing_moa_file: z.array(z.string()).optional(),
      existing_resolution_file: z.array(z.string()).optional(),
      existing_supporting_docs: z.array(z.string()).optional(),
      existing_project_photos: z.array(z.string()).optional(),
    })
    .superRefine((value, ctx) => {
      if (requireLgu) {
        requireTrimmed(value.contractor, "contractor", "Contractor is required.", ctx)
        if (value.bid_price == null || Number(value.bid_price) <= 0) {
          ctx.addIssue({
            code: "custom",
            path: ["bid_price"],
            message: "Bid price is required.",
          })
        }
        requireTrimmed(value.start_date, "start_date", "Start date is required.", ctx)
        requireTrimmed(
          value.target_end_date,
          "target_end_date",
          "End date is required.",
          ctx
        )
        if (
          !attachmentSatisfied(
            isCreate,
            value.project_photos,
            value.existing_project_photos
          )
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["project_photos"],
            message: "Project photos are required.",
          })
        }
      }
      if (!requirePpdo) return
      requireTrimmed(value.description, "description", "Description is required.", ctx)
      requireTrimmed(
        value.municipality,
        "municipality",
        "Municipality is required.",
        ctx
      )
      requireTrimmed(value.barangay, "barangay", "Barangay is required.", ctx)
      requireTrimmed(value.location, "location", "Location is required.", ctx)
      requireTrimmed(
        value.period_of_implementation,
        "period_of_implementation",
        "Period of implementation is required.",
        ctx
      )
      if (value.funding_year == null) {
        ctx.addIssue({
          code: "custom",
          path: ["funding_year"],
          message: "Funding year is required.",
        })
      }
      if (!value.fund_source) {
        ctx.addIssue({
          code: "custom",
          path: ["fund_source"],
          message: "Main account is required.",
        })
      } else {
        refineBudgetExpenseSubAccount(
          { main_account: value.fund_source, sub_account: value.sub_account },
          ctx
        )
      }
      if (
        !attachmentSatisfied(isCreate, value.moa_file, value.existing_moa_file)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["moa_file"],
          message: "MOA document is required.",
        })
      }
      if (
        !attachmentSatisfied(
          isCreate,
          value.resolution_file,
          value.existing_resolution_file
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["resolution_file"],
          message: "Resolution document is required.",
        })
      }
      if (
        !attachmentSatisfied(
          isCreate,
          value.supporting_docs,
          value.existing_supporting_docs
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["supporting_docs"],
          message: "Supporting documents are required.",
        })
      }
    })
    .transform(
      ({
        moa_file: _moa,
        resolution_file: _resolution,
        supporting_docs: _supporting,
        project_photos: _photos,
        existing_moa_file: _existingMoa,
        existing_resolution_file: _existingResolution,
        existing_supporting_docs: _existingSupporting,
        existing_project_photos: _existingPhotos,
        ...rest
      }) => rest
    )
}

/** Requires trimmed non-blank text (mutate forms). */
const requiredTrimmedText = (message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z.string().trim().min(1, message)
  )

const budgetAllocationBaseSchema = z.object({
  project: z.string().min(1, "Project is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  year: z.coerce.number().int().min(2000).max(2100),
  date: z.string().min(1),
  description: requiredTrimmedText("Description is required."),
  allocated_by: z.string().optional(),
  moa_file: optionalFileListInput.optional(),
  resolution_file: optionalFileListInput.optional(),
  supporting_docs: optionalFileListInput.optional(),
  existing_moa_file: z.array(z.string()).optional(),
  existing_resolution_file: z.array(z.string()).optional(),
  existing_supporting_docs: z.array(z.string()).optional(),
})

export function budgetAllocationMutateSchemaForMode(isCreate: boolean) {
  return budgetAllocationBaseSchema
    .superRefine((value, ctx) => {
      if (
        !attachmentSatisfied(isCreate, value.moa_file, value.existing_moa_file)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["moa_file"],
          message: "MOA document is required.",
        })
      }
      if (
        !attachmentSatisfied(
          isCreate,
          value.resolution_file,
          value.existing_resolution_file
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["resolution_file"],
          message: "Resolution document is required.",
        })
      }
      if (
        !attachmentSatisfied(
          isCreate,
          value.supporting_docs,
          value.existing_supporting_docs
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["supporting_docs"],
          message: "Supporting documents are required.",
        })
      }
    })
    .transform(
      ({
        moa_file: _moa,
        resolution_file: _resolution,
        supporting_docs: _supporting,
        existing_moa_file: _existingMoa,
        existing_resolution_file: _existingResolution,
        existing_supporting_docs: _existingSupporting,
        ...rest
      }) => rest
    )
}

/** Allocate dialog is create-only; use ForMode(false) for edit retention. */
export const budgetAllocationMutateSchema =
  budgetAllocationMutateSchemaForMode(true)

const budgetExpenseBaseSchema = z.object({
  project: z.string().min(1, "Project is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  year: z.coerce.number().int().min(2000).max(2100),
  main_account: z.string().trim().min(1, "Main account is required."),
  sub_account: z.string().optional(),
  date: z.string().min(1),
  receipt_number: z.string().optional(),
  description: z.string().optional(),
})

export const budgetExpenseMutateSchema = budgetExpenseBaseSchema.superRefine(
  refineBudgetExpenseSubAccount
)

export const releasedAmountInputSchema = budgetExpenseBaseSchema
  .omit({ project: true })
  .superRefine(refineBudgetExpenseSubAccount)

export const progressReleasedAmountInputSchema = budgetExpenseBaseSchema
  .omit({ project: true })
  .extend({
    receipt_number: requiredTrimmedText("Receipt number is required."),
    description: requiredTrimmedText("Description is required."),
  })
  .superRefine(refineBudgetExpenseSubAccount)

/** Revision soft-base — receipt/description optional until create-or-change refine. */
const progressReleasedAmountRevisionInputSchema = budgetExpenseBaseSchema
  .omit({ project: true })
  .superRefine(refineBudgetExpenseSubAccount)

function coerceReleasedComparable(value: unknown) {
  if (value === undefined || value === null) return ""
  return String(value)
}

function leadingExpenseDate(value: string | undefined) {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return ""
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)
  return match?.[1] ?? trimmed
}

type ReleasedAmountComparable = {
  amount: number
  year: number
  main_account: string
  sub_account?: string
  date: string
  receipt_number?: string
  description?: string
}

/** True when submitted matches latest expense (no new budget_expenses create). */
export function progressReleasedAmountEqualsLatest(
  submitted: ReleasedAmountComparable,
  latest: ReleasedAmountComparable | undefined
) {
  if (!latest) return false
  return (
    Number(submitted.amount) === Number(latest.amount) &&
    Number(submitted.year) === Number(latest.year) &&
    coerceReleasedComparable(submitted.main_account) ===
      coerceReleasedComparable(latest.main_account) &&
    coerceReleasedComparable(submitted.sub_account) ===
      coerceReleasedComparable(latest.sub_account) &&
    leadingExpenseDate(submitted.date) === leadingExpenseDate(latest.date) &&
    coerceReleasedComparable(submitted.receipt_number) ===
      coerceReleasedComparable(latest.receipt_number) &&
    coerceReleasedComparable(submitted.description) ===
      coerceReleasedComparable(latest.description)
  )
}

function refineRequiredReceiptDescription(
  releasedAmount: { receipt_number?: string; description?: string },
  ctx: z.RefinementCtx
) {
  if (!coerceReleasedComparable(releasedAmount.receipt_number).trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["releasedAmount", "receipt_number"],
      message: "Receipt number is required.",
    })
  }
  if (!coerceReleasedComparable(releasedAmount.description).trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["releasedAmount", "description"],
      message: "Description is required.",
    })
  }
}

export const progressUpdateFormSchema = z
  .object({
    projectId: z.string().min(1, "Project is required."),
    toPct: z.number().min(0).max(100),
    notes: requiredTrimmedText("Update notes are required."),
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

export const progressUpdateWithReleasedAmountFormSchema =
  progressUpdateFormSchema.extend({
    releasedAmount: progressReleasedAmountInputSchema,
  })

const revisionSitePhotoListSchema = z.preprocess(
  (value) => (value instanceof File ? [value] : (value ?? [])),
  z.array(uploadedFileSchema)
)

const existingCompletionDocNamesSchema = z
  .object({
    certification_completion: z.array(z.string()).optional(),
    certificate_acceptance: z.array(z.string()).optional(),
    proof_payment_barangay: z.array(z.string()).optional(),
    acknowledgment_completion: z.array(z.string()).optional(),
    audit_documents: z.array(z.string()).optional(),
    verification_documents: z.array(z.string()).optional(),
    liquidation_documents: z.array(z.string()).optional(),
  })
  .optional()

export const progressUpdateRevisionFormSchema = z
  .object({
    projectId: z.string().min(1, "Project is required."),
    toPct: z.number().min(0).max(100),
    notes: requiredTrimmedText("Update notes are required."),
    sitePhoto: revisionSitePhotoListSchema,
    completionDocs: completionDocsSchema.optional(),
    existingSitePhotoNames: z.array(z.string()).optional(),
    existingCompletionDocNames: existingCompletionDocNamesSchema,
  })
  .superRefine((value, ctx) => {
    const hasNewSitePhoto = value.sitePhoto.length > 0
    const hasExistingSitePhoto = (value.existingSitePhotoNames?.length ?? 0) > 0
    if (!hasNewSitePhoto && !hasExistingSitePhoto) {
      ctx.addIssue({
        code: "custom",
        path: ["sitePhoto"],
        message: "Site photo is required.",
      })
    }

    if (value.toPct < 100) {
      return
    }

    for (const doc of REQUIRED_COMPLETION_DOCUMENTS) {
      const fieldValue = value.completionDocs?.[doc.field]
      const hasNew = Array.isArray(fieldValue)
        ? fieldValue.length > 0
        : Boolean(fieldValue)
      const hasExisting =
        (value.existingCompletionDocNames?.[doc.field]?.length ?? 0) > 0
      if (!hasNew && !hasExisting) {
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

export const progressUpdateRevisionWithReleasedAmountFormSchema =
  progressUpdateRevisionFormSchema
    .extend({
      releasedAmount: progressReleasedAmountRevisionInputSchema,
      /** When equal to releasedAmount, blank receipt/description allowed (legacy). */
      latestReleasedAmount: progressReleasedAmountRevisionInputSchema.optional(),
    })
    .superRefine((value, ctx) => {
      if (
        progressReleasedAmountEqualsLatest(
          value.releasedAmount,
          value.latestReleasedAmount
        )
      ) {
        return
      }
      refineRequiredReceiptDescription(value.releasedAmount, ctx)
    })
    .transform(({ latestReleasedAmount: _latest, ...rest }) => rest)

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
      value.password !== undefined &&
      value.password.trim().length > 0 &&
      value.password.length < PASSWORD_MIN_LENGTH
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
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
export type ChangePasswordFormInput = z.infer<typeof changePasswordFormSchema>
export type ProjectMutateInput = z.infer<typeof projectMutateSchema>
export type BudgetAllocationMutateInput = z.infer<
  typeof budgetAllocationMutateSchema
>
export type BudgetExpenseMutateInput = z.infer<typeof budgetExpenseMutateSchema>
export type ProgressUpdateFormInput = z.infer<typeof progressUpdateFormSchema>
export type ProgressUpdateWithReleasedAmountFormInput = z.infer<
  typeof progressUpdateWithReleasedAmountFormSchema
>
export type ProgressUpdateRevisionFormInput = z.infer<
  typeof progressUpdateRevisionFormSchema
>
export type ProgressUpdateRevisionWithReleasedAmountFormInput = z.infer<
  typeof progressUpdateRevisionWithReleasedAmountFormSchema
>
export type ReleasedAmountInput = z.infer<typeof releasedAmountInputSchema>
export type ApprovalFormInput = z.infer<typeof approvalFormSchema>
export type UserAccountFormInput = z.infer<typeof userAccountFormSchema>
