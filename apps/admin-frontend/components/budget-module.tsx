"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  canAccess,
  filterProjectsForUser,
} from "@workspace/pocketbase/domain/access-control"
import {
  COMPLETED_PROJECT_ALLOCATION_MESSAGE,
  filterProjectsForBudgetAllocation,
  isEligibleForBudgetAllocation,
  validateReleasedAmountCreate,
} from "@workspace/pocketbase/domain/budget-allocation-guards"
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
  budgetFundOptionRecordSchema,
  fieldErrorsFromZod,
  locationRecordSchema,
  parseRecordList,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  BudgetFundOptionRecord,
  LocationRecord,
  ProjectRecord,
} from "@workspace/pocketbase/types"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"

import { DateRangeFilter } from "@/components/date-range-filter"
import { DataTable, type ColumnDef } from "@/components/data-table"
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
const FUNDING_YEAR_OPTIONS = YEAR_OPTIONS.map(String)
const MAIN_ACCOUNT_OPTIONS = [
  "General Fund",
  "Special Education Fund",
  "Special Health Fund",
  "Trust Fund",
  "Others",
] as const

const SUB_ACCOUNT_OPTIONS: Record<string, readonly string[]> = {
  "General Fund": [
    "GF - Proper",
    "20% DF",
    "Hospital Serv.",
    "Econ. Enterp.",
    "Bayanihan Fund",
    "SA - Excise Tax",
  ],
  "Trust Fund": ["Trust Fund - Proper", "LDRRMF - SA"],
}

const DEFAULT_SUB_ACCOUNT_BY_MAIN_ACCOUNT: Record<string, string> = {
  "General Fund": "GF - Proper",
  "Trust Fund": "Trust Fund - Proper",
}

function normalizeMainAccountName(value: string) {
  return value === "Other" ? "Others" : value
}

function displaySubAccount(record: BudgetExpenseRecord) {
  const value = record.sub_account?.trim()
  if (value) return value
  return DEFAULT_SUB_ACCOUNT_BY_MAIN_ACCOUNT[record.main_account] ?? "—"
}

function optionNames(
  records: BudgetFundOptionRecord[],
  fallback: readonly string[]
) {
  const activeOptions = records
    .filter((record) => record.active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((record) => record.name)

  return activeOptions.length > 0 ? activeOptions : [...fallback]
}

function uniqueOptions(values: readonly string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

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
  const [fundingYearOptions, setFundingYearOptions] = useState<BudgetFundOptionRecord[]>([])
  const [fundMainAccountOptions, setFundMainAccountOptions] = useState<BudgetFundOptionRecord[]>([])
  const [fundSubAccountOptions, setFundSubAccountOptions] = useState<BudgetFundOptionRecord[]>([])
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
  const [releaseYear, setReleaseYear] = useState(String(new Date().getFullYear()))
  const [mainAccount, setMainAccount] = useState("")
  const [subAccount, setSubAccount] = useState("")
  const [receiptNumber, setReceiptNumber] = useState("")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [expenseDescription, setExpenseDescription] = useState("")
  const [moaFiles, setMoaFiles] = useState<File[]>([])
  const [resolutionFiles, setResolutionFiles] = useState<File[]>([])
  const [supportingFiles, setSupportingFiles] = useState<File[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const actor = getPocketBase().authStore?.record
  const canCreateAllocations = actor
    ? canAccess(actor, "budget_allocations.create")
    : true
  const canCreateExpenses =
    actor &&
    canAccess(actor, "budget_expenses.create") &&
    actor.role !== "Barangay" &&
    actor.role !== "Municipality"

  function clearAllocationUploads() {
    setMoaFiles([])
    setResolutionFiles([])
    setSupportingFiles([])
  }

  const load = useCallback(async () => {
    setLoading(true)
    const pb = getPocketBase()
    const [
      projectRows,
      allocationRows,
      expenseRows,
      locationRows,
      fundingYearRows,
      fundMainAccountRows,
      fundSubAccountRows,
      userRows,
    ] = await Promise.all([
      pb.collection("projects").getFullList(),
      pb.collection("budget_allocations").getFullList(),
      pb.collection("budget_expenses").getFullList(),
      pb.collection("locations").getFullList().catch(() => []),
      pb.collection("budget_funding_years").getFullList().catch(() => []),
      pb.collection("budget_fund_main_accounts").getFullList().catch(() => []),
      pb.collection("budget_fund_sub_accounts").getFullList().catch(() => []),
      pb.collection("users").getFullList().catch(() => []),
    ])
    setProjects(parseRecordList(projectRecordSchema, projectRows))
    setAllocations(parseRecordList(budgetAllocationRecordSchema, allocationRows))
    setExpenses(parseRecordList(budgetExpenseRecordSchema, expenseRows))
    setLocations(parseRecordList(locationRecordSchema, locationRows))
    setFundingYearOptions(parseRecordList(budgetFundOptionRecordSchema, fundingYearRows))
    setFundMainAccountOptions(parseRecordList(budgetFundOptionRecordSchema, fundMainAccountRows))
    setFundSubAccountOptions(parseRecordList(budgetFundOptionRecordSchema, fundSubAccountRows))
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
  const fundingYearNames = useMemo(
    () => optionNames(fundingYearOptions, FUNDING_YEAR_OPTIONS),
    [fundingYearOptions]
  )
  const mainAccountNames = useMemo(
    () =>
      uniqueOptions([
        ...MAIN_ACCOUNT_OPTIONS,
        ...optionNames(fundMainAccountOptions, MAIN_ACCOUNT_OPTIONS).map(
          normalizeMainAccountName
        ),
      ]).filter((value) => MAIN_ACCOUNT_OPTIONS.includes(value as (typeof MAIN_ACCOUNT_OPTIONS)[number])),
    [fundMainAccountOptions]
  )
  const subAccountNames = useMemo(
    () => {
      if (!(mainAccount in SUB_ACCOUNT_OPTIONS)) return []
      const pocketBaseOptions = fundSubAccountOptions
        .filter((record) => record.active && record.main_account === mainAccount)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((record) => record.name)
      return pocketBaseOptions.length > 0
        ? pocketBaseOptions
        : [...(SUB_ACCOUNT_OPTIONS[mainAccount] ?? [])]
    },
    [fundSubAccountOptions, mainAccount]
  )
  const showsSubAccountDropdown = mainAccount in SUB_ACCOUNT_OPTIONS
  const showsOtherAccountText = mainAccount === "Others"
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
        if (tabYearFilter !== "all" && String(row.year) !== tabYearFilter) return false
        return true
      }),
    [dateFilteredExpenses, tabProjectFilter, tabYearFilter]
  )

  const projectName = (id: string) =>
    projects.find((project) => project.id === id)?.name ?? id

  const allocationColumns: ColumnDef<BudgetAllocationRecord>[] = [
    {
      accessorKey: "project",
      header: "Project",
      cell: ({ row }) => projectName(row.original.project),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="text-green-600">
          {formatAllocationAmount(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "year",
      header: "Year",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description ?? "—",
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDisplayDate(row.original.date),
    },
    {
      accessorKey: "allocated_by",
      header: "Allocated by",
      cell: ({ row }) => displayUserRef(row.original.allocated_by, userDisplay),
    },
  ]

  const expenseColumns: ColumnDef<BudgetExpenseRecord>[] = [
    {
      accessorKey: "project",
      header: "Project",
      cell: ({ row }) => projectName(row.original.project),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="text-destructive">
          {formatExpenseAmount(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "year",
      header: "Year",
    },
    {
      accessorKey: "main_account",
      header: "Main Account",
    },
    {
      accessorKey: "sub_account",
      header: "Sub Account",
      cell: ({ row }) => displaySubAccount(row.original),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDisplayDate(row.original.date),
    },
    {
      accessorKey: "receipt_number",
      header: "Receipt #",
      cell: ({ row }) => row.original.receipt_number ?? "—",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description ?? "—",
    },
  ]

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
      allocated_by: actor?.id,
    })

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    const targetProject = projects.find((row) => row.id === parsed.data.project)
    if (!targetProject || !isEligibleForBudgetAllocation(targetProject)) {
      setFieldErrors({ project: COMPLETED_PROJECT_ALLOCATION_MESSAGE })
      return
    }

    setFieldErrors({})
    const pb = getPocketBase()
    const hasFiles =
      moaFiles.length > 0 || resolutionFiles.length > 0 || supportingFiles.length > 0

    if (hasFiles) {
      const formData = new FormData()
      for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== undefined) formData.append(key, String(value))
      }
      for (const file of moaFiles) {
        formData.append("moa_file", file)
      }
      for (const file of resolutionFiles) {
        formData.append("resolution_file", file)
      }
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
      year: releaseYear,
      main_account: mainAccount,
      sub_account: subAccount || undefined,
      date: expenseDate,
      receipt_number: receiptNumber || undefined,
      description: expenseDescription || undefined,
    })

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    const pb = getPocketBase()
    let projectAllocations: BudgetAllocationRecord[]
    let projectExpenses: BudgetExpenseRecord[]
    try {
      const [allocationRows, expenseRows] = await Promise.all([
        pb.collection("budget_allocations").getFullList(),
        pb.collection("budget_expenses").getFullList(),
      ])
      projectAllocations = parseRecordList(
        budgetAllocationRecordSchema,
        allocationRows
      ).filter((row) => row.project === parsed.data.project)
      projectExpenses = parseRecordList(
        budgetExpenseRecordSchema,
        expenseRows
      ).filter((row) => row.project === parsed.data.project)
    } catch {
      setFieldErrors({
        amount:
          "Unable to load budget data. Try again before saving.",
      })
      return
    }

    const releaseCap = validateReleasedAmountCreate({
      newAmount: parsed.data.amount,
      existingReleasedAmounts: projectExpenses,
      allocations: projectAllocations,
    })
    if (!releaseCap.ok) {
      setFieldErrors({ amount: releaseCap.message })
      return
    }

    setFieldErrors({})
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
        context="Allocations and released amounts across all projects."
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
            label: "Amount released",
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
                  Total {formatPhp(row.totalBudget)} · Alloc {formatPhp(row.allocated)} · Amount released{" "}
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
            <TabsTrigger value="expenses">Released Amount</TabsTrigger>
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
                {fundingYearNames.map((year) => (
                  <SelectItem key={year} value={year}>
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
          <DataTable
            columns={allocationColumns}
            data={filteredAllocations}
            getRowId={(row) => row.id}
          />
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
          <DataTable
            columns={expenseColumns}
            data={filteredExpenses}
            getRowId={(row) => row.id}
          />
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
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.project}>
              <FieldLabel>Project</FieldLabel>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger aria-invalid={!!fieldErrors.project}>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {filterProjectsForBudgetAllocation(projects).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{fieldErrors.project}</FieldError>
            </Field>
            <Field data-invalid={!!fieldErrors.amount}>
              <FieldLabel htmlFor="allocation-amount">Total allocated budget amount</FieldLabel>
              <Input
                id="allocation-amount"
                type="number"
                value={amount}
                aria-invalid={!!fieldErrors.amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <FieldError>{fieldErrors.amount}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Year</FieldLabel>
              <Select value={allocationYear} onValueChange={setAllocationYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fundingYearNames.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="allocation-description">Description</FieldLabel>
              <Textarea
                id="allocation-description"
                value={allocationDescription}
                onChange={(e) => setAllocationDescription(e.target.value)}
              />
            </Field>
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium">Required documents</p>
              <DocumentUploadField
                id="allocation-moa"
                label="Memorandum of Agreement"
                multiple
                files={moaFiles}
                onChange={setMoaFiles}
              />
              <DocumentUploadField
                id="allocation-resolution"
                label="Resolution"
                multiple
                files={resolutionFiles}
                onChange={setResolutionFiles}
              />
              <DocumentUploadField
                id="allocation-supporting"
                label="Supporting project documents"
                multiple
                files={supportingFiles}
                onChange={setSupportingFiles}
              />
            </div>
          </FieldGroup>
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
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.project}>
              <FieldLabel>Project</FieldLabel>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger
                  aria-label="Expense project"
                  aria-invalid={!!fieldErrors.project}
                >
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
              <FieldError>{fieldErrors.project}</FieldError>
            </Field>
            <Field data-invalid={!!fieldErrors.amount}>
              <FieldLabel htmlFor="expense-amount">Amount (PHP)</FieldLabel>
              <Input
                id="expense-amount"
                type="number"
                value={amount}
                aria-invalid={!!fieldErrors.amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <FieldError>{fieldErrors.amount}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="receipt-number">Receipt number</FieldLabel>
              <Input
                id="receipt-number"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
              />
            </Field>
            <FieldSet className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Fund Source</p>
              <Field>
                <FieldLabel htmlFor="release-year-trigger">Year</FieldLabel>
                <Select value={releaseYear} onValueChange={setReleaseYear}>
                  <SelectTrigger id="release-year-trigger" aria-label="Year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {fundingYearNames.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={!!fieldErrors.main_account}>
                <FieldLabel htmlFor="main-account-trigger">Main account</FieldLabel>
                <Select
                  value={mainAccount}
                  onValueChange={(value) => {
                    setMainAccount(value)
                    setSubAccount("")
                  }}
                >
                  <SelectTrigger
                    id="main-account-trigger"
                    aria-label="Main account"
                    aria-invalid={!!fieldErrors.main_account}
                  >
                    <SelectValue placeholder="Select main account" />
                  </SelectTrigger>
                  <SelectContent>
                    {mainAccountNames.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{fieldErrors.main_account}</FieldError>
              </Field>
              {showsOtherAccountText ? (
                <Field data-invalid={!!fieldErrors.sub_account}>
                  <FieldLabel htmlFor="other-account-purpose">Other purpose</FieldLabel>
                  <Input
                    id="other-account-purpose"
                    value={subAccount}
                    aria-invalid={!!fieldErrors.sub_account}
                    onChange={(event) => setSubAccount(event.target.value)}
                  />
                  <FieldError>{fieldErrors.sub_account}</FieldError>
                </Field>
              ) : showsSubAccountDropdown ? (
                <Field data-invalid={!!fieldErrors.sub_account}>
                  <FieldLabel htmlFor="sub-account-trigger">Sub account</FieldLabel>
                  <Select value={subAccount} onValueChange={setSubAccount}>
                    <SelectTrigger
                      id="sub-account-trigger"
                      aria-label="Sub account"
                      aria-invalid={!!fieldErrors.sub_account}
                    >
                      <SelectValue placeholder="Select sub account" />
                    </SelectTrigger>
                    <SelectContent>
                      {subAccountNames.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{fieldErrors.sub_account}</FieldError>
                </Field>
              ) : null}
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="expense-date">Expense date</FieldLabel>
              <Input
                id="expense-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="expense-description">Description</FieldLabel>
              <Textarea
                id="expense-description"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" onClick={() => void saveExpense()}>Released Amount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
