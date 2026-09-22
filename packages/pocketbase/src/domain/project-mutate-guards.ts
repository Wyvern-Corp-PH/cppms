/** Project create/update completeness — scalars + attachments with update retention. */

export type ProjectMutateCompletenessResult =
  | { ok: true }
  | { ok: false; field: string; message: string }

const PPDO_ROLES = new Set(["Province", "Super Admin"])
const LGU_ROLES = new Set(["Municipality", "Barangay"])
const MAIN_ACCOUNTS_REQUIRING_SUB_ACCOUNT = new Set([
  "General Fund",
  "Trust Fund",
])

export function normalizeProjectFileNames(value: unknown): string[] {
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
 * record value (omit-file keeps on-record names; explicit clear is empty).
 */
export function effectiveProjectFiles(
  _isCreate: boolean,
  submitted: unknown,
  _original?: unknown
): string[] {
  return normalizeProjectFileNames(submitted)
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function requireText(
  submitted: Record<string, unknown>,
  field: string,
  message: string
): ProjectMutateCompletenessResult | null {
  if (trimText(submitted[field])) return null
  return { ok: false, field, message }
}

function requireAttachment(
  submitted: Record<string, unknown>,
  field: string,
  message: string
): ProjectMutateCompletenessResult | null {
  if (effectiveProjectFiles(false, submitted[field]).length > 0) return null
  return { ok: false, field, message }
}

function refineSubAccount(
  submitted: Record<string, unknown>
): ProjectMutateCompletenessResult | null {
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

function validatePpdo(
  submitted: Record<string, unknown>
): ProjectMutateCompletenessResult {
  const checks: Array<ProjectMutateCompletenessResult | null> = [
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

function validateLgu(
  submitted: Record<string, unknown>
): ProjectMutateCompletenessResult {
  const bid = Number(submitted.bid_price)
  const checks: Array<ProjectMutateCompletenessResult | null> = [
    requireText(submitted, "status", "Project status is required."),
    requireText(submitted, "contractor", "Contractor is required."),
    !Number.isFinite(bid) || bid <= 0
      ? { ok: false, field: "bid_price", message: "Bid price is required." }
      : null,
    requireText(submitted, "start_date", "Start date is required."),
    requireText(submitted, "target_end_date", "End date is required."),
    requireAttachment(
      submitted,
      "project_photos",
      "Project photos are required."
    ),
  ]
  for (const result of checks) {
    if (result && !result.ok) return result
  }
  return { ok: true }
}

/** Role-scoped completeness for projects create/update (UI, import, API). */
export function validateProjectMutateCompleteness(input: {
  role: string | undefined
  isCreate: boolean
  submitted: Record<string, unknown>
  original?: Record<string, unknown> | null
}): ProjectMutateCompletenessResult {
  const role = input.role ?? ""
  if (PPDO_ROLES.has(role)) {
    return validatePpdo(input.submitted)
  }
  if (LGU_ROLES.has(role)) {
    return validateLgu(input.submitted)
  }
  return { ok: true }
}
