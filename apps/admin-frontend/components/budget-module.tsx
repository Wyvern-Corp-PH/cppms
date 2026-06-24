"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  canAccess,
  filterProjectsForUser,
} from "@workspace/pocketbase/domain/access-control"
import {
  computeBudgetSummary,
  computeProjectBudgetBreakdown,
  formatAllocationAmount,
  formatExpenseAmount,
} from "@workspace/pocketbase/domain/budget-summary"
import {
  buildUserDisplayMap,
  displayUserRef,
  type UserDisplayRecord,
} from "@workspace/pocketbase/domain/user-display"
import { formatDisplayDate } from "@workspace/pocketbase/domain/format-display-date"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import {
  budgetAllocationMutateSchema,
  budgetAllocationRecordSchema,
  budgetExpenseMutateSchema,
  budgetExpenseRecordSchema,
  fieldErrorsFromZod,
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
import { FUND_TYPE } from "@workspace/pocketbase/schema"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

import { DateRangeFilter } from "@/components/date-range-filter"
import { DocumentUploadField } from "@/components/document-upload-field"
import {
  LocationFilterControls,
  projectMatchesLocationFilters,
  type LocationFilterValue,
} from "@/components/location-filter-controls"
import { PageHeaderBand } from "@/components/page-header-band"
import { SummaryCardRow } from "@/components/summary-card-row"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index)
const FUND_SOURCE_OPTIONS = ["General Fund", "National Grant", "Trust Fund"]
const FUNDING_YEAR_OPTIONS = YEAR_OPTIONS.map(String)

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

export function BudgetModule() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [allocations, setAllocations] = useState<BudgetAllocationRecord[]>([])
  const [expenses, setExpenses] = useState<BudgetExpenseRecord[]>([])
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [users, setUsers] = useState<UserDisplayRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tabProjectFilter, setTabProjectFilter] = useState("all")
  const [tabYearFilter, setTabYearFilter] = useState(String(new Date().getFullYear()))
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [locationFilters, setLocationFilters] = useState<LocationFilterValue>({
    municipality: "",
    barangay: "",
  })
  const [allocationOpen, setAllocationOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [projectId, setProjectId] = useState("")
  const [amount, setAmount] = useState("")
  const [allocationYear, setAllocationYear] = useState(String(new Date().getFullYear()))
  const [allocationDescription, setAllocationDescription] = useState("")
  const [fundSource, setFundSource] = useState("")
  const [fundingYears, setFundingYears] = useState(String(new Date().getFullYear()))
  const [fundType, setFundType] = useState<BudgetExpenseRecord["fund_type"]>("Local")
  const [fundTypeOther, setFundTypeOther] = useState("")
  const [receiptNumber, setReceiptNumber] = useState("")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [expenseDescription, setExpenseDescription] = useState("")
  const [moaFile, setMoaFile] = useState<File | null>(null)
  const [resolutionFile, setResolutionFile] = useState<File | null>(null)
  const [supportingFiles, setSupportingFiles] = useState<File[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const actor = getPocketBase().authStore?.record
  const canCreateAllocations = actor
    ? canAccess(actor, "budget_allocations.create")
    : true
  const canCreateExpenses = actor
    ? canAccess(actor, "budget_expenses.create")
    : true

  function clearAllocationUploads() {
    setMoaFile(null)
    setResolutionFile(null)
    setSupportingFiles([])
  }

  const load = useCallback(async () => {
    setLoading(true)
    const pb = getPocketBase()
    const [projectRows, allocationRows, expenseRows, locationRows, userRows] = await Promise.all([
      pb.collection("projects").getFullList(),
      pb.collection("budget_allocations").getFullList(),
      pb.collection("budget_expenses").getFullList(),
      pb.collection("locations").getFullList().catch(() => []),
      pb.collection("users").getFullList().catch(() => []),
    ])
    setProjects(parseRecordList(projectRecordSchema, projectRows))
    setAllocations(parseRecordList(budgetAllocationRecordSchema, allocationRows))
    setExpenses(parseRecordList(budgetExpenseRecordSchema, expenseRows))
    setLocations(parseRecordList(locationRecordSchema, locationRows))
    setUsers(userRows as UserDisplayRecord[])
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

  const scopedProjects = useMemo(
    () => (actor?.role ? filterProjectsForUser(actor, projects) : projects),
    [actor, projects]
  )
  const locationFilteredProjects = useMemo(
    () =>
      scopedProjects.filter((project) =>
        projectMatchesLocationFilters(project, locationFilters)
      ),
    [locationFilters, scopedProjects]
  )
  const locationFilteredProjectIds = useMemo(
    () => new Set(locationFilteredProjects.map((project) => project.id)),
    [locationFilteredProjects]
  )
  const locationFilteredAllocations = useMemo(
    () =>
      allocations.filter(
        (row) =>
          locationFilteredProjectIds.has(row.project) &&
          recordInDateRange(row.date, dateFrom, dateTo)
      ),
    [allocations, dateFrom, dateTo, locationFilteredProjectIds]
  )
  const locationFilteredExpenses = useMemo(
    () => expenses.filter((row) => locationFilteredProjectIds.has(row.project)),
    [expenses, locationFilteredProjectIds]
  )
  const dateFilteredExpenses = useMemo(
    () =>
      locationFilteredExpenses.filter((row) =>
        recordInDateRange(row.date, dateFrom, dateTo)
      ),
    [dateFrom, dateTo, locationFilteredExpenses]
  )
  const summary = computeBudgetSummary(
    locationFilteredProjects,
    locationFilteredAllocations,
    dateFilteredExpenses
  )
  const breakdown = computeProjectBudgetBreakdown(
    locationFilteredProjects,
    locationFilteredAllocations,
    dateFilteredExpenses
  )
  const userDisplay = useMemo(
    () => buildUserDisplayMap(users, actor ? [actor] : []),
    [actor, users]
  )
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
      locationFilteredAllocations.filter((row) => {
        if (tabProjectFilter !== "all" && row.project !== tabProjectFilter) return false
        if (tabYearFilter !== "all" && String(row.year) !== tabYearFilter) return false
        return true
      }),
    [locationFilteredAllocations, tabProjectFilter, tabYearFilter]
  )

  const filteredExpenses = useMemo(
    () =>
      dateFilteredExpenses.filter((row) => {
        if (tabProjectFilter !== "all" && row.project !== tabProjectFilter) return false
        if (tabYearFilter !== "all" && !row.date.startsWith(tabYearFilter)) return false
        return true
      }),
    [dateFilteredExpenses, tabProjectFilter, tabYearFilter]
  )

  const projectName = (id: string) =>
    projects.find((project) => project.id === id)?.name ?? id

  async function saveAllocation() {
    if (!canCreateAllocations) {
      return
    }

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
    const hasFiles = moaFile || resolutionFile || supportingFiles.length > 0

    if (hasFiles) {
      const formData = new FormData()
      for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== undefined) formData.append(key, String(value))
      }
      if (moaFile) formData.append("moa_file", moaFile)
      if (resolutionFile) formData.append("resolution_file", resolutionFile)
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
    if (!canCreateExpenses) {
      return
    }

    const parsed = budgetExpenseMutateSchema.safeParse({
      project: projectId,
      amount,
      fund_source: fundSource,
      funding_years: fundingYears,
      fund_type: fundType,
      fund_type_other: fundType === "Other" ? fundTypeOther : undefined,
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
            <li key={row.projectId} className="rounded-lg border border-border p-4">
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
            <LocationFilterControls
              locations={locations}
              value={locationFilters}
              onChange={setLocationFilters}
            />
            <DateRangeFilter
              id="budget-date-range"
              from={dateFrom}
              to={dateTo}
              onFromChange={setDateFrom}
              onToChange={setDateTo}
            />
          </div>
        </div>

        <TabsContent value="allocations" className="space-y-4">
          {canCreateAllocations ? (
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
          ) : null}
          <div className="overflow-x-auto rounded-lg border">
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
                      {formatAllocationAmount(row.amount)}
                    </td>
                    <td className="px-4 py-2">{row.year}</td>
                    <td className="px-4 py-2">{row.description ?? "—"}</td>
                    <td className="px-4 py-2">{formatDisplayDate(row.date)}</td>
                    <td className="px-4 py-2">
                      {displayUserRef(row.allocated_by, userDisplay)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          {canCreateExpenses ? (
            <Button
              type="button"
              data-testid="released-amount"
              onClick={() => {
                setFieldErrors({})
                setExpenseOpen(true)
              }}
            >
              + Released Amount
            </Button>
          ) : null}
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Fund Source</th>
                  <th className="px-4 py-2 text-left">Funding Years</th>
                  <th className="px-4 py-2 text-left">Fund Type</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Receipt #</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2">{projectName(row.project)}</td>
                    <td className="px-4 py-2 text-destructive">
                      {formatExpenseAmount(row.amount)}
                    </td>
                    <td className="px-4 py-2">{row.fund_source ?? "—"}</td>
                    <td className="px-4 py-2">{row.funding_years ?? "—"}</td>
                    <td className="px-4 py-2">
                      {row.fund_type === "Other"
                        ? (row.fund_type_other ?? "Other")
                        : row.fund_type}
                    </td>
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Allocate budget</DialogTitle>
            <DialogDescription>
              Record an allocation and attach the required budget documents.
            </DialogDescription>
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
                id="allocation-resolution"
                label="Resolution"
                files={resolutionFile ? [resolutionFile] : []}
                onChange={(files) => setResolutionFile(files[0] ?? null)}
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Released Amount</DialogTitle>
            <DialogDescription>
              Log a released amount against a project fund source.
            </DialogDescription>
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
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Fund Source</p>
              <Label htmlFor="fund-source-trigger">Fund source</Label>
              <Select value={fundSource} onValueChange={setFundSource}>
                <SelectTrigger id="fund-source-trigger" aria-label="Fund source">
                  <SelectValue placeholder="Select fund source" />
                </SelectTrigger>
                <SelectContent>
                  {FUND_SOURCE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label htmlFor="funding-years-trigger">Funding years</Label>
              <Select value={fundingYears} onValueChange={setFundingYears}>
                <SelectTrigger id="funding-years-trigger" aria-label="Funding years">
                  <SelectValue placeholder="Select funding year" />
                </SelectTrigger>
                <SelectContent>
                  {FUNDING_YEAR_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label htmlFor="fund-type-trigger">Fund type</Label>
              <Select
                value={fundType}
                onValueChange={(value) => {
                  setFundType(value as BudgetExpenseRecord["fund_type"])
                  if (value !== "Other") setFundTypeOther("")
                }}
              >
                <SelectTrigger id="fund-type-trigger" aria-label="Fund type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUND_TYPE.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fundType === "Other" ? (
                <>
                  <Label htmlFor="fund-type-other">Other fund type</Label>
                  <Input
                    id="fund-type-other"
                    value={fundTypeOther}
                    onChange={(event) => setFundTypeOther(event.target.value)}
                  />
                </>
              ) : null}
            </div>
            <Label htmlFor="expense-date">Expense date</Label>
            <Input id="expense-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            <Label htmlFor="expense-description">Description</Label>
            <Textarea id="expense-description" value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void saveExpense()}>Released Amount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
