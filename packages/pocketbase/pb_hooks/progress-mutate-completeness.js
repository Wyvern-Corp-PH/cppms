/**
 * Reject progress_updates create/update that omit notes or site photo.
 * Reject progress-linked budget_expenses create missing released-amount fields.
 * Update omit-file keeps on-record site_photo names on the request record (PB merge).
 */

const PROGRESS_FIELDS = ["notes", "site_photo", "from_pct", "to_pct", "project"]
const EXPENSE_FIELDS = [
  "project",
  "amount",
  "year",
  "main_account",
  "sub_account",
  "date",
  "receipt_number",
  "description",
  "progress_update",
]
const MAIN_ACCOUNTS_REQUIRING_SUB_ACCOUNT = new Set([
  "General Fund",
  "Trust Fund",
])

function normalizeProgressFileNames(value) {
  if (value == null || value === "") return []
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .filter(Boolean)
  }
  if (typeof value === "string") return [value]
  return []
}

function effectiveProgressSitePhotos(submitted) {
  return normalizeProgressFileNames(submitted)
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function validateProgressMutateCompleteness(input) {
  const submitted = input.submitted

  if (!trimText(submitted.notes)) {
    return { ok: false, field: "notes", message: "Update notes are required." }
  }

  if (effectiveProgressSitePhotos(submitted.site_photo).length === 0) {
    return {
      ok: false,
      field: "site_photo",
      message: "Site photo is required.",
    }
  }

  if (input.isCreate) {
    const fromPct = Number(submitted.from_pct)
    if (
      submitted.from_pct === undefined ||
      submitted.from_pct === null ||
      submitted.from_pct === "" ||
      !Number.isFinite(fromPct)
    ) {
      return {
        ok: false,
        field: "from_pct",
        message: "Progress from percentage is required.",
      }
    }
  }

  return { ok: true }
}

function validateProgressLinkedExpenseCompleteness(input) {
  const submitted = input.submitted
  if (!trimText(submitted.progress_update)) {
    return { ok: true }
  }

  const amount = Number(submitted.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      field: "amount",
      message: "Amount must be greater than zero.",
    }
  }

  const year = Number(submitted.year)
  if (!Number.isFinite(year)) {
    return { ok: false, field: "year", message: "Funding year is required." }
  }

  if (!trimText(submitted.main_account)) {
    return {
      ok: false,
      field: "main_account",
      message: "Main account is required.",
    }
  }

  const main = trimText(submitted.main_account)
  const sub = trimText(submitted.sub_account)
  if (main === "Others" && !sub) {
    return {
      ok: false,
      field: "sub_account",
      message: "Other purpose is required.",
    }
  }
  if (MAIN_ACCOUNTS_REQUIRING_SUB_ACCOUNT.has(main) && !sub) {
    return {
      ok: false,
      field: "sub_account",
      message: "Sub account is required.",
    }
  }

  if (!trimText(submitted.date)) {
    return { ok: false, field: "date", message: "Expense date is required." }
  }

  if (!trimText(submitted.receipt_number)) {
    return {
      ok: false,
      field: "receipt_number",
      message: "Receipt number is required.",
    }
  }

  if (!trimText(submitted.description)) {
    return {
      ok: false,
      field: "description",
      message: "Description is required.",
    }
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

function applyProgressMutateCompleteness(event, isCreate) {
  const result = validateProgressMutateCompleteness({
    isCreate,
    submitted: recordToObject(event.record, PROGRESS_FIELDS),
  })
  if (!result.ok) {
    throw new BadRequestError(result.message)
  }
  if (typeof event.next === "function") {
    event.next()
  }
}

function applyProgressLinkedExpenseCompleteness(event) {
  const result = validateProgressLinkedExpenseCompleteness({
    submitted: recordToObject(event.record, EXPENSE_FIELDS),
  })
  if (!result.ok) {
    throw new BadRequestError(result.message)
  }
  if (typeof event.next === "function") {
    event.next()
  }
}

module.exports = {
  normalizeProgressFileNames,
  effectiveProgressSitePhotos,
  validateProgressMutateCompleteness,
  validateProgressLinkedExpenseCompleteness,
  applyProgressMutateCompleteness,
  applyProgressLinkedExpenseCompleteness,
}
