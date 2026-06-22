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
import { canAccess, type PolicyUser } from "@workspace/pocketbase/domain/access-control"

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

export function getVisibleAdminNavItems(user: PolicyUser | null | undefined): AdminNavItem[] {
  return adminNavItems.filter((item) => {
    if (item.href === "/users") {
      return canAccess(user, "users.update")
    }
    return true
  })
}

export function getAdminNavLabel(pathname: string): string {
  const match = adminNavItems.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
  return match?.label ?? "Admin"
}
