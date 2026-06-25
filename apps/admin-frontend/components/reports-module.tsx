"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import { loadOptionRecordNames, loadSelectFieldOptions } from "@workspace/pocketbase"
import { canAccess } from "@workspace/pocketbase/domain/access-control"
import { formatDisplayDate, formatDisplayDateTime } from "@workspace/pocketbase/domain/format-display-date"
import { projectLocationDisplayParts } from "@workspace/pocketbase/domain/project-filters"
import {
  buildUserDisplayMap,
  displayUserRef,
  type UserDisplayRecord,
} from "@workspace/pocketbase/domain/user-display"
import {
  computeBudgetSummary,
  computeProjectBudgetBreakdown,
} from "@workspace/pocketbase/domain/budget-summary"
import {
  deadlineStatusTone,
  resolveDeadlineStatus,
} from "@workspace/pocketbase/domain/deadline-status"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import {
  countApprovedProjects,
  filterReportProjects,
  type ReportFilters,
} from "@workspace/pocketbase/domain/reports-filters"
import { PROJECT_CATEGORY, PROJECT_STATUS } from "@workspace/pocketbase/schema"
import {
  activityLogRecordSchema,
  budgetAllocationRecordSchema,
  budgetExpenseRecordSchema,
  locationRecordSchema,
  parseRecordList,
  progressUpdateRecordSchema,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  ActivityLogRecord,
  LocationRecord,
  ProgressUpdateRecord,
  ProjectRecord,
} from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"

import { SitePhoto, sitePhotoNames } from "@/components/site-photo"
import { DateRangeFilter } from "@/components/date-range-filter"
import { LivePill } from "@/components/live-pill"
import {
  LocationFilterControls,
  type LocationFilterValue,
} from "@/components/location-filter-controls"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { useAuth } from "@/lib/auth"
import { getPocketBase } from "@/lib/pocketbase"

type ReportTab = "projects" | "budget" | "progress" | "approvals"

const EMPTY_FILTERS: ReportFilters = {
  status: "all",
  category: "all",
  municipality: "all",
  barangay: "all",
}

export function ReportsModule() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [allocations, setAllocations] = useState<BudgetAllocationRecord[]>([])
  const [expenses, setExpenses] = useState<BudgetExpenseRecord[]>([])
  const [updates, setUpdates] = useState<ProgressUpdateRecord[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([])
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [users, setUsers] = useState<UserDisplayRecord[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([...PROJECT_STATUS])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([
    ...PROJECT_CATEGORY,
  ])
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS)
  const [activeTab, setActiveTab] = useState<ReportTab>("projects")
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const canViewActivityLogs = canAccess(user, "activity_logs.view")

  const load = useCallback(async () => {
    setLoading(true)
    const pb = getPocketBase()
    const [
      projectRows,
      allocationRows,
      expenseRows,
      updateRows,
      locationRows,
      logRows,
      userRows,
      nextStatusOptions,
      nextCategoryOptions,
    ] = await Promise.all([
      pb.collection("projects").getFullList(),
      pb.collection("budget_allocations").getFullList(),
      pb.collection("budget_expenses").getFullList(),
      pb.collection("progress_updates").getFullList(),
      pb.collection("locations").getFullList().catch(() => []),
      canViewActivityLogs
        ? pb.collection("activity_logs").getFullList()
        : Promise.resolve([]),
      pb.collection("users").getFullList().catch(() => []),
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
    setAllocations(parseRecordList(budgetAllocationRecordSchema, allocationRows))
    setExpenses(parseRecordList(budgetExpenseRecordSchema, expenseRows))
    setUpdates(parseRecordList(progressUpdateRecordSchema, updateRows))
    setLocations(parseRecordList(locationRecordSchema, locationRows))
    setActivityLogs(parseRecordList(activityLogRecordSchema, logRows))
    setUsers(userRows as UserDisplayRecord[])
    setStatusOptions(nextStatusOptions)
    setCategoryOptions(nextCategoryOptions)
    setLoading(false)
  }, [canViewActivityLogs])

  useEffect(() => {
    void load()
  }, [load])

  const { live } = usePocketBaseRealtime(
    canViewActivityLogs
      ? ["projects", "budget_allocations", "budget_expenses", "progress_updates", "activity_logs"]
      : ["projects", "budget_allocations", "budget_expenses", "progress_updates"],
    () => {
      void load()
    }
  )

  const filteredProjects = useMemo(
    () => filterReportProjects(projects, filters),
    [projects, filters]
  )
  const filteredProjectIds = useMemo(
    () => new Set(filteredProjects.map((project) => project.id)),
    [filteredProjects]
  )
  const userDisplay = useMemo(
    () => buildUserDisplayMap(users, user ? [user] : []),
    [user, users]
  )

  const filteredAllocations = useMemo(
    () => allocations.filter((row) => filteredProjectIds.has(row.project)),
    [allocations, filteredProjectIds]
  )
  const filteredExpenses = useMemo(
    () => expenses.filter((row) => filteredProjectIds.has(row.project)),
    [expenses, filteredProjectIds]
  )
  const summary = computeBudgetSummary(
    filteredProjects,
    filteredAllocations,
    filteredExpenses
  )
  const breakdown = computeProjectBudgetBreakdown(
    filteredProjects,
    filteredAllocations,
    filteredExpenses
  )
  const filteredUpdates = useMemo(
    () =>
      updates.filter((update) => filteredProjectIds.has(update.project)),
    [updates, filteredProjectIds]
  )
  const approvalsCount = countApprovedProjects(filteredProjects)

  const locationFilterValue: LocationFilterValue = {
    municipality:
      filters.municipality === "all" ? "" : (filters.municipality ?? ""),
    barangay: filters.barangay === "all" ? "" : (filters.barangay ?? ""),
  }

  function setLocationFilterValue(value: LocationFilterValue) {
    setFilters((prev) => ({
      ...prev,
      municipality: value.municipality || "all",
      barangay: value.barangay || "all",
    }))
  }

  function exportWorkbook(mode: "all" | "current") {
    const book = XLSX.utils.book_new()
    const tabs: ReportTab[] =
      mode === "all" ? ["projects", "budget", "progress", "approvals"] : [activeTab]

    for (const tab of tabs) {
      let rows: Record<string, unknown>[] = []
      if (tab === "projects") {
        rows = filteredProjects.map((project) => ({
          name: project.name,
          category: project.category,
          status: project.status,
          deadline: resolveDeadlineStatus(project.target_end_date, project.progress_pct ?? 0),
          lgu: project.lgu_level,
          location: projectLocationDisplayParts(project).join(" · "),
          budget: project.total_budget,
          progress: project.progress_pct,
        }))
      } else if (tab === "budget") {
        rows = breakdown.map((row) => {
          const projectExpenses = filteredExpenses.filter(
            (expense) => expense.project === row.projectId
          )
          const mainAccounts = Array.from(
            new Set(projectExpenses.map((expense) => expense.main_account).filter(Boolean))
          )
          const subAccounts = Array.from(
            new Set(projectExpenses.map((expense) => expense.sub_account).filter(Boolean))
          )

          return {
            ...row,
            main_accounts: mainAccounts.join(", "),
            sub_accounts: subAccounts.join(", "),
          }
        })
      } else if (tab === "progress") {
        rows = filteredUpdates.map((update) => {
          const project = filteredProjects.find((p) => p.id === update.project)
          return {
            project: project?.name,
            from: update.from_pct,
            to: update.to_pct,
            change: update.to_pct - update.from_pct,
            photo:
              sitePhotoNames(update.site_photo).length > 0 ? "Yes" : "No",
            updated_at: formatDisplayDateTime(update.updated_at ?? update.created),
            updated_by: displayUserRef(update.updated_by, userDisplay),
          }
        })
      } else {
        rows = filteredProjects.map((project) => ({
          name: project.name,
          status: project.status,
          budget: project.total_budget,
          approved_at: project.approved_at
            ? formatDisplayDate(project.approved_at)
            : "Pending",
          approved_by: displayUserRef(project.approved_by, userDisplay, "Pending"),
        }))
      }
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), tab)
    }

    XLSX.writeFile(book, `cppms-reports-${mode}.xlsx`)
  }

  if (loading) {
    return <div className="bg-muted h-32 animate-pulse rounded-md" data-testid="reports-skeleton" />
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          {live ? <LivePill /> : null}
        </div>
        <p className="text-muted-foreground text-sm">
          Generate and export reports as Excel files
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button type="button" data-testid="export-all-sheets" onClick={() => exportWorkbook("all")}>
          Export All Sheets
        </Button>
        <Button type="button" variant="outline" data-testid="export-current-tab" onClick={() => exportWorkbook("current")}>
          Export Current Tab
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Select
          value={filters.status ?? "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              status: value as ReportFilters["status"],
            }))
          }
        >
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category ?? "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              category: value as ReportFilters["category"],
            }))
          }
        >
          <SelectTrigger aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <LocationFilterControls
          locations={locations}
          value={locationFilterValue}
          onChange={setLocationFilterValue}
        />
        <DateRangeFilter
          id="reports-date-range"
          from={filters.dateFrom ?? ""}
          to={filters.dateTo ?? ""}
          onFromChange={(value) =>
            setFilters((prev) => ({ ...prev, dateFrom: value || undefined }))
          }
          onToChange={(value) =>
            setFilters((prev) => ({ ...prev, dateTo: value || undefined }))
          }
        />
      </div>

      <SummaryCardRow
        cards={[
          {
            label: "Projects",
            value: String(filteredProjects.length),
            testId: "reports-projects",
            active: activeTab === "projects",
            onClick: () => setActiveTab("projects"),
          },
          {
            label: "Budget",
            value: formatPhp(summary.totalBudget),
            testId: "reports-budget",
            active: activeTab === "budget",
            onClick: () => setActiveTab("budget"),
          },
          {
            label: "Progress",
            value: String(filteredUpdates.length),
            testId: "reports-progress-count",
            active: activeTab === "progress",
            onClick: () => setActiveTab("progress"),
          },
          {
            label: "Approvals",
            value: String(approvalsCount),
            testId: "reports-approvals-count",
            active: activeTab === "approvals",
            onClick: () => setActiveTab("approvals"),
          },
        ]}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReportTab)}>
        <div className="-mx-1 overflow-x-auto pb-1">
          <TabsList className="w-max min-w-full">
          <TabsTrigger value="projects">Projects ({filteredProjects.length})</TabsTrigger>
          <TabsTrigger value="budget">Budget ({breakdown.length})</TabsTrigger>
          <TabsTrigger value="progress">Progress ({filteredUpdates.length})</TabsTrigger>
          <TabsTrigger value="approvals">Approvals ({approvalsCount})</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="projects">
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Deadline</th>
                  <th className="px-4 py-2 text-left">LGU</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">Budget</th>
                  <th className="px-4 py-2 text-left">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => {
                  const deadline = resolveDeadlineStatus(
                    project.target_end_date,
                    project.progress_pct ?? 0
                  )
                  const tone = deadlineStatusTone(deadline)
                  return (
                    <tr key={project.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">{project.name}</td>
                      <td className="px-4 py-2">{project.category}</td>
                      <td className="px-4 py-2">{project.status}</td>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            tone === "destructive" && "text-destructive",
                            tone === "success" && "text-success",
                            tone === "warning" && "text-warning",
                            tone === "info" && "text-info"
                          )}
                        >
                          {deadline}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{project.lgu_level ?? "—"}</td>
                      <td className="px-4 py-2">
                        {projectLocationDisplayParts(project).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-2">{formatPhp(project.total_budget ?? 0)}</td>
                      <td className="px-4 py-2">{project.progress_pct ?? 0}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="budget">
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">LGU</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">Total</th>
                  <th className="px-4 py-2 text-left">Allocated</th>
                  <th className="px-4 py-2 text-left">Spent</th>
                  <th className="px-4 py-2 text-left">Remaining</th>
                  <th className="px-4 py-2 text-left">Util %</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => {
                  const project = filteredProjects.find((p) => p.id === row.projectId)
                  return (
                    <tr key={row.projectId} className="border-b last:border-b-0">
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2">{project?.category}</td>
                      <td className="px-4 py-2">{project?.lgu_level ?? "—"}</td>
                      <td className="px-4 py-2">
                        {project
                          ? projectLocationDisplayParts(project).join(" · ") || "—"
                          : "—"}
                      </td>
                      <td className="px-4 py-2">{formatPhp(row.totalBudget)}</td>
                      <td className="px-4 py-2">{formatPhp(row.allocated)}</td>
                      <td className="px-4 py-2">{formatPhp(row.spent)}</td>
                      <td className="px-4 py-2">{formatPhp(row.remaining)}</td>
                      <td className="px-4 py-2">{row.spendPct}%</td>
                    </tr>
                  )
                })}
                <tr className="bg-muted/40 font-medium">
                  <td className="px-4 py-2" colSpan={4}>
                    Total
                  </td>
                  <td className="px-4 py-2">{formatPhp(summary.totalBudget)}</td>
                  <td className="px-4 py-2">{formatPhp(summary.totalAllocated)}</td>
                  <td className="px-4 py-2">{formatPhp(summary.totalSpent)}</td>
                  <td className="px-4 py-2">{formatPhp(summary.remaining)}</td>
                  <td className="px-4 py-2">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">LGU</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">From</th>
                  <th className="px-4 py-2 text-left">To</th>
                  <th className="px-4 py-2 text-left">Change</th>
                  <th className="px-4 py-2 text-left">Photo</th>
                  <th className="px-4 py-2 text-left">Updated at</th>
                  <th className="px-4 py-2 text-left">Updated by</th>
                </tr>
              </thead>
              <tbody>
                {filteredUpdates.map((update) => {
                  const project = filteredProjects.find((p) => p.id === update.project)
                  const change = update.to_pct - update.from_pct
                  return (
                    <tr key={update.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">{project?.name}</td>
                      <td className="px-4 py-2">{project?.category}</td>
                      <td className="px-4 py-2">{project?.lgu_level ?? "—"}</td>
                      <td className="px-4 py-2">
                        {project
                          ? projectLocationDisplayParts(project).join(" · ") || "—"
                          : "—"}
                      </td>
                      <td className="px-4 py-2">{update.from_pct}%</td>
                      <td className="px-4 py-2">{update.to_pct}%</td>
                      <td className="px-4 py-2">{change >= 0 ? `+${change}` : change}%</td>
                      <td className="px-4 py-2">
                        <SitePhoto
                          update={update}
                          alt={`${project?.name ?? "Project"} progress photo`}
                          className="h-10 w-10"
                        />
                        {sitePhotoNames(update.site_photo).length === 0
                          ? "—"
                          : null}
                      </td>
                      <td className="px-4 py-2">{formatDisplayDateTime(update.updated_at ?? update.created)}</td>
                      <td className="px-4 py-2">
                        {displayUserRef(update.updated_by, userDisplay)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="approvals">
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">LGU</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Budget</th>
                  <th className="px-4 py-2 text-left">Spent</th>
                  <th className="px-4 py-2 text-left">Savings</th>
                  <th className="px-4 py-2 text-left">Approved at</th>
                  <th className="px-4 py-2 text-left">Approved by</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => {
                  const spent = expenses
                    .filter((row) => row.project === project.id)
                    .reduce((sum, row) => sum + row.amount, 0)
                  const savings = Math.max(0, (project.total_budget ?? 0) - spent)
                  return (
                    <tr key={project.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">{project.name}</td>
                      <td className="px-4 py-2">{project.category}</td>
                      <td className="px-4 py-2">{project.lgu_level ?? "—"}</td>
                      <td className="px-4 py-2">
                        {projectLocationDisplayParts(project).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-2">{project.status}</td>
                      <td className="px-4 py-2">{formatPhp(project.total_budget ?? 0)}</td>
                      <td className="px-4 py-2 text-destructive">{formatPhp(spent)}</td>
                      <td className="px-4 py-2 text-success">{formatPhp(savings)}</td>
                      <td className="px-4 py-2">
                        {project.approved_at ? formatDisplayDate(project.approved_at) : "Pending"}
                      </td>
                      <td className="px-4 py-2">
                        {displayUserRef(project.approved_by, userDisplay, "Pending")}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {canViewActivityLogs ? (
        <section className="space-y-3 rounded-lg border p-4">
          <div>
            <h2 className="text-sm font-semibold">Activity Logs</h2>
            <p className="text-sm text-muted-foreground">
              Super Admin audit trail for project, budget, progress, approval, and user actions.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Actor</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Resource</th>
                  <th className="px-3 py-2 text-left">Outcome</th>
                  <th className="px-3 py-2 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((log) => (
                  <tr key={log.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      {displayUserRef(log.actor_user, userDisplay, log.actor_role)}
                    </td>
                    <td className="px-3 py-2">{log.action}</td>
                    <td className="px-3 py-2">
                      {log.resource}
                      {log.resource_id ? `:${log.resource_id}` : ""}
                    </td>
                    <td className="px-3 py-2">{log.outcome}</td>
                    <td className="px-3 py-2">
                      {formatDisplayDateTime(log.created_at ?? log.created)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
