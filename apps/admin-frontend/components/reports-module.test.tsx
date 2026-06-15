import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: () => ({
      getFullList: vi.fn(async () => []),
    }),
  }),
}))

import { ReportsModule } from "./reports-module"

describe("ReportsModule (V12)", () => {
  it("exposes admin export buttons and reports subtitle", async () => {
    render(<ReportsModule />)

    await waitFor(() => {
      expect(screen.getByText("Generate and export reports as Excel files")).toBeInTheDocument()
      expect(screen.getByTestId("export-all-sheets")).toBeInTheDocument()
      expect(screen.getByTestId("export-current-tab")).toBeInTheDocument()
    })
  })
})
