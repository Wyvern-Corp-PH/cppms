import { describe, expect, it } from "vitest"

import {
  computeBudgetSummary,
  computeProjectBudgetBreakdown,
  formatAllocationAmount,
  formatExpenseAmount,
  isExpenseDisplayNegative,
} from "./budget-summary"

describe("computeBudgetSummary (V9)", () => {
  it("aggregates totals across all projects", () => {
    expect(
      computeBudgetSummary(
        [{ total_budget: 1_000_000 }, { total_budget: 500_000 }],
        [{ amount: 400_000 }, { amount: 100_000 }],
        [{ amount: 250_000 }]
      )
    ).toEqual({
      totalBudget: 1_500_000,
      totalAllocated: 500_000,
      totalSpent: 250_000,
      remaining: 1_250_000,
    })
  })
})

describe("computeProjectBudgetBreakdown (V76)", () => {
  it("returns per-project allocated, spent, remaining", () => {
    expect(
      computeProjectBudgetBreakdown(
        [{ id: "p1", name: "Bridge", location: "Tuguegarao", total_budget: 1_000_000 }],
        [{ project: "p1", amount: 400_000 }],
        [{ project: "p1", amount: 250_000 }]
      )
    ).toEqual([
      {
        projectId: "p1",
        name: "Bridge",
        location: "Tuguegarao",
        totalBudget: 1_000_000,
        allocated: 400_000,
        spent: 250_000,
        remaining: 750_000,
        spendPct: 25,
      },
    ])
  })
})

describe("budget amount display (V10)", () => {
  it("marks expenses as negative display values", () => {
    expect(formatExpenseAmount(100_000)).toBe("-100,000")
    expect(isExpenseDisplayNegative(500)).toBe(true)
  })

  it("marks allocations as positive display values", () => {
    expect(formatAllocationAmount(100_000)).toBe("+100,000")
  })
})
