import { describe, expect, it } from "vitest"

import {
  deadlineStatusTone,
  resolveDeadlineStatus,
} from "./deadline-status"

describe("resolveDeadlineStatus (V11)", () => {
  const today = new Date("2026-06-15")

  it("returns Completed at 100% progress", () => {
    expect(resolveDeadlineStatus("2026-12-31", 100, today)).toBe("Completed")
  })

  it("returns Lapsed after target date", () => {
    expect(resolveDeadlineStatus("2026-01-01", 40, today)).toBe("Lapsed")
  })

  it("returns Near Deadline within 14 days", () => {
    expect(resolveDeadlineStatus("2026-06-20", 40, today)).toBe("Near Deadline")
  })

  it("returns On Track when comfortably ahead", () => {
    expect(resolveDeadlineStatus("2026-12-31", 40, today)).toBe("On Track")
  })
})

describe("deadlineStatusTone (V11)", () => {
  it("maps statuses to semantic tones", () => {
    expect(deadlineStatusTone("Lapsed")).toBe("destructive")
    expect(deadlineStatusTone("Completed")).toBe("success")
    expect(deadlineStatusTone("On Track")).toBe("info")
    expect(deadlineStatusTone("Near Deadline")).toBe("warning")
  })
})
