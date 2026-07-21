import { describe, expect, it } from "vitest"

import {
  buildProgressSummaryCards,
  canShowUpdateProgress,
  countActiveProjects,
  countProgressBuckets,
  countUpdatesToday,
  effectiveProgressPct,
  isStuckAt100NeedingReadyForReview,
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

  it("should set Ready for Review when For Revision resubmits at 100", () => {
    expect(projectProgressPatchFromUpdate(100, "For Revision")).toEqual({
      progress_pct: 100,
      status: "Ready for Review",
    })
  })
})

describe("canShowUpdateProgress (V4)", () => {
  it("should show Update Progress when editable status and below 100", () => {
    expect(
      canShowUpdateProgress({
        status: "Ongoing",
        effectivePct: 86,
        canCreateProgressUpdates: true,
      })
    ).toBe(true)
  })

  it("should hide Update Progress when effective ≥100 and not For Revision", () => {
    expect(
      canShowUpdateProgress({
        status: "Planning",
        effectivePct: 100,
        canCreateProgressUpdates: true,
      })
    ).toBe(false)
    expect(
      canShowUpdateProgress({
        status: "Ongoing",
        effectivePct: 100,
        canCreateProgressUpdates: true,
      })
    ).toBe(false)
  })

  it("should show Update Progress for For Revision even at 100", () => {
    expect(
      canShowUpdateProgress({
        status: "For Revision",
        effectivePct: 100,
        canCreateProgressUpdates: true,
      })
    ).toBe(true)
  })

  it("should hide Update Progress for Ready for Review, Completed, Rejected", () => {
    for (const status of [
      "Ready for Review",
      "Completed",
      "Rejected",
    ] as const) {
      expect(
        canShowUpdateProgress({
          status,
          effectivePct: 50,
          canCreateProgressUpdates: true,
        })
      ).toBe(false)
    }
  })

  it("should hide when actor cannot create progress updates", () => {
    expect(
      canShowUpdateProgress({
        status: "Ongoing",
        effectivePct: 10,
        canCreateProgressUpdates: false,
      })
    ).toBe(false)
  })
})

describe("isStuckAt100NeedingReadyForReview (V6/V7)", () => {
  it("should flag Planning|Procurement|Ongoing at ≥100", () => {
    expect(
      isStuckAt100NeedingReadyForReview({
        status: "Planning",
        effectivePct: 100,
      })
    ).toBe(true)
  })

  it("should not flag For Revision at 100", () => {
    expect(
      isStuckAt100NeedingReadyForReview({
        status: "For Revision",
        effectivePct: 100,
      })
    ).toBe(false)
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
