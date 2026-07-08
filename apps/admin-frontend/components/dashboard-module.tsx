"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { filterProjectsForUser } from "@workspace/pocketbase/domain/access-control"
import { buildInactiveLocations } from "@workspace/pocketbase/domain/inactive-locations"
import { computeBudgetSummary } from "@workspace/pocketbase/domain/budget-summary"
import { resolveDeadlineStatus, deadlineStatusTone } from "@workspace/pocketbase/domain/deadline-status"
import {
  countActiveProjects,
  countProgressBuckets,
} from "@workspace/pocketbase/domain/progress-summary"
import { isApprovalEligible } from "@workspace/pocketbase/domain/project-filters"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import {
  budgetAllocationRecordSchema,
  budgetExpenseRecordSchema,
  locationRecordSchema,
  parseRecordList,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  LocationRecord,
  ProjectRecord,
} from "@workspace/pocketbase/types"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { DateRangeFilter } from "@/components/date-range-filter"
import {
  LocationFilterControls,
  projectMatchesLocationFilters,
  type LocationFilterValue,
} from "@/components/location-filter-controls"
import {
  buildParticipationStats,
  ParticipationStatsPanel,
} from "@/components/participation-stats-panel"
import { InactiveLocationsPanel } from "@/components/inactive-locations-panel"
import { PageHeaderBand } from "@/components/page-header-band"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { adminNavItems } from "@/lib/admin-nav"
import { getPocketBase } from "@/lib/pocketbase"

const quickLinks = adminNavItems.filter((item) => item.href !== "/dashboard")

function recordInDateRange(date: string | undefined, from: string, to: string) {
  if (!from && !to) return true
  if (!date) return false
  const value = Date.parse(date)
  if (Number.isNaN(value)) return false
  if (from) {
    const fromValue = Date.parse(from)
    if (!Number.isNaN(fromValue) && value < fromValue) return false
  }
  if (to) {
    const toValue = Date.parse(to)
    if (!Number.isNaN(toValue) && value > toValue) return false
  }
  return true
}

function projectInDateRange(project: ProjectRecord, from: string, to: string) {
  if (!from && !to) return true
  return (
    recordInDateRange(project.start_date, from, to) ||
    recordInDateRange(project.target_end_date, from, to)
  )
}

export function DashboardModule() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [allocations, setAllocations] = useState<BudgetAllocationRecord[]>([])
  const [expenses, setExpenses] = useState<BudgetExpenseRecord[]>([])
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [locationFilters, setLocationFilters] = useState<LocationFilterValue>({
    municipality: "",
    barangay: "",
  })
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(true)
  const actor = getPocketBase().authStore?.record

  const load = useCallback(async () => {
    setLoading(true)
    const pb = getPocketBase()
    const [projectRows, allocationRows, expenseRows, locationRows] = await Promise.all([
      pb.collection("projects").getFullList(),
      pb.collection("budget_allocations").getFullList(),
      pb.collection("budget_expenses").getFullList(),
      pb.collection("locations").getFullList().catch(() => []),
    ])
    setProjects(parseRecordList(projectRecordSchema, projectRows))
    setAllocations(parseRecordList(budgetAllocationRecordSchema, allocationRows))
    setExpenses(parseRecordList(budgetExpenseRecordSchema, expenseRows))
    setLocations(parseRecordList(locationRecordSchema, locationRows))
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const { live } = usePocketBaseRealtime(
    ["projects", "budget_allocations", "budget_expenses", "approval_actions"],
    () => {
      void load()
    }
  )

  const scopedProjects = useMemo(
    () => (actor?.role ? filterProjectsForUser(actor, projects) : projects),
    [actor, projects]
  )

  const filteredProjects = useMemo(
    () =>
      scopedProjects.filter(
        (project) =>
          projectMatchesLocationFilters(project, locationFilters) &&
          projectInDateRange(project, dateFrom, dateTo)
      ),
    [dateFrom, dateTo, locationFilters, scopedProjects]
  )
  const filteredProjectIds = useMemo(
    () => new Set(filteredProjects.map((project) => project.id)),
    [filteredProjects]
  )
  const filteredAllocations = useMemo(
    () =>
      allocations.filter(
        (row) =>
          filteredProjectIds.has(row.project) &&
          recordInDateRange(row.date, dateFrom, dateTo)
      ),
    [allocations, dateFrom, dateTo, filteredProjectIds]
  )
  const filteredExpenses = useMemo(
    () =>
      expenses.filter(
        (row) =>
          filteredProjectIds.has(row.project) &&
          recordInDateRange(row.date, dateFrom, dateTo)
      ),
    [dateFrom, dateTo, expenses, filteredProjectIds]
  )

  const budget = useMemo(
    () => computeBudgetSummary(filteredProjects, filteredAllocations, filteredExpenses),
    [filteredProjects, filteredAllocations, filteredExpenses]
  )
  const progress = useMemo(() => countProgressBuckets(filteredProjects), [filteredProjects])
  const activeProjectCount = useMemo(
    () => countActiveProjects(filteredProjects),
    [filteredProjects]
  )
  const awaitingApproval = useMemo(
    () =>
      filteredProjects.filter(
        (project) => isApprovalEligible(project) && project.approval_status !== "approved"
      ).length,
    [filteredProjects]
  )
  const participationStats = useMemo(
    () => buildParticipationStats(filteredProjects),
    [filteredProjects]
  )
  const inactiveLocations = useMemo(
    () => buildInactiveLocations(filteredProjects),
    [filteredProjects]
  )
  const showInactiveLocationsPanel =
    actor?.role === "Super Admin" || actor?.role === "Province"

  if (loading) {
    return (
      <div className="space-y-4" data-testid="dashboard-skeleton">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="bg-muted h-24 animate-pulse rounded-(--radius-lg)" />
          ))}
        </div>
      </div>
    )
  }

  const utilizationPct =
    budget.totalBudget > 0
      ? Math.round((budget.totalSpent / budget.totalBudget) * 100)
      : 0

  return (
    <div className="space-y-6">
      <PageHeaderBand
        title="Provincial overview"
        context="Records as of today"
        live={live}
        kpis={[
          { label: "Active", value: String(activeProjectCount) },
          { label: "Budget", value: formatPhp(budget.totalBudget) },
          { label: "Awaiting", value: String(awaitingApproval) },
        ]}
      />

      {awaitingApproval > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-lg) border border-border bg-card px-4 py-3 text-sm">
          <p>{awaitingApproval} completed project(s) need approval.</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/approvals">Review queue</Link>
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 rounded-(--radius-lg) border border-border bg-card p-4">
        <LocationFilterControls
          locations={locations}
          value={locationFilters}
          onChange={setLocationFilters}
        />
        <DateRangeFilter
          id="dashboard-date-range"
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
        />
      </div>

      <SummaryCardRow
        cards={[
          {
            label: "Active projects",
            value: String(activeProjectCount),
            testId: "dashboard-projects",
          },
          { label: "Total budget", value: formatPhp(budget.totalBudget), testId: "dashboard-budget" },
          { label: "On track", value: String(progress.onTrack), testId: "dashboard-on-track" },
          { label: "Awaiting approval", value: String(awaitingApproval), testId: "dashboard-approvals" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-(--radius-lg) border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Budget utilization</h2>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{utilizationPct}% spent</p>
          <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
            <span className="bg-primary block h-full" style={{ width: `${utilizationPct}%` }} />
          </div>
        </div>
        <div className="rounded-(--radius-lg) border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Deadline heatmap</h2>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {filteredProjects.slice(0, 28).map((project, index) => {
              const deadline = resolveDeadlineStatus(
                project.target_end_date,
                project.progress_pct ?? 0
              )
              const tone = deadlineStatusTone(deadline)
              const cellClass =
                tone === "destructive"
                  ? "bg-destructive/40"
                  : tone === "warning"
                    ? "bg-warning/40"
                    : tone === "success"
                      ? "bg-success/40"
                      : "bg-info/40"

              return (
                <span
                  key={`${project.id}-${index}`}
                  className={cn("aspect-square rounded-sm", cellClass)}
                  title={`${project.name}: ${deadline}`}
                />
              )
            })}
          </div>
        </div>
      </div>

      <ParticipationStatsPanel
        participation={participationStats.participation}
        fundingYearBreakdown={participationStats.fundingYearBreakdown}
        testIdPrefix="dashboard"
      />

      {showInactiveLocationsPanel ? (
        <InactiveLocationsPanel
          data={inactiveLocations}
          testIdPrefix="dashboard-inactive-locations"
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {quickLinks.map((item) => {
          const Icon = item.icon
          return (
            <Button key={item.href} asChild variant="outline" size="sm">
              <Link href={item.href}>
                <Icon />
                {item.label}
              </Link>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
