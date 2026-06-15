import { z } from "zod"

import {
  approvalActionSchema,
  expenseCategorySchema,
  lguLevelSchema,
  projectCategorySchema,
  projectStatusSchema,
} from "./enums"

export const loginFormSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

export const projectMutateSchema = z.object({
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
  progress_pct: z.number().min(0).max(100).optional(),
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

export const progressUpdateFormSchema = z.object({
  projectId: z.string().min(1, "Project is required."),
  toPct: z.number().min(0).max(100),
  notes: z.string().optional(),
  sitePhoto: z
    .custom<File>((value) => value instanceof File, "Site photo is required.")
    .refine((file) => file.size > 0, "Site photo is required."),
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
export type BudgetAllocationMutateInput = z.infer<typeof budgetAllocationMutateSchema>
export type BudgetExpenseMutateInput = z.infer<typeof budgetExpenseMutateSchema>
export type ProgressUpdateFormInput = z.infer<typeof progressUpdateFormSchema>
export type ApprovalFormInput = z.infer<typeof approvalFormSchema>
