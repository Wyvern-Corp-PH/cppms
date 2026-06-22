import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const authState = {
  user: {
    id: "u1",
    role: "Admin",
    account_status: "Active",
  },
}

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
    collection: (name: string) => ({
      getFullList: vi.fn(async () =>
        name === "activity_logs"
          ? [
              {
                id: "log1",
                collectionId: "logs",
                collectionName: "activity_logs",
                created: "2026-06-23 00:00:00.000Z",
                updated: "",
                actor_user: "u1",
                actor_role: "Super Admin",
                action: "update",
                resource: "projects",
                outcome: "success",
                duration_ms: 4,
              },
            ]
          : []
      ),
    }),
  }),
}))

vi.mock("@/lib/auth", () => ({
  useAuth: () => authState,
}))

import { ReportsModule } from "./reports-module"

describe("ReportsModule (V12)", () => {
  beforeEach(() => {
    authState.user = {
      id: "u1",
      role: "Admin",
      account_status: "Active",
    }
  })

  it("exposes admin export buttons and reports subtitle", async () => {
    render(<ReportsModule />)

    await waitFor(() => {
      expect(screen.getByText("Generate and export reports as Excel files")).toBeInTheDocument()
      expect(screen.getByTestId("export-all-sheets")).toBeInTheDocument()
      expect(screen.getByTestId("export-current-tab")).toBeInTheDocument()
    })
  })

  it("shows activity logs only to Super Admin", async () => {
    authState.user = {
      id: "u1",
      role: "Super Admin",
      account_status: "Active",
    }

    render(<ReportsModule />)

    await waitFor(() => {
      expect(screen.getByText("Activity Logs")).toBeInTheDocument()
      expect(screen.getByText("projects")).toBeInTheDocument()
    })
  })
})
