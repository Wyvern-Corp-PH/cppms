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

type LocationTreeNode = {
  name: string
  barangays: readonly string[]
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
  projects: readonly ProjectLocationRow[],
  locationTree: readonly LocationTreeNode[] = CAGAYAN_LOCATION_TREE
): InactiveLocationsResult {
  const barangaysWithProjects = new Set<string>()

  for (const project of projects) {
    const municipality = project.municipality?.trim()
    const barangay = project.barangay?.trim()
    if (municipality && barangay) {
      barangaysWithProjects.add(barangayKey(municipality, barangay))
    }
  }

  const inactiveMunicipalities: string[] = []
  const inactiveBarangays: InactiveBarangayRow[] = []

  for (const municipality of locationTree) {
    const allBarangaysCovered = municipality.barangays.every((barangay) =>
      barangaysWithProjects.has(barangayKey(municipality.name, barangay))
    )
    if (!allBarangaysCovered) {
      inactiveMunicipalities.push(municipality.name)
    }

    for (const barangay of municipality.barangays) {
      if (
        !barangaysWithProjects.has(barangayKey(municipality.name, barangay))
      ) {
        inactiveBarangays.push({
          municipality: municipality.name,
          barangay,
        })
      }
    }
  }

  return {
    totalMunicipalities: locationTree.length,
    totalBarangays: locationTree.reduce(
      (count, municipality) => count + municipality.barangays.length,
      0
    ),
    inactiveMunicipalities,
    inactiveBarangays,
  }
}
