import { describe, expect, it } from "vitest"

import {
  buildProgressSummaryCards,
  countActiveProjects,
  countProgressBuckets,
  countUpdatesToday,
  effectiveProgressPct,
  projectProgressPatchFromUpdate,
} from "./progress-summary"

describe("effectiveProgressPct", () => {
  it("should prefer latest update to_pct when project progress_pct is stale", () => {
    expect(
      effectiveProgressPct({ progress_pct: 0 }, [{ to_pct: 86 }])
    ).toBe(86)
  })

  it("should fall back to project progress_pct when there are no updates", () => {
    expect(effectiveProgressPct({ progress_pct: 40 }, [])).toBe(40)
  })

  it("should use the first update when multiple are provided newest-first", () => {
    expect(
      effectiveProgressPct({ progress_pct: 10 }, [
        { to_pct: 78 },
        { to_pct: 40 },
      ])
    ).toBe(78)
  })
})

describe("projectProgressPatchFromUpdate", () => {
  it("should set progress_pct to to_pct and keep status below 100", () => {
    expect(projectProgressPatchFromUpdate(86, "Ongoing")).toEqual({
      progress_pct: 86,
      status: "Ongoing",
    })
  })

  it("should set status Ready for Review when to_pct reaches 100", () => {
    expect(projectProgressPatchFromUpdate(100, "Ongoing")).toEqual({
      progress_pct: 100,
      status: "Ready for Review",
    })
  })
})

describe("countProgressBuckets (V7, V8)", () => {
  it("counts needs attention below 25%", () => {
    expect(
      countProgressBuckets([{ progress_pct: 10 }, { progress_pct: 24 }])
    ).toEqual({ needsAttention: 2, onTrack: 0, other: 0 })
  })

  it("counts on track at or above 50%", () => {
    expect(
      countProgressBuckets([{ progress_pct: 50 }, { progress_pct: 80 }])
    ).toEqual({ needsAttention: 0, onTrack: 2, other: 0 })
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
        [
          { created: "2026-06-15T10:00:00Z" },
          { created: "2026-06-14T10:00:00Z" },
        ],
        new Date("2026-06-15T12:00:00Z")
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
      countUpdatesToday(
        [{ updated_at: "2026-06-15" }],
        new Date("2026-06-15T12:00:00Z")
      )
    ).toBe(1)
  })

  it("counts active project statuses", () => {
    expect(
      countActiveProjects([
        { status: "Planning" },
        { status: "Procurement" },
        { status: "For Revision" },
        { status: "Completed" },
      ])
    ).toBe(3)
  })
})
