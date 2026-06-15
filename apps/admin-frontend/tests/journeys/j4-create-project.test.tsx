import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: () => ({
      getFullList: vi.fn(async () => []),
      create: vi.fn(),
    }),
  }),
}))

import { ProjectsModule } from "@/components/projects-module"

describe("J4 create project journey", () => {
  it("admin can open the project create modal from the projects module", async () => {
    const user = userEvent.setup()
    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /new project/i })).toBeInTheDocument()
    })
  })
})
