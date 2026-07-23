"use client"

import { useEffect, useState } from "react"

import { validateReleasedAmountCreate } from "@workspace/pocketbase/domain/budget-allocation-guards"
import {
  budgetAllocationRecordSchema,
  budgetExpenseMutateSchema,
  budgetExpenseRecordSchema,
  fieldErrorsFromZod,
  parseRecordList,
} from "@workspace/pocketbase/schemas"
import type { ProjectRecord } from "@workspace/pocketbase/types"
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
  emptyReleasedAmountFormValue,
  ReleasedAmountFields,
  type ReleasedAmountFormValue,
} from "@/components/released-amount-fields"
import { getPocketBase } from "@/lib/pocketbase"

export type ReleasedAmountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: readonly ProjectRecord[]
  initialProjectId?: string
  lockProject?: boolean
  onSuccess?: () => void | Promise<void>
}

export function ReleasedAmountDialog({
  open,
  onOpenChange,
  projects,
  initialProjectId = "",
  lockProject = false,
  onSuccess,
}: ReleasedAmountDialogProps) {
  const [projectId, setProjectId] = useState(initialProjectId)
  const [value, setValue] = useState<ReleasedAmountFormValue>(
    emptyReleasedAmountFormValue()
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setProjectId(initialProjectId)
    setValue(emptyReleasedAmountFormValue())
    setFieldErrors({})
  }, [initialProjectId, open])

  async function saveExpense() {
    const parsed = budgetExpenseMutateSchema.safeParse({
      project: projectId,
      amount: value.amount,
      year: value.releaseYear,
      main_account: value.mainAccount,
      sub_account: value.subAccount || undefined,
      date: value.expenseDate,
      receipt_number: value.receiptNumber || undefined,
      description: value.expenseDescription || undefined,
    })

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    setSaving(true)
    try {
      const pb = getPocketBase()
      let allocationRows: unknown[]
      let expenseRows: unknown[]
      try {
        ;[allocationRows, expenseRows] = await Promise.all([
          pb.collection("budget_allocations").getFullList(),
          pb.collection("budget_expenses").getFullList(),
        ])
      } catch {
        setFieldErrors({
          amount:
            "Unable to load budget data. Try again before saving.",
        })
        return
      }

      const projectAllocations = parseRecordList(
        budgetAllocationRecordSchema,
        allocationRows
      ).filter((row) => row.project === parsed.data.project)
      const projectExpenses = parseRecordList(
        budgetExpenseRecordSchema,
        expenseRows
      ).filter((row) => row.project === parsed.data.project)
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
      try {
        await pb.collection("budget_expenses").create(parsed.data)
      } catch (error) {
        setFieldErrors({
          amount:
            error instanceof Error
              ? error.message
              : "Unable to save released amount.",
        })
        return
      }
      onOpenChange(false)
      await onSuccess?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg"
        data-testid="released-amount-dialog"
      >
        <DialogHeader>
          <DialogTitle>Released Amount</DialogTitle>
          <DialogDescription>
            Log a released amount against a project fund source.
          </DialogDescription>
        </DialogHeader>
        <ReleasedAmountFields
          value={value}
          onChange={setValue}
          fieldErrors={fieldErrors}
          projects={projects}
          projectId={projectId}
          lockProject={lockProject}
          onProjectChange={setProjectId}
        />
        <DialogFooter>
          <Button
            type="button"
            data-testid="released-amount-submit"
            onClick={() => void saveExpense()}
            disabled={saving}
          >
            {saving ? "Saving..." : "Released Amount"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
