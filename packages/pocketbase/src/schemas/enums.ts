import { z } from "zod"

import {
  ACCOUNT_STATUS,
  APPROVAL_ACTION,
  AUDIT_ACTION,
  FUND_TYPE,
  LGU_LEVEL,
  PROJECT_CATEGORY,
  PROJECT_STATUS,
  ROLE,
} from "../../schema/manifest"

export const projectStatusSchema = z.enum(PROJECT_STATUS)
export const projectCategorySchema = z.enum(PROJECT_CATEGORY)
export const lguLevelSchema = z.enum(LGU_LEVEL)
export const fundTypeSchema = z.enum(FUND_TYPE)
export const approvalActionSchema = z.enum(APPROVAL_ACTION)
export const roleSchema = z.enum(ROLE)
export const accountStatusSchema = z.enum(ACCOUNT_STATUS)
export const auditActionSchema = z.enum(AUDIT_ACTION)
export const approvalStatusSchema = z.enum(["pending", "approved", "rejected"])

export type ProjectStatus = z.infer<typeof projectStatusSchema>
export type ProjectCategory = z.infer<typeof projectCategorySchema>
export type LguLevel = z.infer<typeof lguLevelSchema>
export type FundType = z.infer<typeof fundTypeSchema>
export type ApprovalAction = z.infer<typeof approvalActionSchema>
export type Role = z.infer<typeof roleSchema>
export type AccountStatus = z.infer<typeof accountStatusSchema>
export type AuditAction = z.infer<typeof auditActionSchema>
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>
