import {
  CheckCircle2,
  FileBarChart,
  FolderKanban,
  LayoutDashboard,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react"

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
]

export function getAdminNavLabel(pathname: string): string {
  const match = adminNavItems.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
  return match?.label ?? "Admin"
}
