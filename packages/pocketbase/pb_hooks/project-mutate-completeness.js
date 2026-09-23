/**
 * Reject projects create/update that omit role-required scalars or attachments.
 * Absent file fields on update keep originalCopy names; explicit clear is empty.
 */

const PPDO_ROLES = new Set(["Province", "Super Admin"])
const LGU_ROLES = new Set(["Municipality", "Barangay"])
const MAIN_ACCOUNTS_REQUIRING_SUB_ACCOUNT = new Set([
  "General Fund",
  "Trust Fund",
])
const PROJECT_FIELDS = [
  "name",
  "description",
  "category",
  "status",
  "municipality",
  "barangay",
  "location",
  "budget_year",
  "fund_source",
  "funding_year",
  "sub_account",
  "period_of_implementation",
  "contractor",
  "bid_price",
  "start_date",
  "target_end_date",
  "moa_file",
  "resolution_file",
  "supporting_docs",
  "project_photos",
]

// tradeoff: JSVM cannot import TS — mirror normalize-file-names.ts; generate hook from TS guard if drift recurs.
function normalizeProjectFileNames(value) {
  if (value == null || value === "") return []
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .filter(Boolean)
  }
  if (typeof value === "string") return [value]
  return []
}

function effectiveProjectFiles(isCreate, submitted, original) {
  if (isCreate) return normalizeProjectFileNames(submitted)
  if (submitted === undefined || submitted === null) {
    return normalizeProjectFileNames(original)
  }
  return normalizeProjectFileNames(submitted)
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function requireText(submitted, field, message) {
  if (trimText(submitted[field])) return null
  return { ok: false, field, message }
}

function requireAttachment(isCreate, submitted, original, field, message) {
  if (
    effectiveProjectFiles(isCreate, submitted[field], original?.[field])
      .length > 0
  ) {
    return null
  }
  return { ok: false, field, message }
}

function refineSubAccount(submitted) {
  const main = trimText(submitted.fund_source)
  if (!main) {
    return { ok: false, field: "fund_source", message: "Main account is required." }
  }
  const sub = trimText(submitted.sub_account)
  if (main === "Others" && !sub) {
    return { ok: false, field: "sub_account", message: "Other purpose is required." }
  }
  if (MAIN_ACCOUNTS_REQUIRING_SUB_ACCOUNT.has(main) && !sub) {
    return { ok: false, field: "sub_account", message: "Sub account is required." }
  }
  return null
}

function validatePpdo(isCreate, submitted, original) {
  const checks = [
    requireText(submitted, "name", "Project name is required."),
    requireText(submitted, "description", "Description is required."),
    requireText(submitted, "category", "Category is required."),
    requireText(submitted, "municipality", "Municipality is required."),
    requireText(submitted, "barangay", "Barangay is required."),
    requireText(submitted, "location", "Location is required."),
    submitted.budget_year == null || submitted.budget_year === ""
      ? { ok: false, field: "budget_year", message: "Budget year is required." }
      : null,
    submitted.funding_year == null || submitted.funding_year === ""
      ? { ok: false, field: "funding_year", message: "Funding year is required." }
      : null,
    refineSubAccount(submitted),
    requireText(
      submitted,
      "period_of_implementation",
      "Period of implementation is required."
    ),
    requireAttachment(
      isCreate,
      submitted,
      original,
      "moa_file",
      "MOA document is required."
    ),
    requireAttachment(
      isCreate,
      submitted,
      original,
      "resolution_file",
      "Resolution document is required."
    ),
    requireAttachment(
      isCreate,
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

function validateLgu(isCreate, submitted, original) {
  const bid = Number(submitted.bid_price)
  const checks = [
    requireText(submitted, "status", "Project status is required."),
    requireText(submitted, "contractor", "Contractor is required."),
    !Number.isFinite(bid) || bid <= 0
      ? { ok: false, field: "bid_price", message: "Bid price is required." }
      : null,
    requireText(submitted, "start_date", "Start date is required."),
    requireText(submitted, "target_end_date", "End date is required."),
    requireAttachment(
      isCreate,
      submitted,
      original,
      "project_photos",
      "Project photos are required."
    ),
  ]
  for (const result of checks) {
    if (result && !result.ok) return result
  }
  return { ok: true }
}

function validateProjectMutateCompleteness(input) {
  const role = input.role || ""
  if (!role) {
    return {
      ok: false,
      field: "role",
      message: "You cannot update this project.",
    }
  }
  if (PPDO_ROLES.has(role)) {
    return validatePpdo(input.isCreate, input.submitted, input.original)
  }
  if (LGU_ROLES.has(role)) {
    return validateLgu(input.isCreate, input.submitted, input.original)
  }
  return { ok: true }
}

function recordToObject(record) {
  if (!record) return {}
  const submitted = {}
  for (const field of PROJECT_FIELDS) {
    const value =
      typeof record.get === "function" ? record.get(field) : record[field]
    if (
      (field === "start_date" || field === "target_end_date") &&
      value &&
      typeof value.string === "function"
    ) {
      submitted[field] = String(value.string()).trim()
      continue
    }
    submitted[field] = value
  }
  return submitted
}

function originalRecord(record) {
  const original = record?.originalCopy || record?.original
  if (typeof original === "function") return original.call(record)
  return original || null
}

function actorRole(event) {
  if (typeof event.hasSuperuserAuth === "function" && event.hasSuperuserAuth()) {
    return "Super Admin"
  }
  const auth = event.auth || event.requestInfo?.()?.auth
  if (!auth) return ""
  const collection = auth.collection
  const collectionName =
    typeof collection === "function" ? collection()?.name : collection?.name
  if (collectionName === "_superusers") return "Super Admin"
  return auth.get?.("role") || auth.role || ""
}

function applyProjectMutateCompleteness(event, isCreate) {
  const role = actorRole(event)
  if (!role) {
    throw new BadRequestError("You cannot update this project.")
  }
  const result = validateProjectMutateCompleteness({
    role,
    isCreate,
    submitted: recordToObject(event.record),
    original: isCreate ? null : recordToObject(originalRecord(event.record)),
  })
  if (!result.ok) {
    throw new BadRequestError(result.message)
  }
  if (typeof event.next === "function") {
    event.next()
  }
}

module.exports = {
  normalizeProjectFileNames,
  effectiveProjectFiles,
  validateProjectMutateCompleteness,
  applyProjectMutateCompleteness,
}
