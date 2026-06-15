export const DEADLINE_STATUS = [
  "Lapsed",
  "Completed",
  "On Track",
  "Near Deadline",
] as const

export type DeadlineStatus = (typeof DEADLINE_STATUS)[number]

export type DeadlineTone = "destructive" | "success" | "info" | "warning"

export function resolveDeadlineStatus(
  targetEndDate: string | undefined,
  progressPct: number,
  today = new Date()
): DeadlineStatus {
  if (progressPct >= 100) {
    return "Completed"
  }

  if (!targetEndDate) {
    return "On Track"
  }

  const end = new Date(targetEndDate)
  const msPerDay = 86_400_000
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / msPerDay)

  if (daysLeft < 0) {
    return "Lapsed"
  }

  if (daysLeft <= 14) {
    return "Near Deadline"
  }

  return "On Track"
}

export function deadlineStatusTone(status: DeadlineStatus): DeadlineTone {
  switch (status) {
    case "Lapsed":
      return "destructive"
    case "Completed":
      return "success"
    case "On Track":
      return "info"
    case "Near Deadline":
      return "warning"
  }
}
