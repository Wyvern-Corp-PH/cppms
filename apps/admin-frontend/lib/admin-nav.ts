import {
  CheckCircle2,
  FileBarChart,
  FolderKanban,
  LayoutDashboard,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import {
  canAccess,
  isActiveUser,
  type PolicyKey,
  type PolicyUser,
} from "@workspace/pocketbase/domain/access-control"

export type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const adminNavItems: AdminNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/approvals", label: "Approvals", icon: CheckCircle2 },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/users", label: "User Management", icon: Users },
]

function canAccessAny(
  user: PolicyUser | null | undefined,
  keys: readonly PolicyKey[]
): boolean {
  return keys.some((key) => canAccess(user, key))
}

export function canAccessAdminPath(
  user: PolicyUser | null | undefined,
  pathname: string
): boolean {
  if (!isActiveUser(user)) return false
  if (pathname.startsWith("/dashboard") || pathname === "/") return true
  if (pathname.startsWith("/projects")) return true
  if (pathname.startsWith("/budget")) {
    return canAccessAny(user, [
      "budget_allocations.create",
      "budget_expenses.create",
    ])
  }
  if (pathname.startsWith("/progress")) {
    return canAccess(user, "progress_updates.create")
  }
  if (pathname.startsWith("/approvals")) {
    return canAccess(user, "approval_actions.create")
  }
  if (pathname.startsWith("/reports")) {
    return canAccess(user, "reports.view")
  }
  if (pathname.startsWith("/users")) {
    return canAccess(user, "users.update")
  }
  if (pathname.startsWith("/locations")) {
    return canAccess(user, "locations.update")
  }
  return false
}

export function getVisibleAdminNavItems(
  user: PolicyUser | null | undefined
): AdminNavItem[] {
  return adminNavItems.filter((item) => canAccessAdminPath(user, item.href))
}

export function getAdminNavLabel(pathname: string): string {
  const match = adminNavItems.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
  return match?.label ?? "Admin"
}
