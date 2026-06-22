import type { Role } from "../schemas/enums"

export type PolicyKey =
  | "projects.create"
  | "projects.update"
  | "projects.delete"
  | "budget_allocations.create"
  | "budget_allocations.update"
  | "budget_allocations.delete"
  | "budget_expenses.create"
  | "budget_expenses.update"
  | "budget_expenses.delete"
  | "progress_updates.create"
  | "progress_updates.update"
  | "progress_updates.delete"
  | "approval_actions.create"
  | "reports.view"
  | "reports.export"
  | "users.create"
  | "users.update"
  | "users.delete"
  | "users.reset_password"
  | "locations.create"
  | "locations.update"
  | "locations.delete"
  | "activity_logs.view"
  | "activity_logs.export"
  | "system_settings.update"

export type PolicyUser = {
  id?: string
  role?: Role | string
  account_status?: "Active" | "Inactive" | string
}

const ADMIN_POLICIES: readonly PolicyKey[] = [
  "projects.create",
  "projects.update",
  "projects.delete",
  "budget_allocations.create",
  "budget_allocations.update",
  "budget_allocations.delete",
  "budget_expenses.create",
  "budget_expenses.update",
  "budget_expenses.delete",
  "progress_updates.create",
  "progress_updates.update",
  "progress_updates.delete",
  "approval_actions.create",
  "reports.view",
  "reports.export",
]

const SUPER_ADMIN_POLICIES: readonly PolicyKey[] = [
  ...ADMIN_POLICIES,
  "users.create",
  "users.update",
  "users.delete",
  "users.reset_password",
  "locations.create",
  "locations.update",
  "locations.delete",
  "activity_logs.view",
  "activity_logs.export",
  "system_settings.update",
]

export const ROLE_POLICIES: Record<Role, readonly PolicyKey[]> = {
  "Super Admin": SUPER_ADMIN_POLICIES,
  Admin: ADMIN_POLICIES,
  User: [],
}

export function getRolePolicy(role: Role | string | undefined): readonly PolicyKey[] {
  if (role === "Super Admin" || role === "Admin" || role === "User") {
    return ROLE_POLICIES[role] ?? []
  }
  return []
}

export function isActiveUser(user: PolicyUser | null | undefined): boolean {
  return Boolean(user) && user?.account_status !== "Inactive"
}

export function isSuperAdmin(user: PolicyUser | null | undefined): boolean {
  return isActiveUser(user) && user?.role === "Super Admin"
}

export function canAccess(
  user: PolicyUser | null | undefined,
  policyKey: PolicyKey
): boolean {
  if (!isActiveUser(user)) {
    return false
  }
  return getRolePolicy(user?.role).includes(policyKey)
}
