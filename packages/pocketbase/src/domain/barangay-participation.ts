import { CAGAYAN_LOCATION_TREE } from "../seed/cagayan-locations"

const ACTIVE_PROJECT_STATUSES = new Set([
  "Planning",
  "Procurement",
  "Ongoing",
  "For Revision",
])

export const TOTAL_BARANGAYS = CAGAYAN_LOCATION_TREE.reduce(
  (count, municipality) => count + municipality.barangays.length,
  0
)

type ProjectParticipationRow = {
  municipality?: string
  barangay?: string
  status?: string
  budget_year?: number
}

function barangayKey(municipality: string, barangay: string) {
  return `${municipality.trim().toLowerCase()}|${barangay.trim().toLowerCase()}`
}

export type ParticipationStats = {
  totalBarangays: number
  withProjects: number
  withoutProjects: number
  rate: number
  copy: string
}

export type FundingYearBreakdownRow = {
  year: number
  count: number
  copy: string
}

export function buildParticipationStats(projects: readonly ProjectParticipationRow[]) {
  const barangaysWithProjects = new Set<string>()
  const activeBarangaysByYear = new Map<number, Set<string>>()

  for (const project of projects) {
    const municipality = project.municipality?.trim()
    const barangay = project.barangay?.trim()
    if (!municipality || !barangay) continue

    const key = barangayKey(municipality, barangay)
    barangaysWithProjects.add(key)

    if (
      project.budget_year &&
      project.status &&
      ACTIVE_PROJECT_STATUSES.has(project.status)
    ) {
      const yearSet =
        activeBarangaysByYear.get(project.budget_year) ?? new Set<string>()
      yearSet.add(key)
      activeBarangaysByYear.set(project.budget_year, yearSet)
    }
  }

  const withProjects = barangaysWithProjects.size
  const withoutProjects = Math.max(TOTAL_BARANGAYS - withProjects, 0)
  const rate =
    TOTAL_BARANGAYS > 0
      ? Math.round((withProjects / TOTAL_BARANGAYS) * 100)
      : 0

  const fundingYearBreakdown = Array.from(activeBarangaysByYear.entries())
    .sort(([left], [right]) => right - left)
    .map(([year, barangays]) => ({
      year,
      count: barangays.size,
      copy: `${barangays.size} barangay${barangays.size === 1 ? "" : "s"} still utilizing ${year} funds`,
    }))

  return {
    participation: {
      totalBarangays: TOTAL_BARANGAYS,
      withProjects,
      withoutProjects,
      rate,
      copy: `${withoutProjects} out of ${TOTAL_BARANGAYS} barangays have not created any projects yet`,
    },
    fundingYearBreakdown,
  }
}
