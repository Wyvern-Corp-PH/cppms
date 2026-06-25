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
import { TableCell, TableRow } from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { DataTable, type ColumnDef } from "@/components/data-table"
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

  const projectColumns: ColumnDef<ProjectRecord>[] = [
    { accessorKey: "name", header: "Project" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "status", header: "Status" },
    {
      id: "deadline",
      header: "Deadline",
      cell: ({ row }) => {
        const deadline = resolveDeadlineStatus(
          row.original.target_end_date,
          row.original.progress_pct ?? 0
        )
        const tone = deadlineStatusTone(deadline)

        return (
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
        )
      },
    },
    {
      accessorKey: "lgu_level",
      header: "LGU",
      cell: ({ row }) => row.original.lgu_level ?? "—",
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) =>
        projectLocationDisplayParts(row.original).join(" · ") || "—",
    },
    {
      accessorKey: "total_budget",
      header: "Budget",
      cell: ({ row }) => formatPhp(row.original.total_budget ?? 0),
    },
    {
      accessorKey: "progress_pct",
      header: "Progress",
      cell: ({ row }) => `${row.original.progress_pct ?? 0}%`,
    },
  ]

  const budgetColumns: ColumnDef<(typeof breakdown)[number]>[] = [
    { accessorKey: "name", header: "Project" },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) =>
        filteredProjects.find((project) => project.id === row.original.projectId)
          ?.category,
    },
    {
      id: "lgu",
      header: "LGU",
      cell: ({ row }) =>
        filteredProjects.find((project) => project.id === row.original.projectId)
          ?.lgu_level ?? "—",
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const project = filteredProjects.find(
          (item) => item.id === row.original.projectId
        )
        return project ? projectLocationDisplayParts(project).join(" · ") || "—" : "—"
      },
    },
    {
      accessorKey: "totalBudget",
      header: "Total",
      cell: ({ row }) => formatPhp(row.original.totalBudget),
    },
    {
      accessorKey: "allocated",
      header: "Allocated",
      cell: ({ row }) => formatPhp(row.original.allocated),
    },
    {
      accessorKey: "spent",
      header: "Spent",
      cell: ({ row }) => formatPhp(row.original.spent),
    },
    {
      accessorKey: "remaining",
      header: "Remaining",
      cell: ({ row }) => formatPhp(row.original.remaining),
    },
    {
      accessorKey: "spendPct",
      header: "Util %",
      cell: ({ row }) => `${row.original.spendPct}%`,
    },
  ]

  const progressColumns: ColumnDef<ProgressUpdateRecord>[] = [
    {
      id: "project",
      header: "Project",
      cell: ({ row }) =>
        filteredProjects.find((project) => project.id === row.original.project)
          ?.name,
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) =>
        filteredProjects.find((project) => project.id === row.original.project)
          ?.category,
    },
    {
      id: "lgu",
      header: "LGU",
      cell: ({ row }) =>
        filteredProjects.find((project) => project.id === row.original.project)
          ?.lgu_level ?? "—",
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const project = filteredProjects.find(
          (item) => item.id === row.original.project
        )
        return project ? projectLocationDisplayParts(project).join(" · ") || "—" : "—"
      },
    },
    {
      accessorKey: "from_pct",
      header: "From",
      cell: ({ row }) => `${row.original.from_pct}%`,
    },
    {
      accessorKey: "to_pct",
      header: "To",
      cell: ({ row }) => `${row.original.to_pct}%`,
    },
    {
      id: "change",
      header: "Change",
      cell: ({ row }) => {
        const change = row.original.to_pct - row.original.from_pct
        return `${change >= 0 ? `+${change}` : change}%`
      },
    },
    {
      id: "photo",
      header: "Photo",
      cell: ({ row }) => {
        const project = filteredProjects.find(
          (item) => item.id === row.original.project
        )
        return (
          <>
            <SitePhoto
              update={row.original}
              alt={`${project?.name ?? "Project"} progress photo`}
              className="h-10 w-10"
            />
            {sitePhotoNames(row.original.site_photo).length === 0 ? "—" : null}
          </>
        )
      },
    },
    {
      id: "updated_at",
      header: "Updated at",
      cell: ({ row }) =>
        formatDisplayDateTime(row.original.updated_at ?? row.original.created),
    },
    {
      accessorKey: "updated_by",
      header: "Updated by",
      cell: ({ row }) => displayUserRef(row.original.updated_by, userDisplay),
    },
  ]

  const approvalColumns: ColumnDef<ProjectRecord>[] = [
    { accessorKey: "name", header: "Project" },
    { accessorKey: "category", header: "Category" },
    {
      accessorKey: "lgu_level",
      header: "LGU",
      cell: ({ row }) => row.original.lgu_level ?? "—",
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) =>
        projectLocationDisplayParts(row.original).join(" · ") || "—",
    },
    { accessorKey: "status", header: "Status" },
    {
      accessorKey: "total_budget",
      header: "Budget",
      cell: ({ row }) => formatPhp(row.original.total_budget ?? 0),
    },
    {
      id: "spent",
      header: "Spent",
      cell: ({ row }) => {
        const spent = expenses
          .filter((expense) => expense.project === row.original.id)
          .reduce((sum, expense) => sum + expense.amount, 0)
        return <span className="text-destructive">{formatPhp(spent)}</span>
      },
    },
    {
      id: "savings",
      header: "Savings",
      cell: ({ row }) => {
        const spent = expenses
          .filter((expense) => expense.project === row.original.id)
          .reduce((sum, expense) => sum + expense.amount, 0)
        const savings = Math.max(0, (row.original.total_budget ?? 0) - spent)
        return <span className="text-success">{formatPhp(savings)}</span>
      },
    },
    {
      accessorKey: "approved_at",
      header: "Approved at",
      cell: ({ row }) =>
        row.original.approved_at
          ? formatDisplayDate(row.original.approved_at)
          : "Pending",
    },
    {
      accessorKey: "approved_by",
      header: "Approved by",
      cell: ({ row }) =>
        displayUserRef(row.original.approved_by, userDisplay, "Pending"),
    },
  ]

  const activityLogColumns: ColumnDef<ActivityLogRecord>[] = [
    {
      accessorKey: "actor_user",
      header: "Actor",
      cell: ({ row }) =>
        displayUserRef(row.original.actor_user, userDisplay, row.original.actor_role),
    },
    { accessorKey: "action", header: "Action" },
    {
      accessorKey: "resource",
      header: "Resource",
      cell: ({ row }) =>
        `${row.original.resource}${row.original.resource_id ? `:${row.original.resource_id}` : ""}`,
    },
    { accessorKey: "outcome", header: "Outcome" },
    {
      id: "when",
      header: "When",
      cell: ({ row }) =>
        formatDisplayDateTime(row.original.created_at ?? row.original.created),
    },
  ]

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
          <DataTable
            columns={projectColumns}
            data={filteredProjects}
            getRowId={(project) => project.id}
          />
        </TabsContent>

        <TabsContent value="budget">
          <DataTable
            columns={budgetColumns}
            data={breakdown}
            getRowId={(row) => row.projectId}
            renderAfterRows={
              <TableRow className="bg-muted/40 font-medium">
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell>{formatPhp(summary.totalBudget)}</TableCell>
                <TableCell>{formatPhp(summary.totalAllocated)}</TableCell>
                <TableCell>{formatPhp(summary.totalSpent)}</TableCell>
                <TableCell>{formatPhp(summary.remaining)}</TableCell>
                <TableCell>—</TableCell>
              </TableRow>
            }
          />
        </TabsContent>

        <TabsContent value="progress">
          <DataTable
            columns={progressColumns}
            data={filteredUpdates}
            getRowId={(update) => update.id}
          />
        </TabsContent>

        <TabsContent value="approvals">
          <DataTable
            columns={approvalColumns}
            data={filteredProjects}
            getRowId={(project) => project.id}
          />
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
          <DataTable
            columns={activityLogColumns}
            data={activityLogs}
            getRowId={(log) => log.id}
            className="rounded-md"
          />
        </section>
      ) : null}
    </div>
  )
}
