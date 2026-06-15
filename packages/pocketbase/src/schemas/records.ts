import { z } from "zod"

import {
  approvalActionSchema,
  approvalStatusSchema,
  expenseCategorySchema,
  lguLevelSchema,
  projectCategorySchema,
  projectStatusSchema,
} from "./enums"
import { pbEmptyAsUndefined } from "./coerce"

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
  location: z.string().optional(),
  lgu_level: pbEmptyAsUndefined(lguLevelSchema.optional()),
  contractor: z.string().optional(),
  start_date: z.string().optional(),
  target_end_date: z.string().optional(),
  budget_year: z.number(),
  total_budget: z.number().optional(),
  moa_file: z.string().optional(),
  agreement_file: z.string().optional(),
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
  agreement_file: z.string().optional(),
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
  site_photo: z.string(),
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

export type ProjectRecord = z.infer<typeof projectRecordSchema> & {
  collectionName?: "projects"
}
export type BudgetAllocationRecord = z.infer<typeof budgetAllocationRecordSchema> & {
  collectionName?: "budget_allocations"
}
export type BudgetExpenseRecord = z.infer<typeof budgetExpenseRecordSchema> & {
  collectionName?: "budget_expenses"
}
export type ProgressUpdateRecord = z.infer<typeof progressUpdateRecordSchema> & {
  collectionName?: "progress_updates"
}
export type ApprovalActionRecord = z.infer<typeof approvalActionRecordSchema> & {
  collectionName?: "approval_actions"
}

export const recordSchemas = {
  projects: projectRecordSchema,
  budget_allocations: budgetAllocationRecordSchema,
  budget_expenses: budgetExpenseRecordSchema,
  progress_updates: progressUpdateRecordSchema,
  approval_actions: approvalActionRecordSchema,
} as const

export type CollectionName = keyof typeof recordSchemas
