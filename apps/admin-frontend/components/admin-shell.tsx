"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"

import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth"

import {
  TooltipProvider,
} from "@workspace/ui/components/tooltip"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"

import { getAdminNavLabel, getVisibleAdminNavItems } from "@/lib/admin-nav"

type AdminShellProps = {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()
  const pageTitle = getAdminNavLabel(pathname)
  const { user, logout } = useAuth()
  const router = useRouter()
  const visibleNavItems = getVisibleAdminNavItems(user)

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="border-sidebar-border border-b px-2 py-3">
          <div className="flex flex-col gap-0.5 px-2 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">
              Cagayan PPMS
            </span>
            <span className="text-muted-foreground text-xs">
              Provincial Admin
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="Admin">
            <SidebarGroup>
            <SidebarGroupLabel>Modules</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNavItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          </nav>
        </SidebarContent>
        <SidebarFooter className="text-muted-foreground px-2 py-2 text-xs group-data-[collapsible=icon]:hidden">
          Read-only public site available separately.
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header
          data-testid="admin-top-bar"
          className="bg-background sticky top-0 z-[var(--z-sticky)] flex h-14 shrink-0 items-center gap-2 border-b px-4"
        >
          <SidebarTrigger data-testid="sidebar-trigger" />
          <SidebarSeparator
            orientation="vertical"
            className="mx-1 hidden h-4 sm:block"
          />
          <h1 className="min-w-0 truncate text-sm font-semibold">{pageTitle}</h1>
          <div className="ml-auto flex items-center gap-2">
            {user?.role ? (
              <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                {String(user.role)}
              </span>
            ) : null}
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                logout()
                router.replace("/login")
              }}
            >
              Sign out
            </Button>
          </div>
        </header>
        <div
          className="flex flex-1 flex-col gap-4 p-4 pt-4 md:p-6 md:pt-6"
          data-testid="admin-content"
        >
          {children}
        </div>
      </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
