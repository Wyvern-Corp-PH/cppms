import { describe, expect, it } from "vitest"

import { latestRevisionAction } from "./latest-revision-action"

const note = (
  id: string,
  overrides: {
    project?: string
    action?: string
    reason?: string
    created?: string
    created_at?: string
  } = {}
) => ({
  id,
  project: overrides.project ?? "p1",
  action: overrides.action ?? "request_revision",
  reason: overrides.reason ?? "Fix the photos",
  created: overrides.created,
  created_at: overrides.created_at,
})

describe("latestRevisionAction", () => {
  it("should return the newest request-revision reason for the project", () => {
    const picked = latestRevisionAction(
      [
        note("old", { created: "2026-01-01T00:00:00.000Z", reason: "Older note" }),
        note("new", { created: "2026-06-01T00:00:00.000Z", reason: "Latest note" }),
        note("blank", {
          created: "2026-07-01T00:00:00.000Z",
          reason: "",
        }),
        note("approve", {
          created: "2026-08-01T00:00:00.000Z",
          action: "approve",
          reason: "Not a revision",
        }),
        note("other", {
          created: "2026-09-01T00:00:00.000Z",
          project: "p2",
          reason: "Other project",
        }),
      ],
      "p1"
    )

    expect(picked?.reason).toBe("Latest note")
    expect(picked?.id).toBe("new")
  })

  it("should return null when no request revision has a reason", () => {
    expect(
      latestRevisionAction(
        [note("blank", { reason: "" }), note("approve", { action: "reject", reason: "No" })],
        "p1"
      )
    ).toBeNull()
  })

  it("should sort by id when created is missing", () => {
    const picked = latestRevisionAction(
      [
        note("m-1", { reason: "Earlier id" }),
        note("m-2", { reason: "Later id" }),
      ],
      "p1"
    )

    expect(picked?.reason).toBe("Later id")
  })

  it("should prefer created over id", () => {
    const picked = latestRevisionAction(
      [
        note("z", { created: "2026-01-01T00:00:00.000Z", reason: "Old created" }),
        note("a", { created: "2026-02-01T00:00:00.000Z", reason: "New created" }),
      ],
      "p1"
    )

    expect(picked?.reason).toBe("New created")
  })

  it("should return the later created_at even when its id sorts first", () => {
    const picked = latestRevisionAction(
      [
        note("z-later-id", {
          created_at: "2026-01-01T00:00:00.000Z",
          reason: "Older stamp",
        }),
        note("a-earlier-id", {
          created_at: "2026-06-01T00:00:00.000Z",
          reason: "Newer stamp",
        }),
      ],
      "p1"
    )

    expect(picked?.id).toBe("a-earlier-id")
    expect(picked?.reason).toBe("Newer stamp")
  })
})
