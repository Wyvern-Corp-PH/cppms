"use client"

import { useMemo } from "react"

import { normalizeLocationSlug } from "@workspace/pocketbase/domain/project-filters"
import type { LocationRecord, ProjectRecord } from "@workspace/pocketbase/types"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

export type LocationFilterValue = {
  municipality: string
  barangay: string
}

type LocationChoice = {
  id: string
  name: string
}

function splitProjectLocation(location: string | undefined) {
  const [municipality = "", ...barangayParts] = (location ?? "").split(" / ")
  return {
    municipality,
    barangay: barangayParts.join(" / "),
  }
}

function getLocationHierarchy(location: LocationRecord) {
  const split = splitProjectLocation(location.name)
  const isBarangay =
    location.level === "Barangay" ||
    Boolean(location.barangay_name) ||
    location.slug.includes("/") ||
    Boolean(split.barangay)

  return {
    isBarangay,
    municipality: location.municipality_name || split.municipality,
    barangay: location.barangay_name || split.barangay,
  }
}

function uniqueChoices(choices: LocationChoice[]) {
  const seen = new Set<string>()
  return choices.filter((choice) => {
    const key = normalizeLocationSlug(choice.name)
    if (!key || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export function buildLocationFilterChoices(locations: readonly LocationRecord[]) {
  const active = locations.filter((location) => location.active)
  const municipalityChoices = uniqueChoices(
    active.flatMap((location) => {
      const hierarchy = getLocationHierarchy(location)
      const name = hierarchy.isBarangay ? hierarchy.municipality : location.name
      return name ? [{ id: `municipality-${location.id}`, name }] : []
    })
  )

  const barangayChoices = active.flatMap((location) => {
    const hierarchy = getLocationHierarchy(location)
    if (!hierarchy.isBarangay || !hierarchy.municipality || !hierarchy.barangay) {
      return []
    }
    return [
      {
        id: `barangay-${location.id}`,
        municipality: hierarchy.municipality,
        name: hierarchy.barangay,
      },
    ]
  })

  return { municipalityChoices, barangayChoices }
}

export function projectMatchesLocationFilters(
  project: Pick<ProjectRecord, "municipality" | "barangay">,
  filters: LocationFilterValue
) {
  const municipality = normalizeLocationSlug(filters.municipality)
  const barangay = normalizeLocationSlug(filters.barangay)

  if (
    municipality &&
    normalizeLocationSlug(project.municipality) !== municipality
  ) {
    return false
  }

  if (barangay && normalizeLocationSlug(project.barangay) !== barangay) {
    return false
  }

  return true
}

export function LocationFilterControls({
  locations,
  value,
  onChange,
}: {
  locations: readonly LocationRecord[]
  value: LocationFilterValue
  onChange: (value: LocationFilterValue) => void
}) {
  const { municipalityChoices, barangayChoices } = useMemo(
    () => buildLocationFilterChoices(locations),
    [locations]
  )
  const selectedMunicipality = normalizeLocationSlug(value.municipality)
  const scopedBarangays = uniqueChoices(
    barangayChoices
      .filter(
        (choice) =>
          selectedMunicipality &&
          normalizeLocationSlug(choice.municipality) === selectedMunicipality
      )
      .map((choice) => ({ id: choice.id, name: choice.name }))
  )

  return (
    <FieldGroup className="contents">
      <Field>
        <FieldLabel htmlFor="location-filter-municipality">
          Municipality
        </FieldLabel>
        <Select
          value={value.municipality || "all"}
          onValueChange={(next) =>
            onChange({
              municipality: next === "all" ? "" : next,
              barangay: "",
            })
          }
        >
          <SelectTrigger
            id="location-filter-municipality"
            className="w-[180px]"
            aria-label="Filter by municipality"
          >
            <SelectValue placeholder="Municipality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Municipalities</SelectItem>
            {municipalityChoices.map((choice) => (
              <SelectItem key={choice.id} value={choice.name}>
                {choice.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="location-filter-barangay">Barangay</FieldLabel>
        <Select
          value={value.barangay || "all"}
          onValueChange={(next) =>
            onChange({
              ...value,
              barangay: next === "all" ? "" : next,
            })
          }
          disabled={!value.municipality}
        >
          <SelectTrigger
            id="location-filter-barangay"
            className="w-[180px]"
            aria-label="Filter by barangay"
          >
            <SelectValue placeholder="Barangay" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Barangays</SelectItem>
            {scopedBarangays.map((choice) => (
              <SelectItem key={choice.id} value={choice.name}>
                {choice.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  )
}
