import { CAGAYAN_LOCATION_TREE } from "../seed/cagayan-locations"

export const TOTAL_MUNICIPALITIES = CAGAYAN_LOCATION_TREE.length
export const TOTAL_BARANGAYS = CAGAYAN_LOCATION_TREE.reduce(
  (count, municipality) => count + municipality.barangays.length,
  0
)

type ProjectLocationRow = {
  municipality?: string
  barangay?: string
}

function normalizeLocationName(value: string) {
  return value.trim().toLowerCase()
}

function barangayKey(municipality: string, barangay: string) {
  return `${normalizeLocationName(municipality)}|${normalizeLocationName(barangay)}`
}

export type InactiveBarangayRow = {
  municipality: string
  barangay: string
}

export type InactiveLocationsResult = {
  totalMunicipalities: number
  totalBarangays: number
  inactiveMunicipalities: string[]
  inactiveBarangays: InactiveBarangayRow[]
}

export function buildInactiveLocations(
  projects: readonly ProjectLocationRow[]
): InactiveLocationsResult {
  const municipalitiesWithProjects = new Set<string>()
  const barangaysWithProjects = new Set<string>()

  for (const project of projects) {
    const municipality = project.municipality?.trim()
    const barangay = project.barangay?.trim()
    if (municipality) {
      municipalitiesWithProjects.add(normalizeLocationName(municipality))
    }
    if (municipality && barangay) {
      barangaysWithProjects.add(barangayKey(municipality, barangay))
    }
  }

  const inactiveMunicipalities: string[] = []
  const inactiveBarangays: InactiveBarangayRow[] = []

  for (const municipality of CAGAYAN_LOCATION_TREE) {
    if (!municipalitiesWithProjects.has(normalizeLocationName(municipality.name))) {
      inactiveMunicipalities.push(municipality.name)
    }

    for (const barangay of municipality.barangays) {
      if (
        !barangaysWithProjects.has(
          barangayKey(municipality.name, barangay)
        )
      ) {
        inactiveBarangays.push({
          municipality: municipality.name,
          barangay,
        })
      }
    }
  }

  return {
    totalMunicipalities: TOTAL_MUNICIPALITIES,
    totalBarangays: TOTAL_BARANGAYS,
    inactiveMunicipalities,
    inactiveBarangays,
  }
}
