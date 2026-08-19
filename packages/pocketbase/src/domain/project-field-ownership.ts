import { LGU_PHASE_STATUS } from "../../schema/manifest"
import type { Role } from "../schemas/enums"

export { LGU_PHASE_STATUS }

export const LGU_WRITABLE_STATUSES = [
  "Planning",
  "Procurement",
  "Ongoing",
] as const

export const TERMINAL_OR_REVIEW_STATUSES = [
  "Ready for Review",
  "For Revision",
  "Completed",
  "Rejected",
] as const

export const PPDO_OWNED_FIELDS = [
  "name",
  "description",
  "category",
  "municipality",
  "barangay",
  "location",
  "budget_year",
  "fund_source",
  "funding_year",
  "sub_account",
  "period_of_implementation",
  "moa_file",
  "number_of_students",
] as const

export const LGU_OWNED_FIELDS = [
  "contractor",
  "bid_price",
  "project_photos",
  "resolution_file",
  "supporting_docs",
] as const

export function projectFieldFilledByLabel(field: string): string | null {
  if ((PPDO_OWNED_FIELDS as readonly string[]).includes(field)) {
    return "filled by PPDO"
  }
  if (
    field === "status" ||
    (LGU_OWNED_FIELDS as readonly string[]).includes(field)
  ) {
    return "filled by LGU/Barangay"
  }
  return null
}

const SYSTEM_FIELDS = new Set([
  "id",
  "created",
  "updated",
  "collectionId",
  "collectionName",
  "expand",
])

const CREATE_DEFAULT_FIELDS = new Set(["progress_pct", "lgu_level", "bid_price"])

export type ProjectWriteActor = {
  role?: Role | string
}

export type ProjectFieldMap = Record<string, unknown>

export type ProjectFieldWriteResult =
  | { ok: true; setLguEncodedAt: boolean }
  | { ok: false; error: string }

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function normalizeValue(value: unknown): string {
  if (isEmptyValue(value)) return ""
  if (Array.isArray(value)) {
    return JSON.stringify(
      value.map((item) => (typeof item === "string" ? item : String(item))).sort()
    )
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return normalizeValue(left) === normalizeValue(right)
}

function isProvincialOverride(role: string | undefined): boolean {
  return role === "Super Admin" || role === "Province"
}

function isLguRole(role: string | undefined): boolean {
  return role === "Municipality" || role === "Barangay"
}

function hasLguEncodedAt(record: ProjectFieldMap | null | undefined): boolean {
  return !isEmptyValue(record?.lgu_encoded_at)
}

function isLguWritableStatus(status: unknown): boolean {
  return LGU_WRITABLE_STATUSES.includes(
    status as (typeof LGU_WRITABLE_STATUSES)[number]
  )
}

function isTerminalOrReviewStatus(status: unknown): boolean {
  return TERMINAL_OR_REVIEW_STATUSES.includes(
    status as (typeof TERMINAL_OR_REVIEW_STATUSES)[number]
  )
}

function isCreateDefaultAllowed(
  field: string,
  value: unknown,
  isCreate: boolean
): boolean {
  if (!isCreate || !CREATE_DEFAULT_FIELDS.has(field)) return false
  if (field === "lgu_level") return true
  return isEmptyValue(value) || Number(value) === 0
}

export function ownedProjectFieldsForActor(
  role: string | undefined,
  original: ProjectFieldMap | null | undefined,
  isCreate: boolean
): Set<string> {
  if (isProvincialOverride(role)) {
    return new Set(["*"])
  }
  if (role === "PPDO") {
    const owned = new Set<string>(PPDO_OWNED_FIELDS)
    if (isCreate || !hasLguEncodedAt(original)) {
      owned.add("status")
    }
    return owned
  }
  if (isLguRole(role)) {
    return new Set<string>([...LGU_OWNED_FIELDS, "status"])
  }
  return new Set()
}

export function projectPayloadForActor(
  role: string | undefined,
  original: ProjectFieldMap | null | undefined,
  isCreate: boolean,
  submitted: ProjectFieldMap
): ProjectFieldMap {
  const owned = ownedProjectFieldsForActor(role, original, isCreate)
  const payload: ProjectFieldMap = {}
  for (const [field, value] of Object.entries(submitted)) {
    if (value === undefined) continue
    const allowed =
      owned.has("*") ||
      owned.has(field) ||
      isCreateDefaultAllowed(field, value, isCreate)
    if (!allowed) continue
    payload[field] = value
  }
  return payload
}

export function isProjectFieldEditable(
  role: string | undefined,
  field: string,
  original: ProjectFieldMap | null | undefined,
  isCreate: boolean
): boolean {
  if (field === "lgu_encoded_at") return false
  if (isProvincialOverride(role)) return true
  const owned = ownedProjectFieldsForActor(role, original, isCreate)
  if (!owned.has(field)) return false
  if (field === "status" && isLguRole(role)) {
    return isLguWritableStatus(original?.status)
  }
  if (field === "number_of_students" && role === "PPDO") {
    return isCreate || original?.category === "Scholarship"
  }
  return true
}

export function statusOptionsForActor(
  role: string | undefined,
  currentStatus: string,
  original: ProjectFieldMap | null | undefined,
  catalog: readonly string[]
): string[] {
  if (isProvincialOverride(role)) return [...catalog]
  if (role === "PPDO") {
    if (hasLguEncodedAt(original)) return [currentStatus]
    return [...catalog]
  }
  if (isLguRole(role)) {
    if (isTerminalOrReviewStatus(currentStatus)) return [currentStatus]
    return LGU_WRITABLE_STATUSES.filter((status) => catalog.includes(status))
  }
  return [currentStatus]
}

export function changedProjectFields(
  original: ProjectFieldMap | null | undefined,
  submitted: ProjectFieldMap
): string[] {
  const changed: string[] = []
  for (const [field, value] of Object.entries(submitted)) {
    if (SYSTEM_FIELDS.has(field)) continue
    if (valuesEqual(original?.[field], value)) continue
    changed.push(field)
  }
  return changed
}

function reject(field: string): ProjectFieldWriteResult {
  return {
    ok: false,
    error: `You cannot update field '${field}'.`,
  }
}

export function evaluateProjectFieldWrite(options: {
  role: string | undefined
  isCreate: boolean
  original?: ProjectFieldMap | null
  submitted: ProjectFieldMap
}): ProjectFieldWriteResult {
  const { role, isCreate, original, submitted } = options
  const changed = changedProjectFields(original, submitted)

  if (changed.includes("lgu_encoded_at")) {
    return reject("lgu_encoded_at")
  }

  if (isProvincialOverride(role)) {
    return { ok: true, setLguEncodedAt: false }
  }

  if (role !== "PPDO" && !isLguRole(role)) {
    return { ok: false, error: "You cannot update this project." }
  }

  const owned = ownedProjectFieldsForActor(role, original, isCreate)

  for (const field of changed) {
    if (isCreateDefaultAllowed(field, submitted[field], isCreate)) continue
    if (field === "status") {
      const nextStatus = submitted.status
      const currentStatus = original?.status
      if (role === "PPDO") {
        if (!owned.has("status")) return reject("status")
        continue
      }
      if (valuesEqual(currentStatus, nextStatus)) continue
      if (isTerminalOrReviewStatus(currentStatus) || isTerminalOrReviewStatus(nextStatus)) {
        return reject("status")
      }
      if (!isLguWritableStatus(nextStatus)) return reject("status")
      continue
    }
    if (field === "municipality" || field === "barangay") {
      if (isLguRole(role)) return reject(field)
    }
    if (!owned.has(field)) return reject(field)
  }

  return {
    ok: true,
    setLguEncodedAt: !isCreate && isLguRole(role) && !hasLguEncodedAt(original),
  }
}
