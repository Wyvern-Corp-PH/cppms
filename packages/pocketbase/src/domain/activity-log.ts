import { AUDIT_ACTION } from "../../schema/manifest"
import type { AuditAction, Role } from "../schemas/enums"

export type ActivityOutcome = "success" | "error" | "denied"

export type ActivityLogEventInput = {
  actor: {
    id?: string
    role: Role
    municipality?: string
    barangay?: string
  }
  action: AuditAction
  resource: string
  resourceId?: string
  policyKey?: string
  targetUser?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  outcome: ActivityOutcome
  error?: string
  startedAtMs: number
  endedAtMs?: number
  requestId?: string
  env?: Record<string, unknown>
}

export type ActivityLogEvent = {
  actor_user?: string
  actor_role: Role
  actor_municipality?: string
  actor_barangay?: string
  action: AuditAction
  resource: string
  resource_id?: string
  policy_key?: string
  target_user?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  outcome: ActivityOutcome
  error?: string
  duration_ms: number
  request_id?: string
  env?: Record<string, unknown>
}

export function createActivityLogEvent(
  input: ActivityLogEventInput
): ActivityLogEvent {
  return {
    actor_user: input.actor.id,
    actor_role: input.actor.role,
    actor_municipality: input.actor.municipality,
    actor_barangay: input.actor.barangay,
    action: input.action,
    resource: input.resource,
    resource_id: input.resourceId,
    policy_key: input.policyKey,
    target_user: input.targetUser,
    before: input.before,
    after: input.after,
    outcome: input.outcome,
    error: sanitizeActivityError(input.error),
    duration_ms: Math.max(0, (input.endedAtMs ?? Date.now()) - input.startedAtMs),
    request_id: input.requestId,
    env: input.env,
  }
}

const ACTIVITY_RESOURCE_LABELS: Record<string, string> = {
  projects: "Projects",
  budget_allocations: "Budget",
  budget_expenses: "Budget",
  progress_updates: "Progress",
  approval_actions: "Approvals",
  users: "Users",
  locations: "Locations",
}

const ACTIVITY_ACTION_LABELS: Record<AuditAction, string> = {
  create: "Created",
  update: "Edited",
  delete: "Deleted",
  deactivate: "Deactivated",
  approve: "Approved",
  reject: "Rejected",
  request_revision: "Requested revision",
  reset_password: "Reset password",
}

export type ActivityLogFilters = {
  actor?: string
  action?: string
  dateFrom?: string
  dateTo?: string
}

export function activityLogActionLabel(action: string): string {
  return ACTIVITY_ACTION_LABELS[action as AuditAction] ?? action
}

export function activityLogActionOptions(): { value: AuditAction; label: string }[] {
  return AUDIT_ACTION.map((value) => ({
    value,
    label: activityLogActionLabel(value),
  }))
}

function isUnsetFilter(value: string | undefined): boolean {
  return !value?.trim() || value === "all"
}

function activityLogDateKey(log: {
  created?: string
  created_at?: string
}): string | null {
  const raw = log.created_at ?? log.created
  if (!raw?.trim()) return null
  const ms = Date.parse(raw)
  if (Number.isNaN(ms)) return null
  return new Date(ms).toISOString().slice(0, 10)
}

export function filterActivityLogs<
  T extends {
    actor_user?: string
    action: string
    created?: string
    created_at?: string
  },
>(logs: readonly T[], filters: ActivityLogFilters): T[] {
  const actor = isUnsetFilter(filters.actor) ? undefined : filters.actor
  const action = isUnsetFilter(filters.action) ? undefined : filters.action
  const dateFrom = filters.dateFrom?.trim() || undefined
  const dateTo = filters.dateTo?.trim() || undefined

  return logs.filter((log) => {
    if (actor && log.actor_user !== actor) return false
    if (action && log.action !== action) return false
    const when = activityLogDateKey(log)
    if (dateFrom && (when === null || when < dateFrom)) return false
    if (dateTo && (when === null || when > dateTo)) return false
    return true
  })
}

export function activityLogResourceLabel(
  log: Pick<ActivityLogEvent, "resource" | "resource_id" | "before" | "after">,
  projectsById: ReadonlyMap<string, string>
): string {
  const projectId = projectIdFromLog(log)
  if (projectId) {
    const name = projectsById.get(projectId)?.trim()
    if (name) return name
  }

  const moduleLabel = ACTIVITY_RESOURCE_LABELS[log.resource]
  if (moduleLabel) return moduleLabel

  const description = firstHumanString(
    log.after?.name,
    log.before?.name,
    log.after?.description,
    log.before?.description
  )
  return description ?? "Activity"
}

function projectIdFromLog(
  log: Pick<ActivityLogEvent, "resource" | "resource_id" | "before" | "after">
): string | undefined {
  return (
    firstHumanString(
      log.after?.project,
      log.before?.project,
      log.after?.project_id,
      log.before?.project_id
    ) ?? log.resource_id
  )
}

function firstHumanString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function sanitizeActivityError(error: string | undefined): string | undefined {
  if (!error) {
    return undefined
  }

  return error.replace(/password=([^&\s]+)/gi, "password=[redacted]")
}
