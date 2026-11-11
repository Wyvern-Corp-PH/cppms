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

describe("pickAllocationCreator", () => {
  it("should return the earliest successful project creator when that user exists", () => {
    const logs = [
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
    ]

    expect(
      pickAllocationCreator(logs, "proj1", (userId) => userId === "creator")
    ).toBe("creator")
  })

  it("should use created_at when created is missing", () => {
    const logs = [
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
    ]

    expect(pickAllocationCreator(logs, "proj1", () => true)).toBe("early-user")
  })

  it("should return empty when the earliest creator is blank", () => {
    const logs = [
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
    ]

    expect(pickAllocationCreator(logs, "proj1", () => true)).toBe("")
  })

  it("should return empty when the creator user is missing", () => {
    expect(pickAllocationCreator([createLog({})], "proj1", () => false)).toBe(
      ""
    )
  })

  it("should return empty when no successful project create log matches", () => {
    expect(pickAllocationCreator([], "proj1", () => true)).toBe("")
  })
})
