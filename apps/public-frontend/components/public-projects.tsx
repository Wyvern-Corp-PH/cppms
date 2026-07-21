"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { loadOptionRecordNames, loadSelectFieldOptions } from "@workspace/pocketbase"
import {
  filterProjects,
  projectLocationDisplayParts,
  formatProjectDateRange,
} from "@workspace/pocketbase/domain/project-filters"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import { PROJECT_CATEGORY, PROJECT_STATUS } from "@workspace/pocketbase/schema"
import {
  locationRecordSchema,
  parseRecordList,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type { LocationRecord, ProjectRecord } from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Progress } from "@workspace/ui/components/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { PageHeaderBand } from "@/components/page-header-band"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

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

function uniqueByName<T extends { name: string }>(locations: T[]) {
  const seen = new Set<string>()
  return locations.filter((location) => {
    if (seen.has(location.name)) {
      return false
    }
    seen.add(location.name)
    return true
  })
}

export function PublicProjects() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([...PROJECT_STATUS])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([
    ...PROJECT_CATEGORY,
  ])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [status, setStatus] = useState("all")
  const [municipality, setMunicipality] = useState("all")
  const [barangay, setBarangay] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const loadProjects = useCallback(async () => {
    const pb = getPocketBase()
    const [projectRows, nextStatusOptions, nextCategoryOptions] = await Promise.all([
      pb.collection("projects").getFullList(),
      loadOptionRecordNames(pb, "project_status_options", PROJECT_STATUS).then(
        (options) =>
          options.length > 0
            ? options
            : loadSelectFieldOptions(pb, "projects", "status", PROJECT_STATUS)
      ),
      loadOptionRecordNames(pb, "project_category_options", PROJECT_CATEGORY).then(
        (options) =>
          options.length > 0
            ? options
            : loadSelectFieldOptions(pb, "projects", "category", PROJECT_CATEGORY)
      ),
    ])
    setProjects(parseRecordList(projectRecordSchema, projectRows))
    setStatusOptions(nextStatusOptions)
    setCategoryOptions(nextCategoryOptions)
    try {
      const locationRows = await pb.collection("locations").getFullList()
      setLocations(
        parseRecordList(locationRecordSchema, locationRows)
          .filter((location) => location.active)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
      )
    } catch {
      setLocations([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadProjects().catch(() => {
      setProjects([])
      setLocations([])
      setLoading(false)
    })
  }, [loadProjects])

  const { live } = usePocketBaseRealtime(["projects", "locations"], () => {
    void loadProjects()
  })

  const filtered = useMemo(
    () =>
      filterProjects(projects, {
        query,
        category:
          category === "all" ? undefined : (category as ProjectRecord["category"]),
        status: status === "all" ? undefined : (status as ProjectRecord["status"]),
        municipality: municipality === "all" ? undefined : municipality,
        barangay: barangay === "all" ? undefined : barangay,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [projects, query, category, status, municipality, barangay, dateFrom, dateTo]
  )

  const municipalityChoices = useMemo(
    () =>
      uniqueByName(
        locations
          .map((location) => {
            const hierarchy = getLocationHierarchy(location)
            return {
              id: hierarchy.isBarangay ? `municipality-${location.id}` : location.id,
              name: hierarchy.municipality,
            }
          })
          .filter((location) => location.name)
      ),
    [locations]
  )

  const barangayChoices = useMemo(() => {
    if (municipality === "all") {
      return []
    }

    return uniqueByName(
      locations
        .map((location) => ({
          id: location.id,
          ...getLocationHierarchy(location),
        }))
        .filter(
          (location) =>
            location.isBarangay && location.municipality === municipality
        )
        .map((location) => ({ id: location.id, name: location.barangay }))
        .filter((location) => location.name)
    )
  }, [locations, municipality])

  if (loading) {
    return (
      <div className="space-y-6" data-testid="projects-skeleton">
        <div className="bg-muted h-20 animate-pulse rounded-md" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeaderBand
        title="Provincial projects"
        context="Browse official provincial project records."
        live={live}
        kpis={[{ label: "Total", value: String(projects.length) }]}
      />

      <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Field>
          <FieldLabel htmlFor="public-filter-search">Search</FieldLabel>
          <Input
            id="public-filter-search"
            aria-label="Search projects"
            placeholder="Search by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="public-filter-status">Status</FieldLabel>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="public-filter-status" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="public-filter-category">Category</FieldLabel>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              id="public-filter-category"
              aria-label="Filter by category"
            >
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="public-filter-municipality">
            Municipality
          </FieldLabel>
          <Select
            value={municipality}
            onValueChange={(value) => {
              setMunicipality(value)
              setBarangay("all")
            }}
          >
            <SelectTrigger
              id="public-filter-municipality"
              aria-label="Filter by municipality"
            >
              <SelectValue placeholder="Municipality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All municipalities</SelectItem>
              {municipalityChoices.map((location) => (
                <SelectItem key={location.id} value={location.name}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="public-filter-barangay">Barangay</FieldLabel>
          <Select
            value={barangay}
            onValueChange={setBarangay}
            disabled={municipality === "all"}
          >
            <SelectTrigger
              id="public-filter-barangay"
              aria-label="Filter by barangay"
            >
              <SelectValue placeholder="Barangay" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All barangays</SelectItem>
              {barangayChoices.map((location) => (
                <SelectItem key={location.id} value={location.name}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="public-filter-date-from">From:</FieldLabel>
          <Input
            id="public-filter-date-from"
            aria-label="Filter from date"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="public-filter-date-to">To:</FieldLabel>
          <Input
            id="public-filter-date-to"
            aria-label="Filter to date"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </Field>
      </FieldGroup>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">No projects match your filters</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((project) => (
            <article key={project.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{project.name}</h2>
                <Badge variant="secondary">{project.status}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {[...projectLocationDisplayParts(project), project.category]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {project.description ? (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{project.description}</p>
              ) : null}
              <p className="text-muted-foreground mt-1 text-xs">
                {formatProjectDateRange(project.start_date, project.target_end_date)} · FY {project.budget_year} ·{" "}
                {formatPhp(project.total_budget ?? 0)}
              </p>
              <Progress className="mt-2" value={project.progress_pct ?? 0} />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
