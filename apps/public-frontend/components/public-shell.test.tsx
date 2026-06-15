import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

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

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}))

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => (
    <button type="button" data-testid="theme-toggle" aria-label="Toggle color theme">
      Theme
    </button>
  ),
}))

import { PublicShell } from "./public-shell"

describe("PublicShell (V31)", () => {
  it("renders civic header, nav links, and footer without SaaS metric row", () => {
    render(
      <PublicShell>
        <p>Content</p>
      </PublicShell>
    )

    expect(screen.getAllByText("Cagayan PPMS").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole("link", { name: /^admin$/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/login")
    )
    const headerNavs = screen.getAllByRole("navigation", { name: /public/i })
    expect(headerNavs.length).toBeGreaterThanOrEqual(1)
    expect(within(headerNavs[0]!).getByRole("link", { name: /^projects$/i })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: /footer/i })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /browse projects/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/ARR|MRR|active users/i)).not.toBeInTheDocument()
  })
})
