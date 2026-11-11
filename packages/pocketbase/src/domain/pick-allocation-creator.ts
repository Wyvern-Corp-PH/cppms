/**
 * Earliest successful project-create actor, or "" when that actor is blank
 * or no longer a user. Empty means Allocated By stays a dash.
 *
 * @see pb_migrations/1740000043_backfill_allocation_creator.js
 * Migrations cannot import this module — that file inlines the same rules.
 */

export type AllocationCreatorLog = {
  id?: string
  actor_user?: string
  resource?: string
  action?: string
  outcome?: string
  resource_id?: string
  created?: string
  created_at?: string
}

function logStamp(log: AllocationCreatorLog): string {
  return log.created || log.created_at || ""
}

function isEarlierLog(
  candidate: AllocationCreatorLog,
  current: AllocationCreatorLog
): boolean {
  const candidateStamp = logStamp(candidate)
  const currentStamp = logStamp(current)
  if (candidateStamp !== currentStamp) {
    if (!candidateStamp) return false
    if (!currentStamp) return true
    return candidateStamp < currentStamp
  }
  return (candidate.id || "") < (current.id || "")
}

export function pickAllocationCreator(
  logs: readonly AllocationCreatorLog[],
  projectId: string,
  userExists: (userId: string) => boolean
): string {
  let earliest: AllocationCreatorLog | undefined
  for (const log of logs) {
    if (log.resource !== "projects") continue
    if (log.action !== "create") continue
    if (log.outcome !== "success") continue
    if (log.resource_id !== projectId) continue
    if (!earliest || isEarlierLog(log, earliest)) earliest = log
  }

  const actor = earliest?.actor_user?.trim() ?? ""
  if (!actor || !userExists(actor)) return ""
  return actor
}
