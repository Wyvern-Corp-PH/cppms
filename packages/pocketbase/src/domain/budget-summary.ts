import type {
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  ProjectRecord,
} from "../types"
import { projectLocationDisplayParts } from "./project-filters"

export type BudgetSummary = {
  totalBudget: number
  totalAllocated: number
  totalSpent: number
  remaining: number
}

export type ProjectBudgetBreakdownRow = {
  projectId: string
  name: string
  location?: string
  totalBudget: number
  allocated: number
  spent: number
  remaining: number
  spendPct: number
}

function projectBudgetTotal(project: {
  source_of_fund?: unknown
  total_budget?: number
  bid_price?: number
}): number {
  return project.source_of_fund
    ? project.total_budget ?? 0
    : project.bid_price ?? 0
}

export function computeBudgetSummary(
  projects: readonly Pick<
    ProjectRecord,
    "source_of_fund" | "total_budget" | "bid_price"
  >[],
  allocations: readonly Pick<BudgetAllocationRecord, "amount">[],
  expenses: readonly Pick<BudgetExpenseRecord, "amount">[]
): BudgetSummary {
  const totalBudget = projects.reduce(
    (sum, project) => sum + projectBudgetTotal(project),
    0
  )
  const totalAllocated = allocations.reduce(
    (sum, row) => sum + row.amount,
    0
  )
  const totalSpent = expenses.reduce((sum, row) => sum + row.amount, 0)

  return {
    totalBudget,
    totalAllocated,
    totalSpent,
    // remaining is display-only (bid_price − spent); consumption does not write projects.status
    remaining: totalBudget - totalSpent,
  }
}

export function computeProjectBudgetBreakdown(
  projects: readonly Pick<
    ProjectRecord,
    | "id"
    | "name"
    | "municipality"
    | "barangay"
    | "location"
    | "source_of_fund"
    | "total_budget"
    | "bid_price"
  >[],
  allocations: readonly Pick<BudgetAllocationRecord, "project" | "amount">[],
  expenses: readonly Pick<BudgetExpenseRecord, "project" | "amount">[]
): ProjectBudgetBreakdownRow[] {
  return projects.map((project) => {
    const totalBudget = projectBudgetTotal(project)
    const allocated = allocations
      .filter((row) => row.project === project.id)
      .reduce((sum, row) => sum + row.amount, 0)
    const spent = expenses
      .filter((row) => row.project === project.id)
      .reduce((sum, row) => sum + row.amount, 0)
    const remaining = totalBudget - spent
    const spendPct =
      totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0

    return {
      projectId: project.id,
      name: project.name,
      location: projectLocationDisplayParts(project).join(" · ") || undefined,
      totalBudget,
      allocated,
      spent,
      remaining,
      spendPct,
    }
  })
}

export function formatAllocationAmount(amount: number): string {
  return `+${formatPlainAmount(amount)}`
}

export function formatExpenseAmount(amount: number): string {
  return `-${formatPlainAmount(amount)}`
}

export function isExpenseDisplayNegative(amount: number): boolean {
  return amount > 0
}

function formatPlainAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}
