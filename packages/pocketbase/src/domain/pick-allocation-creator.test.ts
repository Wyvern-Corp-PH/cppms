import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runInNewContext } from "node:vm"
import { describe, expect, it } from "vitest"

import {
  pickAllocationCreator,
  type AllocationCreatorLog,
} from "./pick-allocation-creator"

function createLog(
  overrides: Partial<AllocationCreatorLog>
): AllocationCreatorLog {
  return {
    id: "log1",
    resource: "projects",
    action: "create",
    outcome: "success",
    resource_id: "proj1",
    actor_user: "creator",
    created: "2026-01-15T00:00:00.000Z",
    ...overrides,
  }
}

type CreatorCase = {
  name: string
  logs: AllocationCreatorLog[]
  userExists: (userId: string) => boolean
  expected: string
}

const creatorCases: CreatorCase[] = [
  {
    name: "should return the earliest successful project creator when that user exists",
    logs: [
      createLog({
        id: "later",
        actor_user: "later-user",
        created: "2026-02-02T00:00:00.000Z",
      }),
      createLog({
        id: "other-resource",
        resource: "users",
        actor_user: "other-resource",
        created: "2026-01-01T00:00:00.000Z",
      }),
      createLog({
        id: "failed",
        outcome: "error",
        actor_user: "failed-user",
        created: "2026-01-01T00:00:00.000Z",
      }),
      createLog({
        id: "edited",
        action: "update",
        actor_user: "editor",
        created: "2026-01-01T00:00:00.000Z",
      }),
      createLog({
        id: "other-project",
        resource_id: "proj2",
        actor_user: "other-project",
        created: "2026-01-01T00:00:00.000Z",
      }),
      createLog({
        id: "decoy-created-at",
        actor_user: "decoy",
        created: "2026-03-01T00:00:00.000Z",
        created_at: "2020-01-01T00:00:00.000Z",
      }),
      createLog({
        id: "tie-b",
        actor_user: "tie-later-id",
        created: "2026-01-15T00:00:00.000Z",
      }),
      createLog({
        id: "creator",
        actor_user: " creator ",
        created: "2026-01-15T00:00:00.000Z",
      }),
    ],
    userExists: (userId) => userId === "creator",
    expected: "creator",
  },
  {
    name: "should use created_at when created is missing",
    logs: [
      createLog({
        id: "late",
        actor_user: "late-user",
        created: "",
        created_at: "2026-02-01T00:00:00.000Z",
      }),
      createLog({
        id: "early",
        actor_user: "early-user",
        created: "",
        created_at: "2026-01-01T00:00:00.000Z",
      }),
    ],
    userExists: () => true,
    expected: "early-user",
  },
  {
    name: "should return empty when the earliest creator is blank",
    logs: [
      createLog({
        id: "blank",
        actor_user: "  ",
        created: "2026-01-01T00:00:00.000Z",
      }),
      createLog({
        id: "later",
        actor_user: "later-user",
        created: "2026-02-01T00:00:00.000Z",
      }),
    ],
    userExists: () => true,
    expected: "",
  },
  {
    name: "should return empty when the creator user is missing",
    logs: [createLog({})],
    userExists: () => false,
    expected: "",
  },
  {
    name: "should return empty when no successful project create log matches",
    logs: [],
    userExists: () => true,
    expected: "",
  },
]

describe("pickAllocationCreator", () => {
  it.each(creatorCases)("$name", ({ logs, userExists, expected }) => {
    expect(pickAllocationCreator(logs, "proj1", userExists)).toBe(expected)
  })
})

const migrationFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../pb_migrations/1740000043_backfill_allocation_creator.js"
)

type BoundUpdate = { sql: string; params: { by: string; id: string } }

function runBackfill(
  logs: AllocationCreatorLog[],
  userExists: (userId: string) => boolean,
  allocatedBy = ""
) {
  let up: ((app: unknown) => void) | undefined
  runInNewContext(readFileSync(migrationFile, "utf8"), {
    migrate: (upFn: (app: unknown) => void) => {
      up = upFn
    },
  })
  const updates: BoundUpdate[] = []
  const saved: unknown[] = []
  const wrap = (fields: Record<string, unknown>) => ({
    id: String(fields.id ?? ""),
    get: (field: string) => fields[field] ?? "",
  })
  const app = {
    findCollectionByNameOrId: (name: string) => ({ name }),
    findRecordById: (collection: string, id: string) => {
      if (collection === "users" && userExists(id)) return { id }
      throw new Error("missing")
    },
    // The migration filters server-side; mirror that predicate for the fake.
    findRecordsByFilter: (collection: string, filter: string) => {
      if (collection === "budget_allocations") {
        return [wrap({ id: "alloc1", project: "proj1", allocated_by: allocatedBy })]
      }
      return logs
        .filter(
          (log) =>
            log.resource === "projects" &&
            log.action === "create" &&
            log.outcome === "success" &&
            filter.includes(`resource_id = "${log.resource_id}"`)
        )
        .map((log) => wrap({ ...log }))
    },
    save: (record: unknown) => saved.push(record),
    db: () => ({
      newQuery: (sql: string) => ({
        bind: (params: BoundUpdate["params"]) => ({
          execute: () => updates.push({ sql, params }),
        }),
      }),
    }),
  }
  up?.(app)
  return { updates, saved }
}

describe("backfill allocation creator migration", () => {
  it.each(creatorCases)(
    "should pick the same creator as the domain picker: $name",
    ({ logs, userExists, expected }) => {
      const { updates } = runBackfill(logs, userExists)

      expect(updates.map((update) => update.params.by)).toEqual(
        expected ? [expected] : []
      )
    }
  )

  it("should write allocated_by with a bound update and never save the record", () => {
    const { updates, saved } = runBackfill([createLog({})], () => true)

    expect(saved).toEqual([])
    expect(updates).toEqual([
      {
        sql: "UPDATE budget_allocations SET allocated_by = {:by} WHERE id = {:id} AND (allocated_by IS NULL OR allocated_by = '')",
        params: { by: "creator", id: "alloc1" },
      },
    ])
  })

  it("should skip an allocation whose allocated_by is already set", () => {
    const { updates, saved } = runBackfill([createLog({})], () => true, "someone")

    expect(updates).toEqual([])
    expect(saved).toEqual([])
  })
})
