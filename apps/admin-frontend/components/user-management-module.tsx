"use client"

import { useCallback, useEffect, useState } from "react"

import { loadOptionRecordNames, loadSelectFieldOptions } from "@workspace/pocketbase"
import { canAccess } from "@workspace/pocketbase/domain/access-control"
import { ACCOUNT_STATUS, ROLE } from "@workspace/pocketbase/schema"
import { parseRecordList, userRecordSchema } from "@workspace/pocketbase/schemas"
import type { UserRecord } from "@workspace/pocketbase/types"
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
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { DataTable, type ColumnDef } from "@/components/data-table"
import { PageHeaderBand } from "@/components/page-header-band"
import { getPocketBase } from "@/lib/pocketbase"

type UserFormState = {
  name: string
  email: string
  role: UserRecord["role"]
  account_status: UserRecord["account_status"]
  password: string
}

const emptyForm = (): UserFormState => ({
  name: "",
  email: "",
  role: "Province",
  account_status: "Active",
  password: "",
})

export function UserManagementModule() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [roleOptions, setRoleOptions] = useState<string[]>([...ROLE])
  const [accountStatusOptions, setAccountStatusOptions] = useState<string[]>([
    ...ACCOUNT_STATUS,
  ])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyForm())
  const actor = getPocketBase().authStore?.record
  const canManageUsers = actor ? canAccess(actor, "users.update") : true
  const canDeleteUsers = actor ? canAccess(actor, "users.delete") : true
  const canResetPasswords = actor
    ? canAccess(actor, "users.reset_password")
    : true

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const pb = getPocketBase()
    const [rows, nextRoleOptions, nextAccountStatusOptions] = await Promise.all([
      pb.collection("users").getFullList(),
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
    setRoleOptions(nextRoleOptions)
    setAccountStatusOptions(nextAccountStatusOptions)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadUsers().catch(() => {
      setUsers([])
      setLoading(false)
    })
  }, [loadUsers])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
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
    })
    setDialogOpen(true)
  }

  async function saveUser() {
    const pb = getPocketBase()
    if (!canManageUsers) {
      return
    }

    if (editing) {
      await pb.collection("users").update(editing.id, {
        name: form.name,
        email: form.email,
        role: form.role,
        account_status: form.account_status,
      })
    } else {
      await pb.collection("users").create({
        name: form.name,
        email: form.email,
        role: form.role,
        account_status: form.account_status,
        password: form.password,
        passwordConfirm: form.password,
      })
    }

    setDialogOpen(false)
    await loadUsers()
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

  async function resetPassword(user: UserRecord) {
    if (!canResetPasswords) {
      return
    }
    await getPocketBase().collection("users").requestPasswordReset(user.email)
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
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            {!editing ? (
              <div className="space-y-1">
                <Label htmlFor="user-password">Initial password</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    setForm({ ...form, role: value as UserRecord["role"] })
                  }
                >
                  <SelectTrigger aria-label="Role">
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
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.account_status}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      account_status: value as UserRecord["account_status"],
                    })
                  }
                >
                  <SelectTrigger aria-label="Status">
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
              </div>
            </div>
          </div>
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
    </div>
  )
}
