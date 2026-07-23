import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { ProjectRecord } from "@workspace/pocketbase/types"

const store = {
  allocations: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  fundMainAccounts: [] as Array<Record<string, unknown>>,
}

const createMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "budget_allocations") return store.allocations
        if (name === "budget_expenses") return store.expenses
        if (name === "budget_fund_main_accounts") return store.fundMainAccounts
        return []
      }),
      create: createMock,
    }),
  }),
}))

import { ReleasedAmountDialog } from "./released-amount-dialog"

const project: ProjectRecord = {
  id: "p1",
  collectionId: "p",
  collectionName: "projects",
  created: "",
  updated: "",
  name: "Bridge",
  category: "Infrastructure",
  status: "Ongoing",
  budget_year: 2026,
  total_budget: 200_000,
}

describe("ReleasedAmountDialog (release cap)", () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => false),
    })
    Object.defineProperty(window.HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(
      window.HTMLElement.prototype,
      "releasePointerCapture",
      {
        configurable: true,
        value: vi.fn(),
      }
    )
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    })
  })

  beforeEach(() => {
    store.allocations = [
      {
        id: "a1",
        collectionId: "a",
        collectionName: "budget_allocations",
        project: "p1",
        amount: 50_000,
        year: 2026,
        date: "2026-01-01",
      },
    ]
    store.expenses = [
      {
        id: "e1",
        collectionId: "e",
        collectionName: "budget_expenses",
        project: "p1",
        amount: 40_000,
        year: 2026,
        main_account: "Special Education Fund",
        date: "2026-06-01",
      },
    ]
    store.fundMainAccounts = [
      {
        id: "ma1",
        collectionId: "fund_main_accounts",
        collectionName: "budget_fund_main_accounts",
        name: "Special Education Fund",
        active: true,
        sort_order: 1,
      },
    ]
    createMock.mockReset().mockResolvedValue({ id: "new" })
  })

  it("should surface exact error when create would exceed allocated budget", async () => {
    const user = userEvent.setup()

    render(
      <ReleasedAmountDialog
        open
        onOpenChange={() => {}}
        projects={[project]}
        initialProjectId="p1"
        lockProject
      />
    )

    await user.clear(screen.getByLabelText(/^amount \(php\)$/i))
    await user.type(screen.getByLabelText(/^amount \(php\)$/i), "15000")
    await user.click(screen.getByLabelText(/main account/i))
    await user.click(
      await screen.findByRole("option", { name: "Special Education Fund" })
    )
    await user.click(screen.getByTestId("released-amount-submit"))

    expect(
      await screen.findByText(
        "Released amount cannot exceed the allocated budget."
      )
    ).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })
})
