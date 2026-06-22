import { describe, expect, it } from "vitest"

import { createActivityLogEvent } from "./activity-log"

describe("activity log wide events (V124-V128)", () => {
  it("creates one structured event with actor, policy, outcome, duration, and env", () => {
    const event = createActivityLogEvent({
      actor: {
        id: "u1",
        role: "Super Admin",
      },
      action: "update",
      resource: "projects",
      resourceId: "p1",
      policyKey: "projects.update",
      outcome: "success",
      startedAtMs: 100,
      endedAtMs: 145,
      requestId: "req_1",
      env: {
        version: "test",
        commit: "abc123",
      },
    })

    expect(event).toMatchObject({
      actor_user: "u1",
      actor_role: "Super Admin",
      action: "update",
      resource: "projects",
      resource_id: "p1",
      policy_key: "projects.update",
      outcome: "success",
      duration_ms: 45,
      request_id: "req_1",
      env: {
        version: "test",
        commit: "abc123",
      },
    })
  })

  it("sanitizes denied/error event messages", () => {
    const event = createActivityLogEvent({
      actor: {
        id: "u2",
        role: "Admin",
      },
      action: "reset_password",
      resource: "users",
      outcome: "denied",
      startedAtMs: 0,
      endedAtMs: 1,
      error: "password=secret-token",
    })

    expect(event.error).toBe("password=[redacted]")
  })
})
