"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  computeBudgetSummary,
  computeProjectBudgetBreakdown,
  formatAllocationAmount,
  formatExpenseAmount,
} from "@workspace/pocketbase/domain/budget-summary"
import { formatDisplayDate } from "@workspace/pocketbase/domain/format-display-date"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import {
  budgetAllocationMutateSchema,
  budgetAllocationRecordSchema,
  budgetExpenseMutateSchema,
  budgetExpenseRecordSchema,
  fieldErrorsFromZod,
  parseRecordList,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  ProjectRecord,
} from "@workspace/pocketbase/types"
import { EXPENSE_CATEGORY } from "@workspace/pocketbase/schema"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"

import { DocumentUploadField } from "@/components/document-upload-field"
import { PageHeaderBand } from "@/components/page-header-band"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index)

export function BudgetModule() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [allocations, setAllocations] = useState<BudgetAllocationRecord[]>([])
  const [expenses, setExpenses] = useState<BudgetExpenseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tabProjectFilter, setTabProjectFilter] = useState("all")
  const [tabYearFilter, setTabYearFilter] = useState(String(new Date().getFullYear()))
  const [allocationOpen, setAllocationOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [projectId, setProjectId] = useState("")
  const [amount, setAmount] = useState("")
  const [allocationYear, setAllocationYear] = useState(String(new Date().getFullYear()))
  const [allocationDescription, setAllocationDescription] = useState("")
  const [expenseCategory, setExpenseCategory] =
    useState<BudgetExpenseRecord["category"]>("Materials")
  const [receiptNumber, setReceiptNumber] = useState("")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [expenseDescription, setExpenseDescription] = useState("")
  const [moaFile, setMoaFile] = useState<File | null>(null)
  const [agreementFile, setAgreementFile] = useState<File | null>(null)
  const [supportingFiles, setSupportingFiles] = useState<File[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function clearAllocationUploads() {
    setMoaFile(null)
    setAgreementFile(null)
    setSupportingFiles([])
  }

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
    ["projects", "budget_allocations", "budget_expenses"],
    () => {
      void load()
    }
  )

  const summary = computeBudgetSummary(projects, allocations, expenses)
  const breakdown = computeProjectBudgetBreakdown(projects, allocations, expenses)
  const allocatedPct =
    summary.totalBudget > 0
      ? Math.round((summary.totalAllocated / summary.totalBudget) * 100)
      : 0
  const spentPct =
    summary.totalBudget > 0
      ? Math.round((summary.totalSpent / summary.totalBudget) * 100)
      : 0

  const filteredAllocations = useMemo(
    () =>
      allocations.filter((row) => {
        if (tabProjectFilter !== "all" && row.project !== tabProjectFilter) return false
        if (tabYearFilter !== "all" && String(row.year) !== tabYearFilter) return false
        return true
      }),
    [allocations, tabProjectFilter, tabYearFilter]
  )

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((row) => {
        if (tabProjectFilter !== "all" && row.project !== tabProjectFilter) return false
        if (tabYearFilter !== "all" && !row.date.startsWith(tabYearFilter)) return false
        return true
      }),
    [expenses, tabProjectFilter, tabYearFilter]
  )

  const projectName = (id: string) =>
    projects.find((project) => project.id === id)?.name ?? id

  async function saveAllocation() {
    const parsed = budgetAllocationMutateSchema.safeParse({
      project: projectId,
      amount,
      year: allocationYear,
      date: new Date().toISOString().slice(0, 10),
      description: allocationDescription || undefined,
    })

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    setFieldErrors({})
    const pb = getPocketBase()
    const hasFiles = moaFile || agreementFile || supportingFiles.length > 0

    if (hasFiles) {
      const formData = new FormData()
      for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== undefined) formData.append(key, String(value))
      }
      if (moaFile) formData.append("moa_file", moaFile)
      if (agreementFile) formData.append("agreement_file", agreementFile)
      for (const file of supportingFiles) {
        formData.append("supporting_docs", file)
      }
      await pb.collection("budget_allocations").create(formData)
    } else {
      await pb.collection("budget_allocations").create(parsed.data)
    }

    setAllocationOpen(false)
    await load()
  }

  async function saveExpense() {
    const parsed = budgetExpenseMutateSchema.safeParse({
      project: projectId,
      amount,
      category: expenseCategory,
      date: expenseDate,
      receipt_number: receiptNumber || undefined,
      description: expenseDescription || undefined,
    })

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    setFieldErrors({})
    const pb = getPocketBase()
    await pb.collection("budget_expenses").create(parsed.data)
    setExpenseOpen(false)
    await load()
  }

  if (loading) {
    return <div className="bg-muted h-32 animate-pulse rounded-md" data-testid="budget-skeleton" />
  }

  return (
    <div className="space-y-6">
      <PageHeaderBand
        title="Budget"
        context="Allocations and expenses across all projects."
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Project budget breakdown</h2>
        <ul className="space-y-3" data-testid="budget-breakdown">
          {breakdown.map((row) => (
            <li key={row.projectId} className="rounded-[var(--radius-lg)] border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {row.name}
                  {row.location ? ` · ${row.location}` : ""}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  Total {formatPhp(row.totalBudget)} · Alloc {formatPhp(row.allocated)} · Spent{" "}
                  {formatPhp(row.spent)} · Rem {formatPhp(row.remaining)}
                </span>
              </div>
              <Progress className="mt-2 h-1.5" value={row.spendPct} aria-label={`${row.name} spend`} />
            </li>
          ))}
        </ul>
      </section>

      <Tabs defaultValue="allocations">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="-mx-1 overflow-x-auto pb-1">
            <TabsList className="w-max min-w-full">
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={tabProjectFilter} onValueChange={setTabProjectFilter}>
              <SelectTrigger className="w-[180px]" aria-label="Filter by project">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tabYearFilter} onValueChange={setTabYearFilter}>
              <SelectTrigger className="w-[120px]" aria-label="Filter by year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="allocations" className="space-y-4">
          <Button
            type="button"
            data-testid="allocate-budget"
            onClick={() => {
              setFieldErrors({})
              clearAllocationUploads()
              setAllocationOpen(true)
            }}
          >
            + Allocate
          </Button>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Year</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Allocated by</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2">{projectName(row.project)}</td>
                    <td className="px-4 py-2 text-green-600">
                      {formatAllocationAmount(row.amount)} {formatPhp(row.amount)}
                    </td>
                    <td className="px-4 py-2">{row.year}</td>
                    <td className="px-4 py-2">{row.description ?? "—"}</td>
                    <td className="px-4 py-2">{formatDisplayDate(row.date)}</td>
                    <td className="px-4 py-2">{row.allocated_by ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Button type="button" data-testid="record-expense" onClick={() => { setFieldErrors({}); setExpenseOpen(true) }}>
            + Record Expense
          </Button>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Receipt #</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2">{projectName(row.project)}</td>
                    <td className="px-4 py-2 text-destructive">
                      {formatExpenseAmount(row.amount)} {formatPhp(row.amount)}
                    </td>
                    <td className="px-4 py-2">{row.category}</td>
                    <td className="px-4 py-2">{formatDisplayDate(row.date)}</td>
                    <td className="px-4 py-2">{row.receipt_number ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={allocationOpen}
        onOpenChange={(open) => {
          setAllocationOpen(open)
          if (!open) clearAllocationUploads()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate budget</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="allocation-amount">Total allocated budget amount</Label>
            <Input id="allocation-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Label>Year</Label>
            <Select value={allocationYear} onValueChange={setAllocationYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="allocation-description">Description</Label>
            <Textarea id="allocation-description" value={allocationDescription} onChange={(e) => setAllocationDescription(e.target.value)} />
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium">Required documents</p>
              <DocumentUploadField
                id="allocation-moa"
                label="Memorandum of Agreement"
                files={moaFile ? [moaFile] : []}
                onChange={(files) => setMoaFile(files[0] ?? null)}
              />
              <DocumentUploadField
                id="allocation-agreement"
                label="Province/Barangay Agreement"
                files={agreementFile ? [agreementFile] : []}
                onChange={(files) => setAgreementFile(files[0] ?? null)}
              />
              <DocumentUploadField
                id="allocation-supporting"
                label="Supporting project documents"
                multiple
                files={supportingFiles}
                onChange={setSupportingFiles}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void saveAllocation()}>Allocate budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger aria-label="Expense project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="expense-amount">Amount (PHP)</Label>
            <Input id="expense-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Label htmlFor="receipt-number">Receipt number</Label>
            <Input id="receipt-number" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
            <Select value={expenseCategory} onValueChange={(v) => setExpenseCategory(v as BudgetExpenseRecord["category"])}>
              <SelectTrigger aria-label="Expense category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORY.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="expense-date">Expense date</Label>
            <Input id="expense-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            <Label htmlFor="expense-description">Description</Label>
            <Textarea id="expense-description" value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void saveExpense()}>Record expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
