"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  filterProjects,
  formatProjectDateRange,
} from "@workspace/pocketbase/domain/project-filters"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import { LGU_LEVEL, PROJECT_CATEGORY, PROJECT_STATUS } from "@workspace/pocketbase/schema"
import {
  locationRecordSchema,
  parseRecordList,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type { LocationRecord, ProjectRecord } from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
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

export function PublicProjects() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [status, setStatus] = useState("all")
  const [lguLevel, setLguLevel] = useState("all")
  const [locationSlug, setLocationSlug] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const loadProjects = useCallback(async () => {
    const pb = getPocketBase()
    const projectRows = await pb.collection("projects").getFullList()
    setProjects(parseRecordList(projectRecordSchema, projectRows))
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
        lgu_level:
          lguLevel === "all" ? undefined : (lguLevel as ProjectRecord["lgu_level"]),
        locationSlug: locationSlug === "all" ? undefined : locationSlug,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [projects, query, category, status, lguLevel, locationSlug, dateFrom, dateTo]
  )

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Input
          aria-label="Search projects"
          placeholder="Search by name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PROJECT_STATUS.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {PROJECT_CATEGORY.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={lguLevel} onValueChange={setLguLevel}>
          <SelectTrigger aria-label="Filter by LGU level">
            <SelectValue placeholder="LGU" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All LGU</SelectItem>
            {LGU_LEVEL.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationSlug} onValueChange={setLocationSlug}>
          <SelectTrigger aria-label="Filter by location">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.slug}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <Label htmlFor="public-filter-date-from">From:</Label>
          <Input
            id="public-filter-date-from"
            aria-label="Filter from date"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="public-filter-date-to">To:</Label>
          <Input
            id="public-filter-date-to"
            aria-label="Filter to date"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

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
                {[project.location, project.category, project.lgu_level].filter(Boolean).join(" · ")}
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
