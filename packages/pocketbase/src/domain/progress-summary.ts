import type { ProgressUpdateRecord, ProjectRecord } from "../types"

export type ProgressBuckets = {
  needsAttention: number
  onTrack: number
  other: number
}

/** Updates must be newest-first (same order as Progress module). */
export function effectiveProgressPct(
  project: Pick<ProjectRecord, "progress_pct">,
  updates: readonly Pick<ProgressUpdateRecord, "to_pct">[]
): number {
  return updates[0]?.to_pct ?? project.progress_pct ?? 0
}

export function projectProgressPatchFromUpdate(
  toPct: number,
  currentStatus: ProjectRecord["status"]
): Pick<ProjectRecord, "progress_pct" | "status"> {
  return {
    progress_pct: toPct,
    status: toPct >= 100 ? "Ready for Review" : currentStatus,
  }
}

/** Statuses where local actors may still open Update Progress (before % gate). */
export const EDITABLE_PROGRESS_STATUSES = [
  "Planning",
  "Procurement",
  "Ongoing",
  "For Revision",
] as const satisfies readonly ProjectRecord["status"][]

/** Stuck rows eligible for SA/Province heal + repair migration (⊥ For Revision). */
export const STUCK_AT_100_PROGRESS_STATUSES = [
  "Planning",
  "Procurement",
  "Ongoing",
] as const satisfies readonly ProjectRecord["status"][]

/**
 * Shared Update Progress CTA gate (list + detail + openUpdateModal).
 * Hide when effective ≥ 100 except For Revision resubmit; Ready|Completed|Rejected
 * are excluded via EDITABLE_PROGRESS_STATUSES.
 */
export function canShowUpdateProgress(options: {
  status: string
  effectivePct: number
  canCreateProgressUpdates: boolean
}): boolean {
  if (!options.canCreateProgressUpdates) return false
  if (
    !(EDITABLE_PROGRESS_STATUSES as readonly string[]).includes(options.status)
  ) {
    return false
  }
  if (
    options.effectivePct >= 100 &&
    options.status !== "For Revision"
  ) {
    return false
  }
  return true
}

export function isStuckAt100NeedingReadyForReview(options: {
  status: string
  effectivePct: number
}): boolean {
  return (
    options.effectivePct >= 100 &&
    (STUCK_AT_100_PROGRESS_STATUSES as readonly string[]).includes(
      options.status
    )
  )
}

export const ACTIVE_PROJECT_STATUSES = [
  "Planning",
  "Procurement",
  "Ongoing",
  "For Revision",
] as const satisfies readonly ProjectRecord["status"][]

export type ProgressSummaryCards = {
  activeProjects: number
  onTrack: number
  needsAttention: number
  updatesToday: number
}

export function countProgressBuckets(
  projects: readonly Pick<ProjectRecord, "progress_pct">[]
): ProgressBuckets {
  let needsAttention = 0
  let onTrack = 0
  let other = 0

  for (const project of projects) {
    const pct = project.progress_pct ?? 0
    if (pct < 25) {
      needsAttention += 1
    } else if (pct >= 50) {
      onTrack += 1
    } else {
      other += 1
    }
  }

  return { needsAttention, onTrack, other }
}

export function countActiveProjects(
  projects: readonly Pick<ProjectRecord, "status">[]
): number {
  return projects.filter((project) =>
    (ACTIVE_PROJECT_STATUSES as readonly string[]).includes(project.status)
  ).length
}

export function countUpdatesToday(
  updates: readonly Pick<ProgressUpdateRecord, "created" | "updated_at">[],
  now: Date = new Date()
): number {
  const today = now.toISOString().slice(0, 10)
  return updates.filter((update) => {
    const stamp = update.updated_at ?? update.created ?? ""
    return stamp.slice(0, 10) === today
  }).length
}

export function buildProgressSummaryCards(
  projects: readonly Pick<ProjectRecord, "status" | "progress_pct">[],
  updates: readonly Pick<ProgressUpdateRecord, "created" | "updated_at">[],
  now: Date = new Date()
): ProgressSummaryCards {
  const buckets = countProgressBuckets(projects)
  return {
    activeProjects: countActiveProjects(projects),
    onTrack: buckets.onTrack,
    needsAttention: buckets.needsAttention,
    updatesToday: countUpdatesToday(updates, now),
  }
}
