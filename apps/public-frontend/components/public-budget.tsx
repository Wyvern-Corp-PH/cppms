"use client"

import { useCallback, useEffect, useState } from "react"

import {
  computeBudgetSummary,
  computeProjectBudgetBreakdown,
} from "@workspace/pocketbase/domain/budget-summary"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import {
  budgetAllocationRecordSchema,
  budgetExpenseRecordSchema,
  parseRecordList,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type { ProjectRecord } from "@workspace/pocketbase/types"
import { Progress } from "@workspace/ui/components/progress"

import { PageHeaderBand } from "@/components/page-header-band"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

export function PublicBudget() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [summary, setSummary] = useState({
    totalBudget: 0,
    totalAllocated: 0,
    totalSpent: 0,
    remaining: 0,
  })
  const [breakdown, setBreakdown] = useState(
    [] as ReturnType<typeof computeProjectBudgetBreakdown>
  )
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const pb = getPocketBase()
    const [projectRows, allocationRows, expenseRows] = await Promise.all([
      pb.collection("projects").getFullList(),
      pb.collection("budget_allocations").getFullList(),
      pb.collection("budget_expenses").getFullList(),
    ])
    const parsedProjects = parseRecordList(projectRecordSchema, projectRows)
    const allocations = parseRecordList(budgetAllocationRecordSchema, allocationRows)
    const expenses = parseRecordList(budgetExpenseRecordSchema, expenseRows)
    setProjects(parsedProjects)
    setSummary(computeBudgetSummary(parsedProjects, allocations, expenses))
    setBreakdown(computeProjectBudgetBreakdown(parsedProjects, allocations, expenses))
    setLoading(false)
  }, [])

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [load])

  const { live } = usePocketBaseRealtime(
    ["projects", "budget_allocations", "budget_expenses"],
    () => {
      void load()
    }
  )

  if (loading) {
    return <div className="bg-muted h-32 animate-pulse rounded-md" data-testid="budget-skeleton" />
  }

  const allocatedPct =
    summary.totalBudget > 0
      ? Math.round((summary.totalAllocated / summary.totalBudget) * 100)
      : 0
  const spentPct =
    summary.totalBudget > 0
      ? Math.round((summary.totalSpent / summary.totalBudget) * 100)
      : 0

  return (
    <div className="space-y-6">
      <PageHeaderBand
        title="Provincial budget"
        context="Read-only budget summary and per-project breakdown."
        live={live}
      />

      <SummaryCardRow
        cards={[
          {
            label: "Total budget",
            value: formatPhp(summary.totalBudget),
            footer: `${projects.length} projects`,
            testId: "budget-total",
          },
          {
            label: "Allocated",
            value: formatPhp(summary.totalAllocated),
            progressPct: allocatedPct,
            testId: "budget-allocated",
          },
          {
            label: "Spent",
            value: formatPhp(summary.totalSpent),
            progressPct: spentPct,
            testId: "budget-spent",
          },
          {
            label: "Remaining",
            value: formatPhp(summary.remaining),
            testId: "budget-remaining",
          },
        ]}
      />

      <section className="space-y-3" data-testid="budget-breakdown">
        <h2 className="text-sm font-semibold">Per-project breakdown</h2>
        <ul className="space-y-3">
          {breakdown.map((row) => (
            <li key={row.projectId} className="rounded-[var(--radius-lg)] border border-border p-4">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-medium">
                  {row.name}
                  {row.location ? ` · ${row.location}` : ""}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  Total {formatPhp(row.totalBudget)} · Alloc {formatPhp(row.allocated)} · Spent{" "}
                  {formatPhp(row.spent)} · Rem {formatPhp(row.remaining)}
                </span>
              </div>
              <Progress className="mt-2 h-1.5" value={row.spendPct} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
