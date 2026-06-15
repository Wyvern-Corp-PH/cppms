"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  computeBudgetSummary,
  computeProjectBudgetBreakdown,
} from "@workspace/pocketbase/domain/budget-summary"
import { formatDisplayDate, formatDisplayDateTime } from "@workspace/pocketbase/domain/format-display-date"
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
import { LGU_LEVEL, PROJECT_CATEGORY, PROJECT_STATUS } from "@workspace/pocketbase/schema"
import {
  budgetAllocationRecordSchema,
  budgetExpenseRecordSchema,
  parseRecordList,
  progressUpdateRecordSchema,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  ProgressUpdateRecord,
  ProjectRecord,
} from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"

import { PageHeaderBand } from "@/components/page-header-band"
import { SitePhoto } from "@/components/site-photo"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

type ReportTab = "projects" | "budget" | "progress" | "approvals"

const EMPTY_FILTERS: ReportFilters = {
  status: "all",
  category: "all",
  lgu_level: "all",
}

export function PublicReports() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [allocations, setAllocations] = useState<BudgetAllocationRecord[]>([])
  const [expenses, setExpenses] = useState<BudgetExpenseRecord[]>([])
  const [updates, setUpdates] = useState<ProgressUpdateRecord[]>([])
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS)
  const [activeTab, setActiveTab] = useState<ReportTab>("projects")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const pb = getPocketBase()
    const [projectRows, allocationRows, expenseRows, updateRows] = await Promise.all([
      pb.collection("projects").getFullList(),
      pb.collection("budget_allocations").getFullList(),
      pb.collection("budget_expenses").getFullList(),
      pb.collection("progress_updates").getFullList(),
    ])
    setProjects(parseRecordList(projectRecordSchema, projectRows))
    setAllocations(parseRecordList(budgetAllocationRecordSchema, allocationRows))
    setExpenses(parseRecordList(budgetExpenseRecordSchema, expenseRows))
    setUpdates(parseRecordList(progressUpdateRecordSchema, updateRows))
    setLoading(false)
  }, [])

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [load])

  const { live } = usePocketBaseRealtime(
    ["projects", "budget_allocations", "budget_expenses", "progress_updates"],
    () => {
      void load()
    }
  )

  const filteredProjects = useMemo(
    () => filterReportProjects(projects, filters),
    [projects, filters]
  )
  const summary = computeBudgetSummary(filteredProjects, allocations, expenses)
  const breakdown = computeProjectBudgetBreakdown(filteredProjects, allocations, expenses)
  const filteredUpdates = useMemo(
    () =>
      updates.filter((update) =>
        filteredProjects.some((project) => project.id === update.project)
      ),
    [updates, filteredProjects]
  )
  const approvalsCount = countApprovedProjects(filteredProjects)

  if (loading) {
    return <div className="bg-muted h-32 animate-pulse rounded-md" data-testid="reports-skeleton" />
  }

  return (
    <div className="space-y-6">
      <PageHeaderBand
        title="Reports"
        context="Generate and export reports as Excel files"
        live={live}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          value={filters.status ?? "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value as ReportFilters["status"] }))
          }
        >
          <SelectTrigger aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {PROJECT_STATUS.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category ?? "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, category: value as ReportFilters["category"] }))
          }
        >
          <SelectTrigger aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PROJECT_CATEGORY.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.lgu_level ?? "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, lgu_level: value as ReportFilters["lgu_level"] }))
          }
        >
          <SelectTrigger aria-label="Filter by LGU">
            <SelectValue />
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
        <Input
          aria-label="Filter from date"
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
        />
        <Input
          aria-label="Filter to date"
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
        />
      </div>

      <SummaryCardRow
        cards={[
          {
            label: "Projects",
            value: String(filteredProjects.length),
            active: activeTab === "projects",
            onClick: () => setActiveTab("projects"),
          },
          {
            label: "Budget",
            value: formatPhp(summary.totalBudget),
            active: activeTab === "budget",
            onClick: () => setActiveTab("budget"),
          },
          {
            label: "Progress",
            value: String(filteredUpdates.length),
            active: activeTab === "progress",
            onClick: () => setActiveTab("progress"),
          },
          {
            label: "Approvals",
            value: String(approvalsCount),
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
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Deadline</th>
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
                    <tr key={project.id} className="border-b">
                      <td className="px-4 py-2">{project.name}</td>
                      <td className="px-4 py-2">{project.category}</td>
                      <td className="px-4 py-2">{project.status}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className={cn(tone === "destructive" && "text-destructive")}>
                          {deadline}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{project.progress_pct ?? 0}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="budget">
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Total</th>
                  <th className="px-4 py-2 text-left">Allocated</th>
                  <th className="px-4 py-2 text-left">Spent</th>
                  <th className="px-4 py-2 text-left">Remaining</th>
                  <th className="px-4 py-2 text-left">Util %</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr key={row.projectId} className="border-b">
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2">{formatPhp(row.totalBudget)}</td>
                    <td className="px-4 py-2">{formatPhp(row.allocated)}</td>
                    <td className="px-4 py-2">{formatPhp(row.spent)}</td>
                    <td className="px-4 py-2">{formatPhp(row.remaining)}</td>
                    <td className="px-4 py-2">{row.spendPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="progress">
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">From</th>
                  <th className="px-4 py-2 text-left">To</th>
                  <th className="px-4 py-2 text-left">Change</th>
                  <th className="px-4 py-2 text-left">Photo</th>
                  <th className="px-4 py-2 text-left">Updated at</th>
                </tr>
              </thead>
              <tbody>
                {filteredUpdates.map((update) => {
                  const project = filteredProjects.find((p) => p.id === update.project)
                  const change = update.to_pct - update.from_pct
                  return (
                    <tr key={update.id} className="border-b">
                      <td className="px-4 py-2">{project?.name}</td>
                      <td className="px-4 py-2">{update.from_pct}%</td>
                      <td className="px-4 py-2">{update.to_pct}%</td>
                      <td className="px-4 py-2">{change >= 0 ? `+${change}` : change}%</td>
                      <td className="px-4 py-2">
                        <SitePhoto
                          update={update}
                          alt={`${project?.name ?? "Project"} progress photo`}
                          className="h-10 w-10"
                        />
                        {!update.site_photo ? "—" : null}
                      </td>
                      <td className="px-4 py-2">{formatDisplayDateTime(update.updated_at ?? update.created)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="approvals">
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Budget</th>
                  <th className="px-4 py-2 text-left">Approved at</th>
                  <th className="px-4 py-2 text-left">Approved by</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b">
                    <td className="px-4 py-2">{project.name}</td>
                    <td className="px-4 py-2">{project.status}</td>
                    <td className="px-4 py-2">{formatPhp(project.total_budget ?? 0)}</td>
                    <td className="px-4 py-2">
                      {project.approved_at ? formatDisplayDate(project.approved_at) : "Pending"}
                    </td>
                    <td className="px-4 py-2">{project.approved_by ?? "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
