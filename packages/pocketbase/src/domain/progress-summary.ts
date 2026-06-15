import type { ProgressUpdateRecord, ProjectRecord } from "../types"

export type ProgressBuckets = {
  needsAttention: number
  onTrack: number
  other: number
}

export const ACTIVE_PROJECT_STATUSES = [
  "Planning",
  "Procurement",
  "Ongoing",
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
  updates: readonly Pick<ProgressUpdateRecord, "created" | "updated_at">[]
): ProgressSummaryCards {
  const buckets = countProgressBuckets(projects)
  return {
    activeProjects: countActiveProjects(projects),
    onTrack: buckets.onTrack,
    needsAttention: buckets.needsAttention,
    updatesToday: countUpdatesToday(updates),
  }
}
