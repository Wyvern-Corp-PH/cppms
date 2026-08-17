const LGU_WRITABLE_STATUSES = ["Planning", "Procurement", "Ongoing"]
const TERMINAL_OR_REVIEW_STATUSES = [
  "Ready for Review",
  "For Revision",
  "Completed",
  "Rejected",
]
const PPDO_OWNED_FIELDS = [
  "name",
  "description",
  "category",
  "municipality",
  "barangay",
  "location",
  "budget_year",
  "total_budget",
  "fund_source",
  "period_of_implementation",
  "moa_details",
  "moa_file",
  "number_of_students",
]
const LGU_OWNED_FIELDS = [
  "planning_status",
  "procurement_status",
  "contractor",
  "bid_price",
  "project_photos",
  "start_date",
  "target_end_date",
]
const PROJECT_FIELDS = [
  ...PPDO_OWNED_FIELDS,
  ...LGU_OWNED_FIELDS,
  "status",
  "lgu_level",
  "progress_pct",
  "lgu_encoded_at",
  "resolution_file",
  "supporting_docs",
  "approval_status",
  "approved_at",
  "approved_by",
  "rejection_reason",
]
const SYSTEM_FIELDS = new Set([
  "id",
  "created",
  "updated",
  "collectionId",
  "collectionName",
  "expand",
])
const CREATE_DEFAULT_FIELDS = new Set(["progress_pct", "lgu_level", "bid_price"])

function isEmptyValue(value) {
  if (value === null || value === undefined || value === "") return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function normalizeValue(value) {
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

function valuesEqual(left, right) {
  return normalizeValue(left) === normalizeValue(right)
}

function isProvincialOverride(role) {
  return role === "Super Admin" || role === "Province"
}

function isLguRole(role) {
  return role === "Municipality" || role === "Barangay"
}

function hasLguEncodedAt(record) {
  return !isEmptyValue(record?.lgu_encoded_at)
}

function isLguWritableStatus(status) {
  return LGU_WRITABLE_STATUSES.includes(status)
}

function isTerminalOrReviewStatus(status) {
  return TERMINAL_OR_REVIEW_STATUSES.includes(status)
}

function isCreateDefaultAllowed(field, value, isCreate) {
  if (!isCreate || !CREATE_DEFAULT_FIELDS.has(field)) return false
  if (field === "lgu_level") return true
  return isEmptyValue(value) || Number(value) === 0
}

function ownedProjectFieldsForActor(role, original, isCreate) {
  if (isProvincialOverride(role)) return new Set(["*"])
  if (role === "PPDO") {
    const owned = new Set(PPDO_OWNED_FIELDS)
    if (isCreate || !hasLguEncodedAt(original)) owned.add("status")
    return owned
  }
  if (isLguRole(role)) return new Set([...LGU_OWNED_FIELDS, "status"])
  return new Set()
}

function changedProjectFields(original, submitted) {
  const changed = []
  for (const [field, value] of Object.entries(submitted)) {
    if (SYSTEM_FIELDS.has(field)) continue
    if (valuesEqual(original?.[field], value)) continue
    changed.push(field)
  }
  return changed
}

function reject(field) {
  return { ok: false, error: `You cannot update field '${field}'.` }
}

function evaluateProjectFieldWrite(options) {
  const role = options.role
  const isCreate = options.isCreate
  const original = options.original
  const submitted = options.submitted
  const changed = changedProjectFields(original, submitted)

  if (changed.includes("lgu_encoded_at")) return reject("lgu_encoded_at")
  if (isProvincialOverride(role)) return { ok: true, setLguEncodedAt: false }
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
      if (
        isTerminalOrReviewStatus(currentStatus) ||
        isTerminalOrReviewStatus(nextStatus)
      ) {
        return reject("status")
      }
      if (!isLguWritableStatus(nextStatus)) return reject("status")
      continue
    }
    if ((field === "municipality" || field === "barangay") && isLguRole(role)) {
      return reject(field)
    }
    if (!owned.has(field)) return reject(field)
  }

  return {
    ok: true,
    setLguEncodedAt: !isCreate && isLguRole(role) && !hasLguEncodedAt(original),
  }
}

function recordToObject(record) {
  if (!record) return {}
  const submitted = {}
  for (const field of PROJECT_FIELDS) {
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

function applyProjectFieldOwnership(event, isCreate) {
  const role = actorRole(event)
  if (!role) {
    throw new BadRequestError("You cannot update this project.")
  }
  const submitted = recordToObject(event.record)
  const original = isCreate ? {} : recordToObject(originalRecord(event.record))
  const result = evaluateProjectFieldWrite({
    role,
    isCreate,
    original,
    submitted,
  })
  if (!result.ok) {
    throw new BadRequestError(result.error)
  }
  if (result.setLguEncodedAt) {
    event.record.set("lgu_encoded_at", new Date().toISOString())
  }
}

module.exports = {
  PPDO_OWNED_FIELDS,
  LGU_OWNED_FIELDS,
  evaluateProjectFieldWrite,
  applyProjectFieldOwnership,
}
