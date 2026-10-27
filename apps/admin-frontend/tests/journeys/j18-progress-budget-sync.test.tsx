import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const store = {
  projects: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  allocations: [] as Array<Record<string, unknown>>,
  locations: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
  fundingYears: [
    {
      id: "fy1",
      collectionId: "budget_funding_years",
      collectionName: "budget_funding_years",
      name: "2026",
      active: true,
      sort_order: 1,
    },
  ] as Array<Record<string, unknown>>,
  mainAccounts: [
    {
      id: "ma1",
      collectionId: "budget_fund_main_accounts",
      collectionName: "budget_fund_main_accounts",
      name: "General Fund",
      active: true,
      sort_order: 1,
    },
  ] as Array<Record<string, unknown>>,
  subAccounts: [
    {
      id: "sa1",
      collectionId: "budget_fund_sub_accounts",
      collectionName: "budget_fund_sub_accounts",
      name: "GF - Proper",
      main_account: "General Fund",
      active: true,
      sort_order: 1,
    },
  ] as Array<Record<string, unknown>>,
  authRecord: {
    id: "barangay-user",
    email: "barangay@example.test",
    name: "Current Barangay User",
    role: "Barangay",
    account_status: "Active",
    municipality: "Tuguegarao City",
    barangay: "Centro 01 (Bagumbayan)",
  } as Record<string, unknown> | null,
}

vi.mock("@/lib/pocketbase", () => ({
  getPocketBase: () => ({
    authStore: {
      record: store.authRecord,
    },
    collection: (name: string) => ({
      getFullList: vi.fn(async () => {
        if (name === "projects") return store.projects
        if (name === "progress_updates") return store.updates
        if (name === "budget_expenses") return store.expenses
        if (name === "budget_allocations") return store.allocations
        if (name === "locations") return store.locations
        if (name === "users") return store.users
        if (name === "budget_funding_years") return store.fundingYears
        if (name === "budget_fund_main_accounts") return store.mainAccounts
        if (name === "budget_fund_sub_accounts") return store.subAccounts
        return []
      }),
      create: vi.fn(async (payload: Record<string, unknown> | FormData) => {
        if (name === "budget_expenses") {
          const record = {
            id: "e-sync",
            collectionId: "e",
            collectionName: "budget_expenses",
            created: "2026-07-09T00:00:00.000Z",
            updated: "2026-07-09T00:00:00.000Z",
            ...(payload as Record<string, unknown>),
            amount: String((payload as Record<string, unknown>).amount),
            year: String((payload as Record<string, unknown>).year),
          }
          store.expenses.push(record)
          return record
        }

        if (name === "projects") {
          const projectFields: Record<string, unknown> = {}
          if (payload instanceof FormData) {
            payload.forEach((value, key) => {
              if (value instanceof File) {
                const current = projectFields[key]
                const names = Array.isArray(current)
                  ? current
                  : current === undefined
                    ? []
                    : [current]
                projectFields[key] = [...names, value.name]
              } else {
                projectFields[key] = value
              }
            })
          } else {
            Object.assign(projectFields, payload)
          }
          const project: Record<string, unknown> = {
            id: "p-created",
            collectionId: "p",
            collectionName: "projects",
            created: "2026-07-09T00:00:00.000Z",
            updated: "2026-07-09T00:00:00.000Z",
            ...projectFields,
          }
          store.projects.unshift(project)
          if (project.source_of_fund) {
            store.allocations.push({
              id: "a-created",
              collectionId: "a",
              collectionName: "budget_allocations",
              project: project.id,
              amount: Number(project.total_budget),
              year: Number(project.funding_year),
              date: "2026-07-09",
            })
          }
          return project
        }

        const progressRecord = {
          id: "pu-sync",
          collectionId: "updates",
          collectionName: "progress_updates",
          created: "2026-07-09T00:00:00.000Z",
          updated: "2026-07-09T00:00:00.000Z",
          project: (payload as FormData).get("project"),
          from_pct: Number((payload as FormData).get("from_pct")),
          to_pct: Number((payload as FormData).get("to_pct")),
          site_photo: [],
        }
        store.updates.unshift(progressRecord)
        return progressRecord
      }),
      update: vi.fn(async (id: string, payload: Record<string, unknown>) => {
        const index = store.projects.findIndex((row) => row.id === id)
        if (index >= 0) {
          store.projects[index] = { ...store.projects[index], ...payload }
        }
        return store.projects[index]
      }),
      delete: vi.fn(),
    }),
  }),
}))

import { BudgetModule } from "@/components/budget-module"
import { ProgressModule } from "@/components/progress-module"
import { ProjectsModule } from "@/components/projects-module"

function makeFile(name: string, type = "application/pdf") {
  return new File(["content"], name, { type })
}

describe("J18 progress update syncs released amount to budget module", () => {
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
    store.projects = [
      {
        id: "p1",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Barangay Bridge",
        category: "Infrastructure",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 200_000,
        progress_pct: 25,
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      },
    ]
    store.updates = []
    store.expenses = []
    store.allocations = [
      {
        id: "a1",
        collectionId: "a",
        collectionName: "budget_allocations",
        project: "p1",
        amount: 10_000_000,
        year: 2026,
        date: "2026-01-01",
      },
    ]
    store.locations = []
    store.users = []
    store.authRecord = {
      id: "barangay-user",
      email: "barangay@example.test",
      name: "Current Barangay User",
      role: "Barangay",
      account_status: "Active",
      municipality: "Tuguegarao City",
      barangay: "Centro 01 (Bagumbayan)",
    }
  })

  function useActor(
    role: "Barangay" | "Municipality" | "Province" | "Super Admin"
  ) {
    if (role === "Barangay") {
      store.authRecord = {
        id: "barangay-user",
        email: "barangay@example.test",
        name: "Current Barangay User",
        role: "Barangay",
        account_status: "Active",
        municipality: "Tuguegarao City",
        barangay: "Centro 01 (Bagumbayan)",
      }
      return
    }
    if (role === "Municipality") {
      store.authRecord = {
        id: "municipality-user",
        email: "municipality@example.test",
        name: "Current Municipality User",
        role: "Municipality",
        account_status: "Active",
        municipality: "Tuguegarao City",
      }
      return
    }
    if (role === "Province") {
      store.authRecord = {
        id: "province-user",
        email: "province@example.test",
        name: "Current Province User",
        role: "Province",
        account_status: "Active",
      }
      return
    }
    store.authRecord = {
      id: "super-admin-user",
      email: "super@example.test",
      name: "Current Super Admin User",
      role: "Super Admin",
      account_status: "Active",
    }
  }

  it.each([
    { role: "Barangay" as const, seesOutOfScope: false },
    { role: "Municipality" as const, seesOutOfScope: false },
    { role: "Province" as const, seesOutOfScope: true },
    { role: "Super Admin" as const, seesOutOfScope: true },
  ])(
    "shows synced released amount in Budget after a $role progress save",
    async ({ role, seesOutOfScope }) => {
      useActor(role)
      store.projects.push({
        id: "p-out",
        collectionId: "p",
        collectionName: "projects",
        created: "",
        updated: "",
        name: "Lasam School",
        category: "Education",
        status: "Ongoing",
        budget_year: 2026,
        bid_price: 100_000,
        progress_pct: 10,
        municipality: "Lasam",
        barangay: "Centro",
      })
      store.expenses.push({
        id: "e-out",
        collectionId: "e",
        collectionName: "budget_expenses",
        created: "2026-06-01T00:00:00.000Z",
        updated: "2026-06-01T00:00:00.000Z",
        project: "p-out",
        amount: "10000",
        year: "2026",
        main_account: "Special Education Fund",
        sub_account: "School supplies",
        date: "2026-06-01",
        receipt_number: "OUT-1",
        description: "Out of scope release",
      })

      const user = userEvent.setup()
      const generatedExpenseDate = new Date().toISOString().slice(0, 10)

      render(<ProgressModule />)

      const projectRow = await screen.findByTestId("progress-row-p1")
      await user.click(
        within(projectRow).getByRole("button", { name: /update progress/i })
      )
      await user.upload(
        screen.getByTestId("document-upload-input-site-photo"),
        makeFile("site.jpg", "image/jpeg")
      )
      await user.type(
        screen.getByLabelText(/^update notes$/i),
        "J18 progress update"
      )
      await user.type(screen.getByLabelText(/^amount \(php\)$/i), "2500")
      await user.type(screen.getByLabelText(/^description$/i), "J18 release")
      await user.click(screen.getByLabelText(/^main account$/i))
      await user.click(screen.getByRole("option", { name: "General Fund" }))
      await user.click(screen.getByLabelText(/^sub account$/i))
      await user.click(screen.getByRole("option", { name: "GF - Proper" }))
      await user.click(screen.getByRole("button", { name: /save update/i }))

      await waitFor(() => {
        const synced = store.expenses.find((row) => row.description === "J18 release")
        expect(synced).toMatchObject({
          project: "p1",
          amount: "2500",
          year: "2026",
          date: generatedExpenseDate,
          description: "J18 release",
          main_account: "General Fund",
          sub_account: "GF - Proper",
          progress_update: "pu-sync",
        })
        expect(synced).not.toHaveProperty("receipt_number")
      })
      expect(
        store.expenses.filter((row) => row.description === "J18 release")
      ).toHaveLength(1)

      cleanup()
      render(<BudgetModule />)

      await waitFor(() => {
        expect(screen.getByTestId("budget-spent")).toHaveTextContent(
          seesOutOfScope ? "₱12,500" : "₱2,500"
        )
      })

      await user.click(screen.getByRole("tab", { name: /released amount/i }))

      await waitFor(() => {
        expect(screen.getByText("-2,500")).toBeInTheDocument()
        expect(screen.getByText("J18 release")).toBeInTheDocument()
        expect(screen.getAllByText("Barangay Bridge").length).toBeGreaterThan(0)
      })
      expect(screen.queryByText("RCPT-18")).not.toBeInTheDocument()

      if (seesOutOfScope) {
        expect(screen.getByText("Lasam School")).toBeInTheDocument()
        expect(screen.getByText("OUT-1")).toBeInTheDocument()
      } else {
        expect(screen.queryByText("Lasam School")).not.toBeInTheDocument()
        expect(screen.queryByText("OUT-1")).not.toBeInTheDocument()
      }
    },
    20_000
  )

  it("shows a new Provincial project and its single linked allocation in Budget", async () => {
    useActor("Province")
    store.projects = []
    store.allocations = []
    store.expenses = []
    store.locations = [
      {
        id: "loc-municipality",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Tuguegarao City",
        slug: "tuguegarao-city",
        level: "Municipality",
        municipality_name: "Tuguegarao City",
        municipality_slug: "tuguegarao-city",
        active: true,
        sort_order: 1,
      },
      {
        id: "loc-barangay",
        collectionId: "locations",
        collectionName: "locations",
        created: "",
        updated: "",
        name: "Tuguegarao City / Centro 01 (Bagumbayan)",
        slug: "tuguegarao-city/centro-01-bagumbayan",
        level: "Barangay",
        municipality_name: "Tuguegarao City",
        municipality_slug: "tuguegarao-city",
        barangay_name: "Centro 01 (Bagumbayan)",
        active: true,
        sort_order: 2,
      },
    ]
    const user = userEvent.setup()

    render(<ProjectsModule />)

    await user.click(await screen.findByTestId("create-project"))
    await user.type(screen.getByLabelText(/project name/i), "J18 Provincial Road")
    await user.type(screen.getByLabelText(/^description$/i), "J18 allocation")
    await user.type(screen.getByLabelText(/^location$/i), "Provincial Hall")
    await user.click(screen.getByRole("combobox", { name: /^municipality$/i }))
    await user.click(await screen.findByRole("option", { name: "Tuguegarao City" }))
    await user.click(screen.getByRole("combobox", { name: /^barangay$/i }))
    await user.click(
      await screen.findByRole("option", { name: "Centro 01 (Bagumbayan)" })
    )
    await user.click(screen.getByLabelText(/^funding year$/i))
    await user.click(
      await screen.findByRole("option", { name: String(new Date().getFullYear()) })
    )
    await user.click(screen.getByLabelText(/^source of fund$/i))
    await user.click(await screen.findByRole("option", { name: "1 General Fund" }))
    await user.type(screen.getByLabelText(/^total budget$/i), "75000")
    await user.upload(
      screen.getByTestId("document-upload-input-moa-file"),
      makeFile("moa.pdf")
    )
    await user.upload(
      screen.getByTestId("document-upload-input-resolution-file"),
      makeFile("resolution.pdf")
    )
    await user.upload(
      screen.getByTestId("document-upload-input-supporting-file"),
      makeFile("supporting.pdf")
    )
    await user.click(screen.getByRole("button", { name: /^save$/i }))

    await waitFor(() => expect(store.projects).toHaveLength(1))
    expect(store.allocations).toHaveLength(1)
    expect(store.allocations[0]).toMatchObject({
      project: store.projects[0]?.id,
      amount: 75000,
    })

    cleanup()
    render(<BudgetModule />)

    await waitFor(() => {
      expect(screen.getByTestId("budget-total")).toHaveTextContent("₱75,000")
      expect(screen.getByText("J18 Provincial Road")).toBeInTheDocument()
      expect(screen.getByText(/\+75,000/)).toBeInTheDocument()
    })
  })
})
