"use client"

import { useCallback, useEffect, useState } from "react"

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
  role: "Admin",
  account_status: "Active",
  password: "",
})

export function UserManagementModule() {
  const [users, setUsers] = useState<UserRecord[]>([])
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
    const rows = await getPocketBase().collection("users").getFullList()
    setUsers(parseRecordList(userRecordSchema, rows))
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

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="border-b text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const label = user.name || user.email

              return (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium">{user.name || "—"}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary">{user.role}</Badge>
                  </td>
                  <td className="px-4 py-2">{user.account_status}</td>
                  <td className="px-4 py-2">
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
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
                    {ROLE.map((role) => (
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
                    {ACCOUNT_STATUS.map((status) => (
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
