/** Progress create/update completeness — notes, site photo, derived from_pct. */

import { normalizeFileNames } from "./normalize-file-names"

export type ProgressMutateCompletenessResult =
  | { ok: true }
  | { ok: false; field: string; message: string }

export type ReleasedExpenseCompletenessResult =
  | { ok: true }
  | { ok: false; field: string; message: string }

export function normalizeProgressFileNames(value: unknown): string[] {
  return normalizeFileNames(value)
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Effective site photos that will persist.
 * Absent field on update keeps original; explicit "" / [] clears.
 */
export function effectiveProgressSitePhotos(
  submitted: unknown,
  original?: unknown
): string[] {
  if (submitted === undefined || submitted === null) {
    return normalizeFileNames(original)
  }
  return normalizeFileNames(submitted)
}

/** Completeness for progress_updates create/update (UI + direct API). */
export function validateProgressMutateCompleteness(input: {
  isCreate: boolean
  submitted: Record<string, unknown>
  original?: Record<string, unknown> | null
}): ProgressMutateCompletenessResult {
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
  }

  return { ok: true }
}

const MAIN_ACCOUNTS_REQUIRING_SUB_ACCOUNT = new Set([
  "General Fund",
  "Trust Fund",
])

/**
 * Released-amount completeness for budget_expenses linked to a progress
 * update. Standalone expenses stay optional (close-gaps elsewhere).
 */
export function validateProgressLinkedExpenseCompleteness(input: {
  submitted: Record<string, unknown>
}): ReleasedExpenseCompletenessResult {
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
