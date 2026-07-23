import type { ProjectRecord } from "../types"

/** Exact copy for release-vs-allocated create failures (all wired paths). */
export const RELEASED_AMOUNT_EXCEEDS_ALLOCATED_MESSAGE =
  "Released amount cannot exceed the allocated budget."

/** Distinct copy when newAmount is not a finite number (not a cap breach). */
export const RELEASED_AMOUNT_INVALID_MESSAGE =
  "Released amount must be a valid number."

/** Defense-in-depth when allocate-save targets a Completed project. */
export const COMPLETED_PROJECT_ALLOCATION_MESSAGE =
  "Cannot allocate budget to a Completed project."

export type ReleasedAmountCreateValidation =
  | { ok: true }
  | {
      ok: false
      message:
        | typeof RELEASED_AMOUNT_EXCEEDS_ALLOCATED_MESSAGE
        | typeof RELEASED_AMOUNT_INVALID_MESSAGE
    }

function sumAmounts(rows: readonly { amount: number }[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0)
}

/**
 * Append-create cap: existing released expenses + newAmount ≤ Σ allocation amounts.
 * Uses allocation amounts only — not projects.total_budget.
 */
export function validateReleasedAmountCreate(input: {
  newAmount: number | string
  existingReleasedAmounts: readonly { amount: number }[]
  allocations: readonly { amount: number }[]
}): ReleasedAmountCreateValidation {
  const allocatedTotal = sumAmounts(input.allocations)
  const existingTotal = sumAmounts(input.existingReleasedAmounts)
  const newAmount = Number(input.newAmount)
  if (
    !Number.isFinite(newAmount) ||
    !Number.isFinite(existingTotal) ||
    !Number.isFinite(allocatedTotal)
  ) {
    return { ok: false, message: RELEASED_AMOUNT_INVALID_MESSAGE }
  }
  if (existingTotal + newAmount > allocatedTotal) {
    return { ok: false, message: RELEASED_AMOUNT_EXCEEDS_ALLOCATED_MESSAGE }
  }
  return { ok: true }
}

export function isEligibleForBudgetAllocation(
  project: Pick<ProjectRecord, "status">
): boolean {
  return project.status !== "Completed"
}

/** Allocate Budget project options — omit Completed only. */
export function filterProjectsForBudgetAllocation<
  T extends Pick<ProjectRecord, "status">,
>(projects: readonly T[]): T[] {
  return projects.filter(isEligibleForBudgetAllocation)
}
