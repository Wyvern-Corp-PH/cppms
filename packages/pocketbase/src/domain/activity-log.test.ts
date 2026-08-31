import { describe, expect, it } from "vitest"

import {
  activityLogActionLabel,
  createActivityLogEvent,
  filterActivityLogs,
} from "./activity-log"

describe("activity log wide events (V124-V128)", () => {
  it("creates one structured event with actor, policy, outcome, duration, and env", () => {
    const event = createActivityLogEvent({
      actor: {
        id: "u1",
        role: "Super Admin",
        municipality: "Tuguegarao City",
        barangay: "Centro 01",
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
      actor_municipality: "Tuguegarao City",
      actor_barangay: "Centro 01",
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
        role: "Province",
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

describe("activity log filters", () => {
  const logs = [
    {
      actor_user: "u-ana",
      action: "create" as const,
      created: "2026-06-20 00:00:00.000Z",
    },
    {
      actor_user: "u-ana",
      action: "approve" as const,
      created: "2026-06-23 00:00:00.000Z",
    },
    {
      actor_user: "u-ben",
      action: "delete" as const,
      created: "2026-06-25 00:00:00.000Z",
    },
  ]

  it("should map stored audit actions to human-readable labels", () => {
    expect(activityLogActionLabel("create")).toBe("Created")
    expect(activityLogActionLabel("update")).toBe("Edited")
    expect(activityLogActionLabel("delete")).toBe("Deleted")
    expect(activityLogActionLabel("approve")).toBe("Approved")
    expect(activityLogActionLabel("request_revision")).toBe("Requested revision")
    expect(activityLogActionLabel("reset_password")).toBe("Reset password")
  })

  it("should AND actor, action, and date filters and treat unset as all", () => {
    expect(filterActivityLogs(logs, {})).toHaveLength(3)
    expect(filterActivityLogs(logs, { actor: "all", action: "all" })).toHaveLength(3)
    expect(filterActivityLogs(logs, { actor: "u-ana" })).toHaveLength(2)
    expect(filterActivityLogs(logs, { action: "delete" })).toHaveLength(1)
    expect(
      filterActivityLogs(logs, { dateFrom: "2026-06-22", dateTo: "2026-06-24" })
    ).toEqual([logs[1]])
    expect(
      filterActivityLogs(logs, {
        actor: "u-ana",
        action: "approve",
        dateFrom: "2026-06-22",
        dateTo: "2026-06-24",
      })
    ).toEqual([logs[1]])
  })
})
