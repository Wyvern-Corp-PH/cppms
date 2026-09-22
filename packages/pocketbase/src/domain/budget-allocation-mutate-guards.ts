/** Budget allocation create/update completeness — description + required docs. */

import { normalizeFileNames } from "./normalize-file-names"

export type BudgetAllocationMutateCompletenessResult =
  | { ok: true }
  | { ok: false; field: string; message: string }

export function normalizeBudgetAllocationFileNames(value: unknown): string[] {
  return normalizeFileNames(value)
}

/**
 * Effective files that will persist.
 * Absent field on update keeps original; explicit "" / [] clears.
 */
export function effectiveBudgetAllocationFiles(
  submitted: unknown,
  original?: unknown
): string[] {
  if (submitted === undefined || submitted === null) {
    return normalizeFileNames(original)
  }
  return normalizeFileNames(submitted)
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function requireAttachment(
  submitted: Record<string, unknown>,
  original: Record<string, unknown> | null | undefined,
  field: string,
  message: string
): BudgetAllocationMutateCompletenessResult | null {
  if (
    effectiveBudgetAllocationFiles(submitted[field], original?.[field]).length >
    0
  ) {
    return null
  }
  return { ok: false, field, message }
}

/** Completeness for budget_allocations create/update (UI + direct API). */
export function validateBudgetAllocationMutateCompleteness(input: {
  isCreate: boolean
  submitted: Record<string, unknown>
  original?: Record<string, unknown> | null
}): BudgetAllocationMutateCompletenessResult {
  const submitted = input.submitted
  const original = input.original

  if (!trimText(submitted.description)) {
    return {
      ok: false,
      field: "description",
      message: "Description is required.",
    }
  }

  const checks: Array<BudgetAllocationMutateCompletenessResult | null> = [
    requireAttachment(submitted, original, "moa_file", "MOA document is required."),
    requireAttachment(
      submitted,
      original,
      "resolution_file",
      "Resolution document is required."
    ),
    requireAttachment(
      submitted,
      original,
      "supporting_docs",
      "Supporting documents are required."
    ),
  ]
  for (const result of checks) {
    if (result && !result.ok) return result
  }
  return { ok: true }
}
