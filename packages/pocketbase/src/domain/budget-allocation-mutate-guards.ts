/** Budget allocation create/update completeness — description + required docs. */

export type BudgetAllocationMutateCompletenessResult =
  | { ok: true }
  | { ok: false; field: string; message: string }

export function normalizeBudgetAllocationFileNames(value: unknown): string[] {
  if (value == null || value === "") return []
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .filter(Boolean)
  }
  if (typeof value === "string") return [value]
  return []
}

/**
 * Effective files that will persist. On update, callers pass the post-merge
 * record value (omit-file keeps on-record names).
 */
export function effectiveBudgetAllocationFiles(submitted: unknown): string[] {
  return normalizeBudgetAllocationFileNames(submitted)
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function requireAttachment(
  submitted: Record<string, unknown>,
  field: string,
  message: string
): BudgetAllocationMutateCompletenessResult | null {
  if (effectiveBudgetAllocationFiles(submitted[field]).length > 0) return null
  return { ok: false, field, message }
}

/** Completeness for budget_allocations create/update (UI + direct API). */
export function validateBudgetAllocationMutateCompleteness(input: {
  isCreate: boolean
  submitted: Record<string, unknown>
}): BudgetAllocationMutateCompletenessResult {
  const submitted = input.submitted

  if (!trimText(submitted.description)) {
    return {
      ok: false,
      field: "description",
      message: "Description is required.",
    }
  }

  const checks: Array<BudgetAllocationMutateCompletenessResult | null> = [
    requireAttachment(submitted, "moa_file", "MOA document is required."),
    requireAttachment(
      submitted,
      "resolution_file",
      "Resolution document is required."
    ),
    requireAttachment(
      submitted,
      "supporting_docs",
      "Supporting documents are required."
    ),
  ]
  for (const result of checks) {
    if (result && !result.ok) return result
  }
  return { ok: true }
}
