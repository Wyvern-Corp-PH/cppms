import type { AuditAction, Role } from "../schemas/enums"

export type ActivityOutcome = "success" | "error" | "denied"

export type ActivityLogEventInput = {
  actor: {
    id?: string
    role: Role
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

function sanitizeActivityError(error: string | undefined): string | undefined {
  if (!error) {
    return undefined
  }

  return error.replace(/password=([^&\s]+)/gi, "password=[redacted]")
}
