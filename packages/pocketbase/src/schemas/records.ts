import { z } from "zod"

import {
  approvalActionSchema,
  approvalStatusSchema,
  auditActionSchema,
  accountStatusSchema,
  expenseCategorySchema,
  lguLevelSchema,
  projectCategorySchema,
  projectStatusSchema,
  roleSchema,
} from "./enums"
import { pbEmptyAsUndefined, pbZeroAsUndefined } from "./coerce"

const pbFileList = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return []
    }
    if (typeof value === "string") {
      return value ? [value] : []
    }
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string")
    }
    return value
  },
  z.array(z.string())
)

export const baseRecordSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  /** PB list/view API may omit system timestamps on custom collections. */
  created: z.string().optional(),
  updated: z.string().optional(),
})

export const projectRecordSchema = baseRecordSchema.extend({
  collectionName: z.literal("projects").optional(),
  name: z.string(),
  description: z.string().optional(),
  category: projectCategorySchema,
  status: projectStatusSchema,
  municipality: pbEmptyAsUndefined(z.string().optional()),
  barangay: pbEmptyAsUndefined(z.string().optional()),
  location: z.string().optional(),
  lgu_level: pbEmptyAsUndefined(lguLevelSchema.optional()),
  contractor: z.string().optional(),
  start_date: z.string().optional(),
  target_end_date: z.string().optional(),
  budget_year: z.number(),
  total_budget: z.number().optional(),
  number_of_students: pbZeroAsUndefined(z.number().int().positive().optional()),
  moa_file: z.string().optional(),
  resolution_file: z.string().optional(),
  supporting_docs: z.array(z.string()).optional(),
  progress_pct: z.number().min(0).max(100).optional(),
  approval_status: pbEmptyAsUndefined(approvalStatusSchema.optional()),
  approved_at: z.string().optional(),
  approved_by: pbEmptyAsUndefined(z.string().optional()),
  rejection_reason: z.string().optional(),
})

export const budgetAllocationRecordSchema = baseRecordSchema.extend({
  collectionName: z.literal("budget_allocations").optional(),
  project: z.string(),
  amount: z.number(),
  year: z.number(),
  description: z.string().optional(),
  date: z.string(),
  allocated_by: pbEmptyAsUndefined(z.string().optional()),
  moa_file: z.string().optional(),
  resolution_file: z.string().optional(),
  supporting_docs: z.array(z.string()).optional(),
})

export const budgetExpenseRecordSchema = baseRecordSchema.extend({
  collectionName: z.literal("budget_expenses").optional(),
  project: z.string(),
  amount: z.number(),
  category: expenseCategorySchema,
  date: z.string(),
  receipt_number: pbEmptyAsUndefined(z.string().optional()),
  description: z.string().optional(),
})

export const progressUpdateRecordSchema = baseRecordSchema.extend({
  collectionName: z.literal("progress_updates").optional(),
  project: z.string(),
  from_pct: z.number().min(0).max(100),
  to_pct: z.number().min(0).max(100),
  notes: z.string().optional(),
  site_photo: pbFileList,
  certification_completion: z.string().optional(),
  certificate_acceptance: z.string().optional(),
  proof_payment_barangay: z.string().optional(),
  acknowledgment_completion: z.string().optional(),
  audit_documents: z.array(z.string()).optional(),
  verification_documents: z.array(z.string()).optional(),
  liquidation_documents: z.array(z.string()).optional(),
  updated_by: pbEmptyAsUndefined(z.string().optional()),
  updated_at: z.string().optional(),
})

export const approvalActionRecordSchema = baseRecordSchema.extend({
  collectionName: z.literal("approval_actions").optional(),
  project: z.string(),
  action: approvalActionSchema,
  authority_name: z.string(),
  reason: z.string().optional(),
  created_at: z.string().optional(),
})

export const userRecordSchema = baseRecordSchema.extend({
  collectionName: z.literal("users").optional(),
  email: z.string(),
  name: z.string().optional(),
  role: roleSchema,
  account_status: accountStatusSchema,
  last_login: z.string().optional(),
})

export const locationRecordSchema = baseRecordSchema.extend({
  collectionName: z.literal("locations").optional(),
  name: z.string(),
  slug: z.string(),
  level: pbEmptyAsUndefined(z.enum(["Municipality", "Barangay"]).optional()),
  municipality_name: z.string().optional(),
  municipality_slug: z.string().optional(),
  barangay_name: z.string().optional(),
  active: z.boolean(),
  sort_order: z.number().optional(),
  created_by: pbEmptyAsUndefined(z.string().optional()),
  updated_by: pbEmptyAsUndefined(z.string().optional()),
})

export const activityLogRecordSchema = baseRecordSchema.extend({
  collectionName: z.literal("activity_logs").optional(),
  actor_user: pbEmptyAsUndefined(z.string().optional()),
  actor_role: roleSchema,
  action: auditActionSchema,
  resource: z.string(),
  resource_id: z.string().optional(),
  policy_key: z.string().optional(),
  target_user: pbEmptyAsUndefined(z.string().optional()),
  before: z.record(z.string(), z.unknown()).optional(),
  after: z.record(z.string(), z.unknown()).optional(),
  outcome: z.enum(["success", "error", "denied"]),
  error: z.string().optional(),
  duration_ms: z.number().min(0),
  request_id: z.string().optional(),
  env: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().optional(),
})

export type ProjectRecord = z.infer<typeof projectRecordSchema> & {
  collectionName?: "projects"
}
export type BudgetAllocationRecord = z.infer<
  typeof budgetAllocationRecordSchema
> & {
  collectionName?: "budget_allocations"
}
export type BudgetExpenseRecord = z.infer<typeof budgetExpenseRecordSchema> & {
  collectionName?: "budget_expenses"
}
export type ProgressUpdateRecord = z.infer<
  typeof progressUpdateRecordSchema
> & {
  collectionName?: "progress_updates"
}
export type ApprovalActionRecord = z.infer<
  typeof approvalActionRecordSchema
> & {
  collectionName?: "approval_actions"
}
export type UserRecord = z.infer<typeof userRecordSchema> & {
  collectionName?: "users"
}
export type LocationRecord = z.infer<typeof locationRecordSchema> & {
  collectionName?: "locations"
}
export type ActivityLogRecord = z.infer<typeof activityLogRecordSchema> & {
  collectionName?: "activity_logs"
}

export const recordSchemas = {
  users: userRecordSchema,
  projects: projectRecordSchema,
  budget_allocations: budgetAllocationRecordSchema,
  budget_expenses: budgetExpenseRecordSchema,
  progress_updates: progressUpdateRecordSchema,
  approval_actions: approvalActionRecordSchema,
  locations: locationRecordSchema,
  activity_logs: activityLogRecordSchema,
} as const

export type CollectionName = keyof typeof recordSchemas
