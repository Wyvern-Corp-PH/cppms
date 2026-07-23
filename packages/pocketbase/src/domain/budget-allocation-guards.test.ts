import { describe, expect, it } from "vitest"

import {
  COMPLETED_PROJECT_ALLOCATION_MESSAGE,
  RELEASED_AMOUNT_EXCEEDS_ALLOCATED_MESSAGE,
  RELEASED_AMOUNT_INVALID_MESSAGE,
  filterProjectsForBudgetAllocation,
  isEligibleForBudgetAllocation,
  validateReleasedAmountCreate,
} from "./budget-allocation-guards"

describe("validateReleasedAmountCreate", () => {
  it("should fail when existing plus new amount exceeds allocated", () => {
    const result = validateReleasedAmountCreate({
      newAmount: 60_000,
      existingReleasedAmounts: [{ amount: 50_000 }],
      allocations: [{ amount: 100_000 }],
    })

    expect(result).toEqual({
      ok: false,
      message: RELEASED_AMOUNT_EXCEEDS_ALLOCATED_MESSAGE,
    })
  })

  it("should succeed when existing plus new amount equals allocated", () => {
    const result = validateReleasedAmountCreate({
      newAmount: 50_000,
      existingReleasedAmounts: [{ amount: 50_000 }],
      allocations: [{ amount: 100_000 }],
    })

    expect(result).toEqual({ ok: true })
  })

  it("should succeed when existing plus new amount is under allocated", () => {
    const result = validateReleasedAmountCreate({
      newAmount: 25_000,
      existingReleasedAmounts: [{ amount: 50_000 }],
      allocations: [{ amount: 100_000 }],
    })

    expect(result).toEqual({ ok: true })
  })

  it("should fail any positive create when allocated total is zero", () => {
    const result = validateReleasedAmountCreate({
      newAmount: 1,
      existingReleasedAmounts: [],
      allocations: [],
    })

    expect(result).toEqual({
      ok: false,
      message: RELEASED_AMOUNT_EXCEEDS_ALLOCATED_MESSAGE,
    })
  })

  it("should reject non-finite amounts with distinct invalid message", () => {
    for (const newAmount of [Number.NaN, Number.POSITIVE_INFINITY, "not-a-number"]) {
      const result = validateReleasedAmountCreate({
        newAmount,
        existingReleasedAmounts: [],
        allocations: [{ amount: 100_000 }],
      })

      expect(result).toEqual({
        ok: false,
        message: RELEASED_AMOUNT_INVALID_MESSAGE,
      })
    }
  })

  it("should reject non-finite row amounts in existingReleasedAmounts or allocations", () => {
    const cases = [
      {
        newAmount: 10_000,
        existingReleasedAmounts: [{ amount: Number.NaN }],
        allocations: [{ amount: 100_000 }],
      },
      {
        newAmount: 10_000,
        existingReleasedAmounts: [{ amount: 50_000 }],
        allocations: [{ amount: Number.POSITIVE_INFINITY }],
      },
    ] as const

    for (const input of cases) {
      const result = validateReleasedAmountCreate(input)
      expect(result).toEqual({
        ok: false,
        message: RELEASED_AMOUNT_INVALID_MESSAGE,
      })
    }
  })

  it("should export the exact exceed error string", () => {
    expect(RELEASED_AMOUNT_EXCEEDS_ALLOCATED_MESSAGE).toBe(
      "Released amount cannot exceed the allocated budget."
    )
  })
})

describe("filterProjectsForBudgetAllocation", () => {
  it("should exclude Completed projects and keep others", () => {
    const projects = [
      { id: "a", status: "Ongoing" as const },
      { id: "b", status: "Completed" as const },
      { id: "c", status: "Planning" as const },
      { id: "d", status: "Ready for Review" as const },
    ]

    expect(filterProjectsForBudgetAllocation(projects).map((p) => p.id)).toEqual([
      "a",
      "c",
      "d",
    ])
    expect(isEligibleForBudgetAllocation(projects[1]!)).toBe(false)
    expect(COMPLETED_PROJECT_ALLOCATION_MESSAGE).toBe(
      "Cannot allocate budget to a Completed project."
    )
  })
})
