"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  budgetFundOptionRecordSchema,
  parseRecordList,
} from "@workspace/pocketbase/schemas"
import type { BudgetFundOptionRecord, ProjectRecord } from "@workspace/pocketbase/types"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"

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

function normalizeMainAccountName(value: string) {
  return value === "Other" ? "Others" : value
}

export type ReleasedAmountFormValue = {
  amount: string
  releaseYear: string
  mainAccount: string
  subAccount: string
  receiptNumber: string
  expenseDate: string
  expenseDescription: string
}

export function emptyReleasedAmountFormValue(): ReleasedAmountFormValue {
  return {
    amount: "",
    releaseYear: String(new Date().getFullYear()),
    mainAccount: "",
    subAccount: "",
    receiptNumber: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    expenseDescription: "",
  }
}

export type ReleasedAmountFieldsProps = {
  value: ReleasedAmountFormValue
  onChange: (value: ReleasedAmountFormValue) => void
  fieldErrors?: Record<string, string>
  idPrefix?: string
  projects?: readonly ProjectRecord[]
  projectId?: string
  lockProject?: boolean
  onProjectChange?: (projectId: string) => void
  loadOptions?: boolean
  sectionTestId?: string
}

export function ReleasedAmountFields({
  value,
  onChange,
  fieldErrors = {},
  idPrefix = "released",
  projects = [],
  projectId = "",
  lockProject = false,
  onProjectChange,
  loadOptions = true,
  sectionTestId = "released-amount-fields",
}: ReleasedAmountFieldsProps) {
  const [fundingYearOptions, setFundingYearOptions] = useState<BudgetFundOptionRecord[]>([])
  const [fundMainAccountOptions, setFundMainAccountOptions] = useState<BudgetFundOptionRecord[]>([])
  const [fundSubAccountOptions, setFundSubAccountOptions] = useState<BudgetFundOptionRecord[]>([])

  const loadFundOptions = useCallback(async () => {
    const pb = getPocketBase()
    const [fundingYearRows, fundMainAccountRows, fundSubAccountRows] = await Promise.all([
      pb.collection("budget_funding_years").getFullList().catch(() => []),
      pb.collection("budget_fund_main_accounts").getFullList().catch(() => []),
      pb.collection("budget_fund_sub_accounts").getFullList().catch(() => []),
    ])
    setFundingYearOptions(parseRecordList(budgetFundOptionRecordSchema, fundingYearRows))
    setFundMainAccountOptions(parseRecordList(budgetFundOptionRecordSchema, fundMainAccountRows))
    setFundSubAccountOptions(parseRecordList(budgetFundOptionRecordSchema, fundSubAccountRows))
  }, [])

  useEffect(() => {
    if (!loadOptions) return
    void loadFundOptions()
  }, [loadFundOptions, loadOptions])

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
      ]).filter((value) =>
        MAIN_ACCOUNT_OPTIONS.includes(value as (typeof MAIN_ACCOUNT_OPTIONS)[number])
      ),
    [fundMainAccountOptions]
  )
  const subAccountNames = useMemo(() => {
    if (!(value.mainAccount in SUB_ACCOUNT_OPTIONS)) return []
    const pocketBaseOptions = fundSubAccountOptions
      .filter(
        (record) => record.active && record.main_account === value.mainAccount
      )
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((record) => record.name)
    return pocketBaseOptions.length > 0
      ? pocketBaseOptions
      : [...(SUB_ACCOUNT_OPTIONS[value.mainAccount] ?? [])]
  }, [fundSubAccountOptions, value.mainAccount])
  const showsSubAccountDropdown = value.mainAccount in SUB_ACCOUNT_OPTIONS
  const showsOtherAccountText = value.mainAccount === "Others"

  function patchValue(patch: Partial<ReleasedAmountFormValue>) {
    onChange({ ...value, ...patch })
  }

  return (
    <FieldGroup data-testid={sectionTestId}>
      {projects.length > 0 ? (
        <Field data-invalid={!!fieldErrors.project}>
          <FieldLabel>Project</FieldLabel>
          <Select
            value={projectId}
            onValueChange={onProjectChange}
            disabled={lockProject}
          >
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
      ) : null}
      <Field data-invalid={!!fieldErrors.amount}>
        <FieldLabel htmlFor={`${idPrefix}-amount`}>Amount (PHP)</FieldLabel>
        <Input
          id={`${idPrefix}-amount`}
          type="number"
          value={value.amount}
          aria-invalid={!!fieldErrors.amount}
          onChange={(event) => patchValue({ amount: event.target.value })}
        />
        <FieldError>{fieldErrors.amount}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-receipt-number`}>Receipt number</FieldLabel>
        <Input
          id={`${idPrefix}-receipt-number`}
          value={value.receiptNumber}
          onChange={(event) => patchValue({ receiptNumber: event.target.value })}
        />
      </Field>
      <FieldSet className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">Fund Source</p>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-release-year-trigger`}>Year</FieldLabel>
          <Select
            value={value.releaseYear}
            onValueChange={(releaseYear) => patchValue({ releaseYear })}
          >
            <SelectTrigger
              id={`${idPrefix}-release-year-trigger`}
              aria-label="Year"
            >
              <SelectValue placeholder="Select year" />
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
        <Field data-invalid={!!fieldErrors.main_account}>
          <FieldLabel htmlFor={`${idPrefix}-main-account-trigger`}>
            Main account
          </FieldLabel>
          <Select
            value={value.mainAccount}
            onValueChange={(mainAccount) =>
              patchValue({ mainAccount, subAccount: "" })
            }
          >
            <SelectTrigger
              id={`${idPrefix}-main-account-trigger`}
              aria-label="Main account"
              aria-invalid={!!fieldErrors.main_account}
            >
              <SelectValue placeholder="Select main account" />
            </SelectTrigger>
            <SelectContent>
              {mainAccountNames.map((account) => (
                <SelectItem key={account} value={account}>
                  {account}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{fieldErrors.main_account}</FieldError>
        </Field>
        {showsOtherAccountText ? (
          <Field data-invalid={!!fieldErrors.sub_account}>
            <FieldLabel htmlFor={`${idPrefix}-other-account-purpose`}>
              Other purpose
            </FieldLabel>
            <Input
              id={`${idPrefix}-other-account-purpose`}
              value={value.subAccount}
              aria-invalid={!!fieldErrors.sub_account}
              onChange={(event) => patchValue({ subAccount: event.target.value })}
            />
            <FieldError>{fieldErrors.sub_account}</FieldError>
          </Field>
        ) : showsSubAccountDropdown ? (
          <Field data-invalid={!!fieldErrors.sub_account}>
            <FieldLabel htmlFor={`${idPrefix}-sub-account-trigger`}>
              Sub account
            </FieldLabel>
            <Select
              value={value.subAccount}
              onValueChange={(subAccount) => patchValue({ subAccount })}
            >
              <SelectTrigger
                id={`${idPrefix}-sub-account-trigger`}
                aria-label="Sub account"
                aria-invalid={!!fieldErrors.sub_account}
              >
                <SelectValue placeholder="Select sub account" />
              </SelectTrigger>
              <SelectContent>
                {subAccountNames.map((account) => (
                  <SelectItem key={account} value={account}>
                    {account}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{fieldErrors.sub_account}</FieldError>
          </Field>
        ) : null}
      </FieldSet>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-expense-date`}>Expense date</FieldLabel>
        <Input
          id={`${idPrefix}-expense-date`}
          type="date"
          value={value.expenseDate}
          onChange={(event) => patchValue({ expenseDate: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-expense-description`}>
          Description
        </FieldLabel>
        <Textarea
          id={`${idPrefix}-expense-description`}
          value={value.expenseDescription}
          onChange={(event) =>
            patchValue({ expenseDescription: event.target.value })
          }
        />
      </Field>
    </FieldGroup>
  )
}
