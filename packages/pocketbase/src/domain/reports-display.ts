import type {
  BudgetExpenseRecord,
  ProgressUpdateRecord,
  ProjectRecord,
} from "../types"
import type { ProjectBudgetBreakdownRow } from "./budget-summary"
import { formatPhp } from "./format-currency"
import {
  formatDisplayDate,
  formatDisplayDateTime,
} from "./format-display-date"
import { projectLocationDisplayParts } from "./project-filters"
import { resolveDeadlineStatus } from "./deadline-status"
import { displayUserRef } from "./user-display"

export function reportLocation(
  project: Pick<ProjectRecord, "municipality" | "barangay" | "location"> | undefined
): string {
  if (!project) return "—"
  return projectLocationDisplayParts(project).join(" · ") || "—"
}

export function reportLgu(project: Pick<ProjectRecord, "lgu_level"> | undefined): string {
  return project?.lgu_level ?? "—"
}

export function projectSpentAmount(
  expenses: readonly Pick<BudgetExpenseRecord, "project" | "amount">[],
  projectId: string
): number {
  return expenses
    .filter((expense) => expense.project === projectId)
    .reduce((sum, expense) => sum + expense.amount, 0)
}

export function reportProjectRow(project: ProjectRecord) {
  return {
    name: project.name,
    category: project.category,
    status: project.status,
    deadline: resolveDeadlineStatus(
      project.target_end_date,
      project.progress_pct ?? 0
    ),
    lgu: reportLgu(project),
    location: reportLocation(project),
    budget: formatPhp(project.bid_price ?? 0),
    progress: `${project.progress_pct ?? 0}%`,
  }
}

export function reportBudgetRow(
  row: ProjectBudgetBreakdownRow,
  project: ProjectRecord | undefined,
  expenses: readonly Pick<
    BudgetExpenseRecord,
    "project" | "main_account" | "sub_account"
  >[]
) {
  const projectExpenses = expenses.filter(
    (expense) => expense.project === row.projectId
  )
  const mainAccounts = Array.from(
    new Set(projectExpenses.map((expense) => expense.main_account).filter(Boolean))
  )
  const subAccounts = Array.from(
    new Set(projectExpenses.map((expense) => expense.sub_account).filter(Boolean))
  )

  return {
    name: row.name,
    category: project?.category,
    lgu: reportLgu(project),
    location: reportLocation(project),
    totalBudget: formatPhp(row.totalBudget),
    allocated: formatPhp(row.allocated),
    spent: formatPhp(row.spent),
    remaining: formatPhp(row.remaining),
    spendPct: `${row.spendPct}%`,
    main_accounts: mainAccounts.join(", "),
    sub_accounts: subAccounts.join(", "),
  }
}

export function reportProgressRow(
  update: ProgressUpdateRecord,
  project: ProjectRecord | undefined,
  userDisplay: ReadonlyMap<string, string>,
  hasPhoto: boolean
) {
  const change = update.to_pct - update.from_pct
  return {
    project: project?.name,
    category: project?.category,
    lgu: reportLgu(project),
    location: reportLocation(project),
    from: `${update.from_pct}%`,
    to: `${update.to_pct}%`,
    change: `${change >= 0 ? `+${change}` : change}%`,
    photo: hasPhoto ? "Yes" : "No",
    updated_at: formatDisplayDateTime(update.updated_at ?? update.created),
    updated_by: displayUserRef(update.updated_by, userDisplay),
  }
}

export function reportApprovalRow(
  project: ProjectRecord,
  spent: number,
  userDisplay: ReadonlyMap<string, string>
) {
  return {
    name: project.name,
    category: project.category,
    lgu: reportLgu(project),
    location: reportLocation(project),
    status: project.status,
    budget: formatPhp(project.bid_price ?? 0),
    spent: formatPhp(spent),
    savings: formatPhp(Math.max(0, (project.bid_price ?? 0) - spent)),
    approved_at: project.approved_at
      ? formatDisplayDate(project.approved_at)
      : "Pending",
    approved_by: displayUserRef(project.approved_by, userDisplay, "Pending"),
  }
}
