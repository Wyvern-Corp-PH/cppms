import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: () => ({
      getFullList: vi.fn(async () => []),
    }),
  }),
}))

import { ProgressModule } from "./progress-module"

describe("ProgressModule (V81, V84)", () => {
  it("shows four progress summary cards", async () => {
    render(<ProgressModule />)

    await waitFor(() => {
      expect(screen.getByTestId("progress-active")).toBeInTheDocument()
      expect(screen.getByTestId("progress-on-track")).toBeInTheDocument()
      expect(screen.getByTestId("progress-needs-attention")).toBeInTheDocument()
      expect(screen.getByTestId("progress-updates-today")).toBeInTheDocument()
    })
  })
})
