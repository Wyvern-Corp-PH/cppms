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
  municipality?: string
  barangay?: string
}

export type ScopedProject = {
  municipality?: string
  barangay?: string
}

const BARANGAY_POLICIES: readonly PolicyKey[] = [
  "projects.update",
  "progress_updates.create",
  "progress_updates.update",
  "progress_updates.delete",
]

const MUNICIPALITY_POLICIES: readonly PolicyKey[] = [
  "reports.view",
]

const PROVINCE_POLICIES: readonly PolicyKey[] = [
  "projects.create",
  "projects.update",
  "projects.delete",
  "budget_allocations.create",
  "budget_allocations.update",
  "budget_allocations.delete",
  "budget_expenses.create",
  "budget_expenses.update",
  "budget_expenses.delete",
  "approval_actions.create",
  "reports.view",
  "reports.export",
]

const SUPER_ADMIN_POLICIES: readonly PolicyKey[] = [
  ...PROVINCE_POLICIES.filter((policy) => policy !== "approval_actions.create"),
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
  Province: PROVINCE_POLICIES,
  Municipality: MUNICIPALITY_POLICIES,
  Barangay: BARANGAY_POLICIES,
}

export function getRolePolicy(role: Role | string | undefined): readonly PolicyKey[] {
  if (
    role === "Super Admin" ||
    role === "Province" ||
    role === "Municipality" ||
    role === "Barangay"
  ) {
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

function sameScopeValue(a: string | undefined, b: string | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase()
}

export function isProjectInUserScope(
  user: PolicyUser | null | undefined,
  project: ScopedProject
): boolean {
  if (!isActiveUser(user)) return false
  if (user?.role === "Super Admin" || user?.role === "Province") return true
  if (user?.role === "Municipality") {
    return sameScopeValue(user.municipality, project.municipality)
  }
  if (user?.role === "Barangay") {
    return (
      sameScopeValue(user.municipality, project.municipality) &&
      sameScopeValue(user.barangay, project.barangay)
    )
  }
  return false
}

export function filterProjectsForUser<T extends ScopedProject>(
  user: PolicyUser | null | undefined,
  projects: readonly T[]
): T[] {
  return projects.filter((project) => isProjectInUserScope(user, project))
}
