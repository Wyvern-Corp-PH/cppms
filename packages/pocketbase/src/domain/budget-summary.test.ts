import { describe, expect, it } from "vitest"

import {
  computeBudgetSummary,
  computeProjectBudgetBreakdown,
  formatAllocationAmount,
  formatExpenseAmount,
  isExpenseDisplayNegative,
} from "./budget-summary"

describe("computeBudgetSummary", () => {
  it("should aggregate money from bid_price only", () => {
    expect(
      computeBudgetSummary(
        [
          { bid_price: 1_000_000, total_budget: 9_999_999 },
          { bid_price: 500_000, total_budget: 1 },
        ],
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

  it("should treat missing bid_price as zero without falling back to total_budget", () => {
    expect(
      computeBudgetSummary(
        [{ total_budget: 1_000_000 }],
        [],
        []
      )
    ).toEqual({
      totalBudget: 0,
      totalAllocated: 0,
      totalSpent: 0,
      remaining: 0,
    })
  })
})

describe("computeProjectBudgetBreakdown", () => {
  it("should return per-project allocated, spent, remaining from bid_price", () => {
    expect(
      computeProjectBudgetBreakdown(
        [
          {
            id: "p1",
            name: "Bridge",
            location: "Tuguegarao",
            bid_price: 1_000_000,
            total_budget: 50,
          },
        ],
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
