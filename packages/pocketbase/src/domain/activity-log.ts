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
