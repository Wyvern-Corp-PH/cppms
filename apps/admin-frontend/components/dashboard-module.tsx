"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { computeBudgetSummary } from "@workspace/pocketbase/domain/budget-summary"
import { resolveDeadlineStatus, deadlineStatusTone } from "@workspace/pocketbase/domain/deadline-status"
import { countProgressBuckets } from "@workspace/pocketbase/domain/progress-summary"
import { isApprovalEligible } from "@workspace/pocketbase/domain/project-filters"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import {
  budgetAllocationRecordSchema,
  budgetExpenseRecordSchema,
  parseRecordList,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  ProjectRecord,
} from "@workspace/pocketbase/types"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { PageHeaderBand } from "@/components/page-header-band"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { adminNavItems } from "@/lib/admin-nav"
import { getPocketBase } from "@/lib/pocketbase"

const quickLinks = adminNavItems.filter((item) => item.href !== "/dashboard")

export function DashboardModule() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [allocations, setAllocations] = useState<BudgetAllocationRecord[]>([])
  const [expenses, setExpenses] = useState<BudgetExpenseRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const pb = getPocketBase()
    const [projectRows, allocationRows, expenseRows] = await Promise.all([
      pb.collection("projects").getFullList(),
      pb.collection("budget_allocations").getFullList(),
      pb.collection("budget_expenses").getFullList(),
    ])
    setProjects(parseRecordList(projectRecordSchema, projectRows))
    setAllocations(parseRecordList(budgetAllocationRecordSchema, allocationRows))
    setExpenses(parseRecordList(budgetExpenseRecordSchema, expenseRows))
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

  const budget = useMemo(
    () => computeBudgetSummary(projects, allocations, expenses),
    [projects, allocations, expenses]
  )
  const progress = useMemo(() => countProgressBuckets(projects), [projects])
  const awaitingApproval = useMemo(
    () =>
      projects.filter(
        (project) => isApprovalEligible(project) && project.approval_status !== "approved"
      ).length,
    [projects]
  )

  if (loading) {
    return (
      <div className="space-y-4" data-testid="dashboard-skeleton">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="bg-muted h-24 animate-pulse rounded-[var(--radius-lg)]" />
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
          { label: "Projects", value: String(projects.length) },
          { label: "Budget", value: formatPhp(budget.totalBudget) },
          { label: "Awaiting", value: String(awaitingApproval) },
        ]}
      />

      {awaitingApproval > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3 text-sm">
          <p>{awaitingApproval} completed project(s) need approval.</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/approvals">Review queue</Link>
          </Button>
        </div>
      ) : null}

      <SummaryCardRow
        cards={[
          { label: "Active projects", value: String(projects.length), testId: "dashboard-projects" },
          { label: "Total budget", value: formatPhp(budget.totalBudget), testId: "dashboard-budget" },
          { label: "On track", value: String(progress.onTrack), testId: "dashboard-on-track" },
          { label: "Awaiting approval", value: String(awaitingApproval), testId: "dashboard-approvals" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Budget utilization</h2>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{utilizationPct}% spent</p>
          <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
            <span className="bg-primary block h-full" style={{ width: `${utilizationPct}%` }} />
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Deadline heatmap</h2>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {projects.slice(0, 28).map((project, index) => {
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
