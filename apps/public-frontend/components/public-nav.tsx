"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@workspace/ui/components/button"

import { ThemeToggle } from "@/components/theme-toggle"

const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"

const navItems = [
  { href: "/projects", label: "Projects" },
  { href: "/budget", label: "Budget" },
  { href: "/progress", label: "Progress" },
  { href: "/reports", label: "Reports" },
]

function navLinkClass(isActive: boolean) {
  return isActive
    ? "text-foreground font-medium"
    : "text-muted-foreground hover:text-foreground transition-colors duration-200"
}

export function PublicNav() {
  const pathname = usePathname()

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3 md:justify-center">
      <nav
        aria-label="Public"
        className="border-border bg-card/50 hidden min-h-11 items-center gap-1 rounded-full border px-1 py-1 text-sm md:flex"
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "rounded-full px-3 py-1.5 transition-colors duration-200",
                navLinkClass(isActive),
                isActive ? "bg-background" : "",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <nav
        aria-label="Public mobile"
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm md:hidden"
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-h-11 inline-flex items-center py-2 ${navLinkClass(isActive)}`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <ThemeToggle />
      <Button asChild size="sm" className="h-11 shrink-0 rounded-full px-4">
        <Link href={`${adminUrl}/login`}>Admin</Link>
      </Button>
    </div>
  )
}
