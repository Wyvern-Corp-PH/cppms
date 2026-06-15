import { describe, expect, it } from "vitest"

import {
  buildProgressSummaryCards,
  countActiveProjects,
  countProgressBuckets,
  countUpdatesToday,
} from "./progress-summary"

describe("countProgressBuckets (V7, V8)", () => {
  it("counts needs attention below 25%", () => {
    expect(countProgressBuckets([{ progress_pct: 10 }, { progress_pct: 24 }])).toEqual(
      { needsAttention: 2, onTrack: 0, other: 0 }
    )
  })

  it("counts on track at or above 50%", () => {
    expect(countProgressBuckets([{ progress_pct: 50 }, { progress_pct: 80 }])).toEqual(
      { needsAttention: 0, onTrack: 2, other: 0 }
    )
  })
})

describe("buildProgressSummaryCards (V81)", () => {
  it("counts active projects and updates today", () => {
    expect(
      buildProgressSummaryCards(
        [
          { status: "Planning", progress_pct: 10 },
          { status: "Ongoing", progress_pct: 60 },
          { status: "Completed", progress_pct: 100 },
        ],
        [{ created: "2026-06-15T10:00:00Z" }, { created: "2026-06-14T10:00:00Z" }]
      )
    ).toEqual({
      activeProjects: 2,
      onTrack: 2,
      needsAttention: 1,
      updatesToday: 1,
    })
  })

  it("counts updates today from updated_at", () => {
    expect(
      countUpdatesToday([{ updated_at: "2026-06-15" }], new Date("2026-06-15T12:00:00Z"))
    ).toBe(1)
  })

  it("counts active project statuses", () => {
    expect(
      countActiveProjects([
        { status: "Planning" },
        { status: "Procurement" },
        { status: "Approved" },
      ])
    ).toBe(2)
  })
})
