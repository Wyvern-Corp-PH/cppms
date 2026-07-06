"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { loadOptionRecordNames, loadSelectFieldOptions } from "@workspace/pocketbase"
import { canAccess } from "@workspace/pocketbase/domain/access-control"
import { copyTextToClipboard } from "@workspace/pocketbase/domain/copy-to-clipboard"
import { generateTempPassword } from "@workspace/pocketbase/domain/temp-password"
import { ACCOUNT_STATUS, ROLE } from "@workspace/pocketbase/schema"
import {
  fieldErrorsFromZod,
  locationRecordSchema,
  parseRecordList,
  userAccountFormSchema,
  userRecordSchema,
} from "@workspace/pocketbase/schemas"
import type { LocationRecord, UserRecord } from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
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
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { DataTable, type ColumnDef } from "@/components/data-table"
import { PageHeaderBand } from "@/components/page-header-band"
import { PasswordRequirements } from "@/components/password-requirements"
import { getPocketBase } from "@/lib/pocketbase"

type UserFormState = {
  name: string
  email: string
  role: UserRecord["role"]
  account_status: UserRecord["account_status"]
  password: string
  municipality: string
  barangay: string
}

const emptyForm = (): UserFormState => ({
  name: "",
  email: "",
  role: "Province",
  account_status: "Active",
  password: "",
  municipality: "",
  barangay: "",
})

function municipalityName(location: LocationRecord): string {
  return location.level === "Barangay"
    ? location.municipality_name || location.name
    : location.name
}

function barangayName(location: LocationRecord): string {
  return location.barangay_name || location.name
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  )
}

export function UserManagementModule() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [roleOptions, setRoleOptions] = useState<string[]>([...ROLE])
  const [accountStatusOptions, setAccountStatusOptions] = useState<string[]>([
    ...ACCOUNT_STATUS,
  ])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [revealedTempPassword, setRevealedTempPassword] = useState<string | null>(
    null
  )
  const [tempPasswordCopied, setTempPasswordCopied] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyForm())
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const actor = getPocketBase().authStore?.record
  const canManageUsers = actor ? canAccess(actor, "users.update") : true
  const canDeleteUsers = actor ? canAccess(actor, "users.delete") : true
  const canResetPasswords = actor
    ? canAccess(actor, "users.reset_password")
    : true

  const loadUsers = useCallback(async () => {
    const pb = getPocketBase()
    try {
      const [
        rows,
        locationRows,
        nextRoleOptions,
        nextAccountStatusOptions,
      ] = await Promise.all([
        pb.collection("users").getFullList(),
        pb.collection("locations").getFullList().catch(() => []),
        loadOptionRecordNames(pb, "user_role_options", ROLE).then((options) =>
          options.length > 0
            ? options
            : loadSelectFieldOptions(pb, "users", "role", ROLE)
        ),
        loadOptionRecordNames(pb, "user_account_status_options", ACCOUNT_STATUS).then(
          (options) =>
            options.length > 0
              ? options
              : loadSelectFieldOptions(pb, "users", "account_status", ACCOUNT_STATUS)
        ),
      ])
      setUsers(parseRecordList(userRecordSchema, rows))
      setLocations(parseRecordList(locationRecordSchema, locationRows))
      setRoleOptions(nextRoleOptions)
      setAccountStatusOptions(nextAccountStatusOptions)
    } catch {
      setUsers([])
      setLocations([])
    } finally {
      setLoading(false)
    }
  }, [])

  const activeLocations = useMemo(
    () => locations.filter((location) => location.active),
    [locations]
  )
  const municipalityOptions = useMemo(
    () => uniqueSorted(activeLocations.map(municipalityName)),
    [activeLocations]
  )
  const barangayOptions = useMemo(
    () =>
      uniqueSorted(
        activeLocations
          .filter(
            (location) =>
              location.level === "Barangay" &&
              municipalityName(location) === form.municipality
          )
          .map(barangayName)
      ),
    [activeLocations, form.municipality]
  )
  const needsMunicipality =
    form.role === "Municipality" || form.role === "Barangay"
  const needsBarangay = form.role === "Barangay"

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsers()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadUsers])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setFieldErrors({})
    setDialogOpen(true)
  }

  function openEdit(user: UserRecord) {
    setEditing(user)
    setForm({
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      account_status: user.account_status,
      password: "",
      municipality: user.municipality ?? "",
      barangay: user.barangay ?? "",
    })
    setFieldErrors({})
    setDialogOpen(true)
  }

  async function saveUser() {
    const pb = getPocketBase()
    if (!canManageUsers) {
      return
    }

    const parsed = userAccountFormSchema.safeParse({
      name: form.name,
      email: form.email,
      role: form.role,
      account_status: form.account_status,
      password: editing ? undefined : form.password,
      municipality: form.municipality,
      barangay: form.barangay,
    })

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    setFieldErrors({})

    let createdUser: UserRecord | null = null

    if (editing) {
      await pb.collection("users").update(editing.id, {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        account_status: parsed.data.account_status,
        municipality: parsed.data.municipality,
        barangay: parsed.data.barangay,
      })
    } else {
      const created = await pb.collection("users").create({
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        account_status: parsed.data.account_status,
        municipality: parsed.data.municipality,
        barangay: parsed.data.barangay,
        emailVisibility: true,
        password: parsed.data.password,
        passwordConfirm: parsed.data.password,
      })
      const createdParsed = userRecordSchema.safeParse(created)
      createdUser = createdParsed.success ? createdParsed.data : null
    }

    setDialogOpen(false)
    await loadUsers()
    if (createdUser) {
      setUsers((current) =>
        current.some((user) => user.id === createdUser.id)
          ? current
          : [createdUser, ...current]
      )
    }
  }

  async function deactivateUser(user: UserRecord) {
    if (!canManageUsers) {
      return
    }
    await getPocketBase().collection("users").update(user.id, {
      account_status: "Inactive",
    })
    await loadUsers()
  }

  async function deleteUser(user: UserRecord) {
    if (!canDeleteUsers) {
      return
    }
    await getPocketBase().collection("users").delete(user.id)
    await loadUsers()
  }

  function openResetConfirm(user: UserRecord) {
    if (!canResetPasswords) {
      return
    }
    setResetTarget(user)
    setResetConfirmOpen(true)
  }

  async function confirmResetPassword() {
    if (!resetTarget || !canResetPasswords) {
      return
    }

    setResettingPassword(true)
    const tempPassword = generateTempPassword()

    try {
      await getPocketBase().collection("users").update(resetTarget.id, {
        password: tempPassword,
        passwordConfirm: tempPassword,
        must_change_password: true,
      })
      setResetConfirmOpen(false)
      setRevealedTempPassword(tempPassword)
    } finally {
      setResettingPassword(false)
    }
  }

  function closeTempPasswordReveal() {
    setRevealedTempPassword(null)
    setResetTarget(null)
    setTempPasswordCopied(false)
  }

  async function copyTempPassword() {
    if (!revealedTempPassword) {
      return
    }
    const copied = await copyTextToClipboard(revealedTempPassword)
    if (copied) {
      setTempPasswordCopied(true)
    }
  }

  async function resetPassword(user: UserRecord) {
    openResetConfirm(user)
  }

  const userColumns: ColumnDef<UserRecord>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name || "—"}</span>
      ),
    },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge>,
    },
    { accessorKey: "account_status", header: "Status" },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => {
        const user = row.original
        const label = user.name || user.email

        return (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Edit ${label}`}
              onClick={() => openEdit(user)}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Deactivate ${label}`}
              onClick={() => void deactivateUser(user)}
            >
              Deactivate
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Reset password for ${label}`}
              onClick={() => void resetPassword(user)}
            >
              Reset password
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              aria-label={`Delete ${label}`}
              onClick={() => void deleteUser(user)}
            >
              Delete
            </Button>
          </div>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div className="space-y-3" data-testid="users-skeleton">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-24 animate-pulse rounded-md bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeaderBand
        title="User Management"
        context="Super Admin controls for accounts, roles, status, and password resets."
        kpis={[{ label: "Users", value: String(users.length) }]}
      />

      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>
          Create account
        </Button>
      </div>

      <DataTable
        columns={userColumns}
        data={users}
        getRowId={(user) => user.id}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit account" : "Create account"}</DialogTitle>
            <DialogDescription>
              Manage account identity, role, and status.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.name}>
              <FieldLabel htmlFor="user-name">Name</FieldLabel>
              <Input
                id="user-name"
                value={form.name}
                aria-invalid={!!fieldErrors.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <FieldError>{fieldErrors.name}</FieldError>
            </Field>
            <Field data-invalid={!!fieldErrors.email}>
              <FieldLabel htmlFor="user-email">Email</FieldLabel>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                aria-invalid={!!fieldErrors.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </Field>
            {!editing ? (
              <Field data-invalid={!!fieldErrors.password}>
                <FieldLabel htmlFor="user-password">Initial password</FieldLabel>
                <Input
                  id="user-password"
                  type="password"
                  value={form.password}
                  aria-invalid={!!fieldErrors.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
                <PasswordRequirements />
                <FieldError>{fieldErrors.password}</FieldError>
              </Field>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!fieldErrors.role}>
                <FieldLabel>Role</FieldLabel>
                <Select
                  value={form.role}
                  onValueChange={(value) => {
                    const role = value as UserRecord["role"]
                    setForm((current) => ({
                      ...current,
                      role,
                      municipality:
                        role === "Municipality" || role === "Barangay"
                          ? current.municipality
                          : "",
                      barangay: role === "Barangay" ? current.barangay : "",
                    }))
                  }}
                >
                  <SelectTrigger aria-label="Role" aria-invalid={!!fieldErrors.role}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{fieldErrors.role}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.account_status}>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={form.account_status}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      account_status: value as UserRecord["account_status"],
                    })
                  }
                >
                  <SelectTrigger
                    aria-label="Status"
                    aria-invalid={!!fieldErrors.account_status}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{fieldErrors.account_status}</FieldError>
              </Field>
            </div>
            {needsMunicipality ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field data-invalid={!!fieldErrors.municipality}>
                  <FieldLabel>Municipality</FieldLabel>
                  <Select
                    value={form.municipality}
                    onValueChange={(value) =>
                      setForm({ ...form, municipality: value, barangay: "" })
                    }
                  >
                    <SelectTrigger
                      aria-label="Municipality"
                      aria-invalid={!!fieldErrors.municipality}
                    >
                      <SelectValue placeholder="Select municipality" />
                    </SelectTrigger>
                    <SelectContent>
                      {municipalityOptions.map((municipality) => (
                        <SelectItem key={municipality} value={municipality}>
                          {municipality}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{fieldErrors.municipality}</FieldError>
                </Field>
                {needsBarangay ? (
                  <Field data-invalid={!!fieldErrors.barangay}>
                    <FieldLabel>Barangay</FieldLabel>
                    <Select
                      value={form.barangay}
                      onValueChange={(value) =>
                        setForm({ ...form, barangay: value })
                      }
                    >
                      <SelectTrigger
                        aria-label="Barangay"
                        aria-invalid={!!fieldErrors.barangay}
                      >
                        <SelectValue placeholder="Select barangay" />
                      </SelectTrigger>
                      <SelectContent>
                        {barangayOptions.map((barangay) => (
                          <SelectItem key={barangay} value={barangay}>
                            {barangay}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError>{fieldErrors.barangay}</FieldError>
                  </Field>
                ) : null}
              </div>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveUser()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {resetTarget
                ? `Generate a temporary password for ${resetTarget.name || resetTarget.email}. Deliver it through a secure offline channel.`
                : "Generate a temporary password for this account."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={resettingPassword}
              onClick={() => void confirmResetPassword()}
            >
              {resettingPassword ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={revealedTempPassword !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeTempPasswordReveal()
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>
              Copy this password now. It will not be shown again. Deliver it to
              the user offline. They must set a new password on next sign-in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              readOnly
              value={revealedTempPassword ?? ""}
              aria-label="Temporary password"
              data-testid="temp-password-value"
            />
            <Button
              type="button"
              variant="outline"
              aria-label={
                tempPasswordCopied
                  ? "Temporary password copied"
                  : "Copy temporary password"
              }
              onClick={() => void copyTempPassword()}
            >
              {tempPasswordCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" onClick={closeTempPasswordReveal}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
