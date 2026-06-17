import type {
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  ProjectRecord,
} from "../types"

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

export function computeBudgetSummary(
  projects: readonly Pick<ProjectRecord, "total_budget">[],
  allocations: readonly Pick<BudgetAllocationRecord, "amount">[],
  expenses: readonly Pick<BudgetExpenseRecord, "amount">[]
): BudgetSummary {
  const totalBudget = projects.reduce(
    (sum, project) => sum + (project.total_budget ?? 0),
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
    remaining: totalBudget - totalSpent,
  }
}

export function computeProjectBudgetBreakdown(
  projects: readonly Pick<ProjectRecord, "id" | "name" | "location" | "total_budget">[],
  allocations: readonly Pick<BudgetAllocationRecord, "project" | "amount">[],
  expenses: readonly Pick<BudgetExpenseRecord, "project" | "amount">[]
): ProjectBudgetBreakdownRow[] {
  return projects.map((project) => {
    const totalBudget = project.total_budget ?? 0
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
      location: project.location,
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
