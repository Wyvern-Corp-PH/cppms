"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { PublicNav } from "@/components/public-nav"

type PublicShellProps = {
  children: React.ReactNode
}

const footerLinks = [
  { href: "/projects", label: "Projects" },
  { href: "/budget", label: "Budget" },
  { href: "/progress", label: "Progress" },
  { href: "/reports", label: "Reports" },
]

export function PublicShell({ children }: PublicShellProps) {
  const pathname = usePathname()
  const isLanding = pathname === "/"

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-4">
          <Link
            href="/"
            className="shrink-0 font-semibold tracking-tight transition-colors duration-200 hover:text-primary"
          >
            Cagayan PPMS
          </Link>
          <div className="min-w-0 flex-1">
            <PublicNav />
          </div>
        </div>
      </header>
      <main
        className={
          isLanding
            ? "flex w-full flex-1 flex-col"
            : "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8"
        }
      >
        {children}
      </main>
      <footer className="border-t border-border bg-background">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="font-semibold">Cagayan PPMS</p>
            <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
              Provincial Project Monitoring System — read-only public view of official
              project records.
            </p>
          </div>
          <nav aria-label="Footer">
            <p className="text-sm font-medium">Sections</p>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors duration-200 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  )
}
