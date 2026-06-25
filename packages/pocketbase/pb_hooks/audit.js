const AUDITED_COLLECTIONS = [
  "users",
  "projects",
  "budget_allocations",
  "budget_expenses",
  "progress_updates",
  "approval_actions",
  "locations",
]

const ACTION_BY_COLLECTION = {
  approval_actions: (record) => record.get("action") || "create",
}

const STARTED_AT = new WeakMap()
const STARTED_AT_BY_KEY = new Map()
const REQUEST_CONTEXT = new WeakMap()
const REQUEST_CONTEXT_BY_KEY = new Map()
const REQUEST_AUDITED_BY_KEY = new Set()
const ERROR_AUDITED = new WeakSet()

const AUDIT_FIELDS = {
  users: ["email", "name", "role", "account_status"],
  projects: [
    "name",
    "category",
    "status",
    "location",
    "lgu_level",
    "progress_pct",
    "approval_status",
  ],
  budget_allocations: ["project", "amount", "year", "description", "date", "allocated_by"],
  budget_expenses: [
    "project",
    "amount",
    "year",
    "main_account",
    "sub_account",
    "date",
    "receipt_number",
  ],
  progress_updates: ["project", "from_pct", "to_pct", "updated_by", "updated_at"],
  approval_actions: ["project", "action", "authority_name", "reason"],
  locations: ["name", "slug", "active", "sort_order"],
}

function sanitize(value) {
  if (value === null || value === undefined) return value

  if (typeof value === "string") {
    return value.replace(/password=([^&\s]+)/gi, "password=[redacted]")
  }

  if (Array.isArray(value)) {
    return value.map(sanitize)
  }

  if (typeof value === "object") {
    const clean = {}
    for (const key of Object.keys(value)) {
      if (/password|token|secret/i.test(key)) {
        clean[key] = "[redacted]"
      } else {
        clean[key] = sanitize(value[key])
      }
    }
    return clean
  }

  return value
}

function actorRole(auth) {
  if (authCollectionName(auth) === "_superusers") {
    return "Super Admin"
  }
  const role = auth?.get?.("role")
  return role === "Super Admin" ||
    role === "Province" ||
    role === "Municipality" ||
    role === "Barangay"
    ? role
    : "Barangay"
}

function authCollectionName(auth) {
  const collection = auth?.collection
  if (typeof collection === "function") {
    return collection()?.name || ""
  }
  return collection?.name || auth?.collectionName || ""
}

function actorUserId(auth) {
  if (authCollectionName(auth) !== "users") return ""
  return auth.id || auth.get?.("id") || ""
}

function actorScope(auth) {
  if (authCollectionName(auth) !== "users") {
    return { municipality: "", barangay: "" }
  }
  return {
    municipality: auth?.get?.("municipality") || "",
    barangay: auth?.get?.("barangay") || "",
  }
}

function snapshot(record) {
  const data = {}
  for (const key of AUDIT_FIELDS[record.collection().name] || []) {
    data[key] = sanitize(record.get(key))
  }
  return data
}

function envContext() {
  return {
    service: "pocketbase",
    version: globalThis.$os?.getenv?.("APP_VERSION") || "",
    commit: globalThis.$os?.getenv?.("GIT_COMMIT") || "",
  }
}

function errorMessage(error) {
  if (!error) return ""
  if (typeof error === "string") return error
  return error.message || String(error)
}

function errorOutcome(error) {
  const message = errorMessage(error).toLowerCase()
  return /denied|forbidden|unauthorized|permission/.test(message)
    ? "denied"
    : "error"
}

function previousSnapshot(record) {
  const original = record.original || record.originalCopy
  if (!original) return undefined

  const data = {}
  for (const key of AUDIT_FIELDS[record.collection().name] || []) {
    data[key] =
      typeof original.get === "function" ? sanitize(original.get(key)) : undefined
  }
  return data
}

function recordKey(record) {
  const id = record?.id
  if (!id) return ""
  return `${record.collection().name}:${id}`
}

function setStarted(record) {
  const startedAt = Date.now()
  STARTED_AT.set(record, startedAt)
  const key = recordKey(record)
  if (key) {
    STARTED_AT_BY_KEY.set(key, startedAt)
  }
}

function startedAtFor(record) {
  const key = recordKey(record)
  return STARTED_AT.get(record) || (key ? STARTED_AT_BY_KEY.get(key) : 0) || Date.now()
}

function setRequestContext(record, context) {
  REQUEST_CONTEXT.set(record, context)
  const key = recordKey(record)
  if (key) {
    REQUEST_CONTEXT_BY_KEY.set(key, context)
  }
}

function requestContext(record, event) {
  const key = recordKey(record)
  const context =
    REQUEST_CONTEXT.get(record) ||
    (key ? REQUEST_CONTEXT_BY_KEY.get(key) : undefined) ||
    {}
  const requestInfo = context.requestInfo || currentRequestInfo(event)
  return {
    auth: context.auth || currentAuth(event),
    requestInfo,
  }
}

function currentRequestInfo(event) {
  if (typeof event.requestInfo === "function") {
    return event.requestInfo()
  }
  return event.requestInfo || {}
}

function currentAuth(event) {
  const requestInfo = currentRequestInfo(event)
  return requestInfo.auth || event.auth
}

function writeAudit(record, event, action, outcome, error) {
  const app = globalThis.$app
  const collection = app.findCollectionByNameOrId("activity_logs")
  const audit = new globalThis.Record(collection)
  const context = requestContext(record, event)
  const auth = context.auth
  const scope = actorScope(auth)
  const startedAt = startedAtFor(record)

  audit.set("actor_user", actorUserId(auth))
  audit.set("actor_role", actorRole(auth))
  audit.set("actor_municipality", scope.municipality)
  audit.set("actor_barangay", scope.barangay)
  audit.set("action", action)
  audit.set("resource", record.collection().name)
  audit.set("resource_id", record.id)
  audit.set("policy_key", `${record.collection().name}.${action}`)
  audit.set("target_user", record.collection().name === "users" ? record.id : "")
  audit.set("before", sanitize(previousSnapshot(record) || {}))
  audit.set("after", sanitize(snapshot(record)))
  audit.set("outcome", outcome)
  audit.set("error", sanitize(errorMessage(error)))
  audit.set("duration_ms", Math.max(0, Date.now() - startedAt))
  audit.set("request_id", context.requestInfo?.id || "")
  audit.set("env", envContext())

  app.save(audit)
}

function auditBefore(event) {
  if (!STARTED_AT.has(event.record)) {
    setStarted(event.record)
  }
  if (typeof event.next === "function") {
    event.next()
  }
}

function auditSuccess(event, action) {
  if (typeof event.next === "function") {
    event.next()
  }

  const record = event.record
  const key = recordKey(record)
  const context = requestContext(record, event)
  if ((key && REQUEST_AUDITED_BY_KEY.has(key)) || !context.auth) {
    return
  }
  const mappedAction = ACTION_BY_COLLECTION[record.collection().name]?.(record)
  writeAudit(record, event, mappedAction || action, "success")
}

function auditError(event, action) {
  if (typeof event.next === "function") {
    event.next()
  }

  const record = event.record
  if (ERROR_AUDITED.has(record)) {
    return
  }
  const mappedAction = ACTION_BY_COLLECTION[record.collection().name]?.(record)
  writeAudit(record, event, mappedAction || action, "error", event.error)
}

function auditRequest(event, action) {
  const record = event.record
  if (record) {
    setStarted(record)
    const requestInfo = currentRequestInfo(event)
    setRequestContext(record, {
      auth: currentAuth(event),
      requestInfo,
    })
  }

  try {
    if (typeof event.next === "function") {
      event.next()
    }
    if (record) {
      const requestInfo = currentRequestInfo(event)
      setRequestContext(record, {
        auth: currentAuth(event),
        requestInfo,
      })
      const mappedAction =
        ACTION_BY_COLLECTION[record.collection().name]?.(record)
      writeAudit(record, event, mappedAction || action, "success")
      const key = recordKey(record)
      if (key) {
        REQUEST_AUDITED_BY_KEY.add(key)
      }
    }
  } catch (error) {
    if (record) {
      const mappedAction =
        ACTION_BY_COLLECTION[record.collection().name]?.(record)
      const requestInfo = currentRequestInfo(event)
      setRequestContext(record, {
        auth: currentAuth(event),
        requestInfo,
      })
      writeAudit(
        record,
        event,
        mappedAction || action,
        errorOutcome(error),
        error
      )
      ERROR_AUDITED.add(record)
    }
    throw error
  }
}

module.exports = {
  AUDITED_COLLECTIONS,
  auditBefore,
  auditError,
  auditRequest,
  auditSuccess,
}
