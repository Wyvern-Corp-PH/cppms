/**
 * Reject budget_allocations create/update that omit description or required docs.
 * Absent file fields on update keep originalCopy names; explicit clear is empty.
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

// tradeoff: JSVM cannot import TS — mirror normalize-file-names.ts; generate hook from TS guard if drift recurs.
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

function effectiveBudgetAllocationFiles(submitted, original) {
  if (submitted === undefined || submitted === null) {
    return normalizeBudgetAllocationFileNames(original)
  }
  return normalizeBudgetAllocationFileNames(submitted)
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function requireAttachment(submitted, original, field, message) {
  if (
    effectiveBudgetAllocationFiles(submitted[field], original?.[field]).length >
    0
  ) {
    return null
  }
  return { ok: false, field, message }
}

function validateBudgetAllocationMutateCompleteness(input) {
  const submitted = input.submitted
  const original = input.original

  if (!trimText(submitted.description)) {
    return {
      ok: false,
      field: "description",
      message: "Description is required.",
    }
  }

  const checks = [
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

function recordToObject(record, fields) {
  if (!record) return {}
  const submitted = {}
  for (const field of fields) {
    submitted[field] =
      typeof record.get === "function" ? record.get(field) : record[field]
  }
  return submitted
}

function originalRecord(record) {
  const original = record?.originalCopy || record?.original
  if (typeof original === "function") return original.call(record)
  return original || null
}

function applyBudgetAllocationMutateCompleteness(event, isCreate) {
  const result = validateBudgetAllocationMutateCompleteness({
    isCreate,
    submitted: recordToObject(event.record, ALLOCATION_FIELDS),
    original: isCreate
      ? null
      : recordToObject(originalRecord(event.record), ALLOCATION_FIELDS),
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
