import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: () => ({
      getFullList: vi.fn(async () => []),
    }),
  }),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

import { PublicProjects } from "../../../public-frontend/components/public-projects"

describe("J3 public projects browse journey", () => {
  it("renders read-only project browsing without mutation controls", async () => {
    render(<PublicProjects />)

    await waitFor(() => {
      expect(screen.getByLabelText(/search projects/i)).toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /new project/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
  })
})
