import {
  projectHasIncompleteAwaitingDetails,
  type ProjectFieldMap,
} from "./project-field-ownership"

/** Exact copy for release-vs-allocated create failures (all wired paths). */
export const RELEASED_AMOUNT_EXCEEDS_ALLOCATED_MESSAGE =
  "Released amount exceeds the project's allocated budget."

/** Distinct copy when newAmount is not a finite number (not a cap breach). */
export const RELEASED_AMOUNT_INVALID_MESSAGE =
  "Released amount must be a valid number."

/** Exact copy for allocation-vs-bid-price create/update failures (all wired paths). */
export const ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE =
  "Allocation amount exceeds the project's bid price."

/** Distinct copy when newAmount is not a finite number (not a cap breach). */
export const ALLOCATION_AMOUNT_INVALID_MESSAGE =
  "Allocation amount must be a valid number."

/** Defense-in-depth when allocate-save targets a Completed project. */
export const COMPLETED_PROJECT_ALLOCATION_MESSAGE =
  "Cannot allocate budget to a Completed project."

/** Defense-in-depth when allocate-save targets incomplete LGU details. */
export const INCOMPLETE_PROJECT_ALLOCATION_MESSAGE =
  "Cannot allocate budget until required project details are complete."

export type ReleasedAmountCreateValidation =
  | { ok: true }
  | {
      ok: false
      message:
        | typeof RELEASED_AMOUNT_EXCEEDS_ALLOCATED_MESSAGE
        | typeof RELEASED_AMOUNT_INVALID_MESSAGE
    }

export type AllocationBidPriceValidation =
  | { ok: true }
  | {
      ok: false
      message:
        | typeof ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE
        | typeof ALLOCATION_AMOUNT_INVALID_MESSAGE
    }

function sumAmounts(rows: readonly { amount: number }[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0)
}

/**
 * Create cap: existing + newAmount ≤ Σ allocations.
 * PATCH: pass replaceOldAmount (bound row) so Σ others + new ≤ Σ allocations.
 * Uses allocation amounts only — not projects.total_budget.
 */
export function validateReleasedAmountCreate(input: {
  newAmount: number | string
  existingReleasedAmounts: readonly { amount: number }[]
  allocations: readonly { amount: number }[]
  replaceOldAmount?: number
}): ReleasedAmountCreateValidation {
  const allocatedTotal = sumAmounts(input.allocations)
  const existingTotal = sumAmounts(input.existingReleasedAmounts)
  const newAmount = Number(input.newAmount)
  const replaceOld =
    input.replaceOldAmount === undefined ? 0 : Number(input.replaceOldAmount)
  if (
    !Number.isFinite(newAmount) ||
    !Number.isFinite(existingTotal) ||
    !Number.isFinite(allocatedTotal) ||
    (input.replaceOldAmount !== undefined && !Number.isFinite(replaceOld))
  ) {
    return { ok: false, message: RELEASED_AMOUNT_INVALID_MESSAGE }
  }
  if (existingTotal - replaceOld + newAmount > allocatedTotal) {
    return { ok: false, message: RELEASED_AMOUNT_EXCEEDS_ALLOCATED_MESSAGE }
  }
  return { ok: true }
}

function bidPriceCap(bidPrice: unknown): number {
  const cap = Number(bidPrice)
  return Number.isFinite(cap) ? cap : 0
}

/**
 * Create cap: existing + newAmount ≤ Bid Price (missing/non-numeric Bid Price = 0).
 * PATCH: pass replaceOldAmount (bound row) so Σ others + new ≤ Bid Price.
 */
export function validateAllocationAgainstBidPrice(input: {
  newAmount: number | string
  existingAllocations: readonly { amount: number }[]
  bidPrice: unknown
  replaceOldAmount?: number
}): AllocationBidPriceValidation {
  const existingTotal = sumAmounts(input.existingAllocations)
  const newAmount = Number(input.newAmount)
  const replaceOld =
    input.replaceOldAmount === undefined ? 0 : Number(input.replaceOldAmount)
  if (
    !Number.isFinite(newAmount) ||
    !Number.isFinite(existingTotal) ||
    (input.replaceOldAmount !== undefined && !Number.isFinite(replaceOld))
  ) {
    return { ok: false, message: ALLOCATION_AMOUNT_INVALID_MESSAGE }
  }
  if (existingTotal - replaceOld + newAmount > bidPriceCap(input.bidPrice)) {
    return { ok: false, message: ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE }
  }
  return { ok: true }
}

export function budgetAllocationIneligibilityMessage(
  project: ProjectFieldMap | null | undefined
): string | null {
  if (project?.status === "Completed") {
    return COMPLETED_PROJECT_ALLOCATION_MESSAGE
  }
  if (projectHasIncompleteAwaitingDetails(project)) {
    return INCOMPLETE_PROJECT_ALLOCATION_MESSAGE
  }
  return null
}

export function isEligibleForBudgetAllocation(
  project: ProjectFieldMap
): boolean {
  return budgetAllocationIneligibilityMessage(project) === null
}

/** Allocate Budget project options — omit Completed and incomplete details. */
export function filterProjectsForBudgetAllocation<
  T extends ProjectFieldMap,
>(projects: readonly T[]): T[] {
  return projects.filter(isEligibleForBudgetAllocation)
}
