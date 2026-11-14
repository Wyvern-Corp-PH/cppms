/**
 * Reject progress_updates create/update that omit notes or site photo.
 * Reject progress-linked budget_expenses create/update missing released-amount fields.
 * Absent site_photo on update keeps originalCopy names; explicit clear is empty.
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

// tradeoff: JSVM cannot import TS — mirror normalize-file-names.ts; generate hook from TS guard if drift recurs.
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

function effectiveProgressSitePhotos(submitted, original) {
  if (submitted === undefined || submitted === null) {
    return normalizeProgressFileNames(original)
  }
  return normalizeProgressFileNames(submitted)
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function finiteProgressPct(value) {
  if (value === undefined || value === null || value === "") return null
  const pct = typeof value === "number" ? value : Number(value)
  return Number.isFinite(pct) ? pct : null
}

// tradeoff: JSVM cannot import TS — mirror validateProgressNotBelowCurrent.
function validateProgressNotBelowCurrent(input) {
  const toPct = finiteProgressPct(input.toPct)
  if (toPct === null) {
    return {
      ok: false,
      field: "to_pct",
      message: "Progress percentage is required.",
    }
  }
  if (toPct < input.currentPct) {
    return {
      ok: false,
      field: "to_pct",
      message:
        "Progress cannot be lower than the current value (" +
        input.currentPct +
        "%).",
    }
  }
  return { ok: true }
}

function serverProgressCurrent(app, projectId) {
  const id = String(projectId ?? "").trim()
  if (!id || !app || typeof app.findRecordById !== "function") {
    return { ok: false, message: "Project could not be read." }
  }
  let project
  try {
    project = app.findRecordById("projects", id)
  } catch (error) {
    return { ok: false, message: "Project could not be read." }
  }
  if (!project || typeof project.get !== "function") {
    return { ok: false, message: "Project could not be read." }
  }
  // tradeoff: two simultaneous creates can both pass this read-then-write floor; upgrade = unique constraint or transactional check.
  // tradeoff: ceiling is 500 unsorted rows; upgrade is to page the filter. Do not fail the create when that list is truncated.
  let latest = null
  try {
    const sync = require(`${globalThis.__hooks}/sync-project-progress.js`)
    const rows = sync.progressRowsForProject(app, id) || []
    latest = sync.pickLatestProgressUpdate(rows)
  } catch (error) {
    return { ok: false, message: "Project could not be read." }
  }
  const latestTo = latest ? finiteProgressPct(latest.get("to_pct")) : null
  if (latestTo !== null) return { ok: true, currentPct: latestTo }
  const stored = finiteProgressPct(project.get("progress_pct"))
  return { ok: true, currentPct: stored === null ? 0 : stored }
}

function unwrapDateValue(value) {
  if (value && typeof value.string === "function") {
    return String(value.string()).trim()
  }
  return value
}

function validateProgressMutateCompleteness(input) {
  const submitted = input.submitted
  const original = input.original

  if (!trimText(submitted.notes)) {
    return { ok: false, field: "notes", message: "Update notes are required." }
  }

  if (
    effectiveProgressSitePhotos(submitted.site_photo, original?.site_photo)
      .length === 0
  ) {
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
    const currentPct = input.currentPct
    if (typeof currentPct === "number" && Number.isFinite(currentPct)) {
      return validateProgressNotBelowCurrent({
        toPct: submitted.to_pct,
        currentPct,
      })
    }
    if (finiteProgressPct(submitted.to_pct) === null) {
      return {
        ok: false,
        field: "to_pct",
        message: "Progress percentage is required.",
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
    const value =
      typeof record.get === "function" ? record.get(field) : record[field]
    submitted[field] = field === "date" ? unwrapDateValue(value) : value
  }
  return submitted
}

function originalRecord(record) {
  const original = record?.originalCopy || record?.original
  if (typeof original === "function") return original.call(record)
  return original || null
}

function applyProgressMutateCompleteness(event, isCreate) {
  const submitted = recordToObject(event.record, PROGRESS_FIELDS)
  const original = isCreate
    ? null
    : recordToObject(originalRecord(event.record), PROGRESS_FIELDS)
  const shape = validateProgressMutateCompleteness({
    isCreate,
    submitted,
    original,
  })
  if (!shape.ok) {
    throw new BadRequestError(shape.message)
  }
  if (isCreate) {
    const loaded = serverProgressCurrent(event.app, submitted.project)
    if (!loaded.ok) {
      throw new BadRequestError(loaded.message)
    }
    const floor = validateProgressMutateCompleteness({
      isCreate,
      submitted,
      original,
      currentPct: loaded.currentPct,
    })
    if (!floor.ok) {
      throw new BadRequestError(floor.message)
    }
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
