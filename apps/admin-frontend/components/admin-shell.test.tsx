import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { adminNavItems } from "@/lib/admin-nav"

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}))

vi.mock("@workspace/ui/components/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <aside>{children}</aside>
  ),
  SidebarContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <ul>{children}</ul>
  ),
  SidebarMenuButton: ({
    children,
    asChild,
  }: {
    children: React.ReactNode
    asChild?: boolean
  }) => (asChild ? children : <button type="button">{children}</button>),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
  SidebarRail: () => null,
  SidebarSeparator: () => null,
  SidebarTrigger: (props: Record<string, unknown>) => (
    <button type="button" data-testid="sidebar-trigger" {...props}>
      Toggle
    </button>
  ),
}))

import { AdminShell } from "./admin-shell"

describe("AdminShell", () => {
  it("renders sidebar navigation for all admin modules", () => {
    render(
      <AdminShell>
        <p>Page content</p>
      </AdminShell>
    )

    expect(
      screen.getByRole("navigation", { name: /admin/i })
    ).toBeInTheDocument()

    for (const item of adminNavItems) {
      expect(
        screen.getByRole("link", { name: item.label })
      ).toHaveAttribute("href", item.href)
    }
  })

  it("renders top bar with sidebar toggle and page content", () => {
    render(
      <AdminShell>
        <p>Page content</p>
      </AdminShell>
    )

    const topBar = screen.getByTestId("admin-top-bar")
    expect(screen.getByTestId("sidebar-trigger")).toBeInTheDocument()
    expect(topBar).toBeInTheDocument()
    expect(screen.getByText("Page content")).toBeInTheDocument()
  })
})
