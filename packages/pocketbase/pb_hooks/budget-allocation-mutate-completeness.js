/**
 * Reject budget_allocations create/update that omit description or required docs.
 * Update omit-file keeps on-record names on the request record (PB merge).
 */

const ALLOCATION_FIELDS = [
  "project",
  "amount",
  "year",
  "date",
  "description",
  "moa_file",
  "resolution_file",
  "supporting_docs",
]

function normalizeBudgetAllocationFileNames(value) {
  if (value == null || value === "") return []
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .filter(Boolean)
  }
  if (typeof value === "string") return [value]
  return []
}

function effectiveBudgetAllocationFiles(submitted) {
  return normalizeBudgetAllocationFileNames(submitted)
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function requireAttachment(submitted, field, message) {
  if (effectiveBudgetAllocationFiles(submitted[field]).length > 0) return null
  return { ok: false, field, message }
}

function validateBudgetAllocationMutateCompleteness(input) {
  const submitted = input.submitted

  if (!trimText(submitted.description)) {
    return {
      ok: false,
      field: "description",
      message: "Description is required.",
    }
  }

  const checks = [
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

function recordToObject(record, fields) {
  if (!record) return {}
  const submitted = {}
  for (const field of fields) {
    submitted[field] =
      typeof record.get === "function" ? record.get(field) : record[field]
  }
  return submitted
}

function applyBudgetAllocationMutateCompleteness(event, isCreate) {
  const result = validateBudgetAllocationMutateCompleteness({
    isCreate,
    submitted: recordToObject(event.record, ALLOCATION_FIELDS),
  })
  if (!result.ok) {
    throw new BadRequestError(result.message)
  }
  if (typeof event.next === "function") {
    event.next()
  }
}

module.exports = {
  normalizeBudgetAllocationFileNames,
  effectiveBudgetAllocationFiles,
  validateBudgetAllocationMutateCompleteness,
  applyBudgetAllocationMutateCompleteness,
}
