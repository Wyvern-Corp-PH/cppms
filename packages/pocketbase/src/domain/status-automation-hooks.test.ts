import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runInNewContext } from "node:vm"
import { describe, expect, it } from "vitest"

const hooksDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../pb_hooks"
)

function loadHook<T extends Record<string, unknown>>(fileName: string): T {
  const sandbox = {
    module: { exports: {} as T },
    exports: {} as T,
    console,
  }
  runInNewContext(readFileSync(resolve(hooksDir, fileName), "utf8"), sandbox)
  return sandbox.module.exports
}

const progressHook = loadHook<{
  projectProgressPatch: (
    toPct: unknown,
    currentStatus: string
  ) => { progress_pct: number; status: string }
  projectProgressPatchFromHistoryHighWater: (
    highWaterPct: unknown,
    currentStatus: string
  ) => { progress_pct: number; status: string } | null
  handleProgressUpdateAfterUpdate: (
    event: {
      app: unknown
      record: { get: (field: string) => unknown }
      requestInfo?: unknown
    },
    sync: (app: unknown, record: unknown) => void
  ) => void
  syncProjectFromProgressUpdate: (
    app: unknown,
    progressRecord: { get: (field: string) => unknown }
  ) => void
  syncProjectFromProgressHistoryEdit: (
    app: unknown,
    progressRecord: { get: (field: string) => unknown }
  ) => void
}>("sync-project-progress.js")

const allocationHook = loadHook<{
  projectStatusAfterAllocation: (
    currentStatus: string,
    allocationCount: number
  ) => string
  PROJECT_ROW_LOCK_SQL: string
  syncProjectProcurementFromAllocation: (
    app: {
      db?: () => {
        newQuery: (sql: string) => {
          bind: (params: { id: string }) => { execute: () => void }
        }
      }
      findRecordById: (collection: string, id: string) => unknown
      findRecordsByFilter: (
        collection: string,
        filter: string,
        sort: string,
        limit: number,
        offset: number
      ) => unknown[]
      save: (record: unknown) => void
    },
    allocationRecord: { get: (field: string) => unknown }
  ) => void
}>("sync-project-procurement.js")

describe("sync-project-progress hook patch", () => {
  it("sets For Completion from leftover Ready for Review at 100", () => {
    expect(progressHook.projectProgressPatch(100, "Ready for Review")).toEqual({
      progress_pct: 100,
      status: "For Completion",
    })
  })

  it("skips Ongoing when first update is already 100", () => {
    expect(progressHook.projectProgressPatch(100, "Planning")).toEqual({
      progress_pct: 100,
      status: "For Completion",
    })
  })

  it("sets Ongoing from Planning below 100", () => {
    expect(progressHook.projectProgressPatch(40, "Planning")).toEqual({
      progress_pct: 40,
      status: "Ongoing",
    })
  })

  it("does not overwrite For Approval at 100", () => {
    expect(progressHook.projectProgressPatch(100, "For Approval")).toEqual({
      progress_pct: 100,
      status: "For Approval",
    })
  })

  it("should set For Completion from progress percent, not remaining or released funds", () => {
    const source = readFileSync(
      resolve(hooksDir, "sync-project-progress.js"),
      "utf8"
    )

    expect(source).not.toMatch(/\bremaining\b/)
    expect(source).not.toMatch(/\breleased\b/)
    expect(source).toContain('source.get("to_pct")')
    expect(progressHook.projectProgressPatch(100, "Ongoing")).toEqual({
      progress_pct: 100,
      status: "For Completion",
    })
  })
})

describe("sync-project-progress skip header", () => {
  const tuguegarao = {
    municipality: "Tuguegarao City",
    barangay: "Centro 01 (Bagumbayan)",
  }

  function projectRecord(status = "Ongoing") {
    return {
      get(field: string) {
        if (field === "municipality") return tuguegarao.municipality
        if (field === "barangay") return tuguegarao.barangay
        if (field === "status") return status
        return ""
      },
    }
  }

  function progressRecord() {
    return {
      get(field: string) {
        if (field === "project") return "proj-1"
        if (field === "to_pct") return 70
        return ""
      },
    }
  }

  function eventFor(
    auth: Record<string, unknown> | null,
    headers: Record<string, string>,
    options?: { status?: string; progressToPcts?: number[] }
  ) {
    const status = options?.status ?? "Ongoing"
    const progressToPcts = options?.progressToPcts ?? [70]
    return {
      app: {
        findRecordById(collection: string, id: string) {
          if (collection === "projects" && id === "proj-1") {
            return projectRecord(status)
          }
          throw new Error("missing record")
        },
        findRecordsByFilter() {
          return progressToPcts.map((toPct, index) => ({
            id: `row-${index}`,
            get(field: string) {
              if (field === "to_pct") return toPct
              if (field === "project") return "proj-1"
              if (field === "created") return `2026-06-0${index + 1} 00:00:00.000Z`
              return ""
            },
          }))
        },
      },
      record: progressRecord(),
      requestInfo() {
        return { headers, auth }
      },
    }
  }

  it("does not call sync when Super Admin sends the skip header on Ongoing", () => {
    const sync = (app: unknown, record: unknown) => {
      void app
      void record
      throw new Error("sync should not run")
    }
    expect(() =>
      progressHook.handleProgressUpdateAfterUpdate(
        eventFor({ role: "Super Admin" }, { "X-Skip-Progress-Sync": "1" }),
        sync
      )
    ).not.toThrow()
  })

  it("does not call sync when Municipality in scope sends the skip header on Ongoing", () => {
    const calls: unknown[] = []
    progressHook.handleProgressUpdateAfterUpdate(
      eventFor(
        { role: "Municipality", municipality: "Tuguegarao City" },
        { "x-skip-progress-sync": "1" }
      ),
      (app, record) => {
        calls.push([app, record])
      }
    )
    expect(calls).toHaveLength(0)
  })

  it("does not call sync when Province sends the skip header on Ongoing", () => {
    const calls: unknown[] = []
    progressHook.handleProgressUpdateAfterUpdate(
      eventFor({ role: "Province" }, { "X-Skip-Progress-Sync": "1" }),
      (app, record) => {
        calls.push([app, record])
      }
    )
    expect(calls).toHaveLength(0)
  })

  it("still syncs when Province omits the skip header", () => {
    const calls: unknown[] = []
    progressHook.handleProgressUpdateAfterUpdate(
      eventFor({ role: "Province" }, {}),
      (app, record) => {
        calls.push([app, record])
      }
    )
    expect(calls).toHaveLength(1)
  })

  it("still syncs when Municipality is out of project scope", () => {
    const calls: unknown[] = []
    progressHook.handleProgressUpdateAfterUpdate(
      eventFor(
        { role: "Municipality", municipality: "Lasam" },
        { "X-Skip-Progress-Sync": "1" }
      ),
      (app, record) => {
        calls.push([app, record])
      }
    )
    expect(calls).toHaveLength(1)
  })

  it("still syncs when Barangay is out of project scope", () => {
    const calls: unknown[] = []
    progressHook.handleProgressUpdateAfterUpdate(
      eventFor(
        {
          role: "Barangay",
          municipality: "Tuguegarao City",
          barangay: "Centro",
        },
        { "X-Skip-Progress-Sync": "true" }
      ),
      (app, record) => {
        calls.push([app, record])
      }
    )
    expect(calls).toHaveLength(1)
  })

  it("does not call sync when Barangay in scope sends the skip header on Ongoing", () => {
    const calls: unknown[] = []
    progressHook.handleProgressUpdateAfterUpdate(
      eventFor(
        {
          role: "Barangay",
          municipality: "Tuguegarao City",
          barangay: "Centro 01 (Bagumbayan)",
        },
        { "X-Skip-Progress-Sync": "1" }
      ),
      (app, record) => {
        calls.push([app, record])
      }
    )
    expect(calls).toHaveLength(0)
  })

  it("still syncs when Super Admin skip header is sent on For Completion below 100", () => {
    const calls: unknown[] = []
    progressHook.handleProgressUpdateAfterUpdate(
      eventFor(
        { role: "Super Admin" },
        { "X-Skip-Progress-Sync": "1" },
        { status: "For Completion", progressToPcts: [70, 40] }
      ),
      (app, record) => {
        calls.push([app, record])
      }
    )
    expect(calls).toHaveLength(1)
  })

  it("does not call sync when Super Admin skip header is sent on For Completion still at 100", () => {
    const calls: unknown[] = []
    progressHook.handleProgressUpdateAfterUpdate(
      eventFor(
        { role: "Super Admin" },
        { "X-Skip-Progress-Sync": "1" },
        { status: "For Completion", progressToPcts: [70, 100] }
      ),
      (app, record) => {
        calls.push([app, record])
      }
    )
    expect(calls).toHaveLength(0)
  })
})

describe("sync-project-progress history-edit revert", () => {
  function row(id: string, toPct: number, created = "2026-06-01 00:00:00.000Z") {
    return {
      id,
      get(field: string) {
        if (field === "to_pct") return toPct
        if (field === "created") return created
        if (field === "project") return "proj-1"
        return ""
      },
    }
  }

  function projectState(status: string, progressPct: number) {
    const state = { status, progress_pct: progressPct }
    return {
      state,
      record: {
        get(field: string) {
          if (field === "status") return state.status
          if (field === "progress_pct") return state.progress_pct
          return ""
        },
        set(field: string, value: string | number) {
          if (field === "status") state.status = String(value)
          if (field === "progress_pct") state.progress_pct = Number(value)
        },
      },
    }
  }

  function appFor(
    project: ReturnType<typeof projectState>,
    rows: ReturnType<typeof row>[]
  ) {
    const saved: { status: string; progress_pct: number }[] = []
    return {
      saved,
      app: {
        findRecordById(collection: string, id: string) {
          if (collection === "projects" && id === "proj-1") return project.record
          throw new Error("missing record")
        },
        findRecordsByFilter() {
          return rows
        },
        save() {
          saved.push({
            status: project.state.status,
            progress_pct: project.state.progress_pct,
          })
        },
      },
    }
  }

  it("should revert For Completion to Ongoing on afterUpdate when max to_pct drops below 100", () => {
    const project = projectState("For Completion", 100)
    const { app, saved } = appFor(project, [
      row("newest", 70, "2026-08-01 00:00:00.000Z"),
      row("older", 40, "2026-05-01 00:00:00.000Z"),
    ])
    progressHook.syncProjectFromProgressHistoryEdit(app, row("newest", 70))
    expect(saved).toEqual([{ status: "Ongoing", progress_pct: 70 }])
  })

  it("should use max to_pct across rows, not newest-by-created, for the revert write", () => {
    const project = projectState("For Completion", 100)
    const { app, saved } = appFor(project, [
      row("newest", 60, "2026-08-01 00:00:00.000Z"),
      row("older-high", 85, "2026-05-01 00:00:00.000Z"),
    ])
    progressHook.syncProjectFromProgressHistoryEdit(app, row("newest", 60))
    expect(saved).toEqual([{ status: "Ongoing", progress_pct: 85 }])
  })

  it("should leave For Completion and stored percent when high-water is still at least 100", () => {
    const project = projectState("For Completion", 100)
    const { app, saved } = appFor(project, [
      row("newest", 70, "2026-08-01 00:00:00.000Z"),
      row("still-complete", 100, "2026-05-01 00:00:00.000Z"),
    ])
    progressHook.syncProjectFromProgressHistoryEdit(app, row("newest", 70))
    expect(saved).toEqual([])
    expect(project.state).toEqual({ status: "For Completion", progress_pct: 100 })
  })

  it("should not revert For Completion on afterCreate when a new row is below 100", () => {
    const project = projectState("For Completion", 100)
    const { app, saved } = appFor(project, [
      row("newest", 70, "2026-08-01 00:00:00.000Z"),
      row("complete", 100, "2026-05-01 00:00:00.000Z"),
    ])
    progressHook.syncProjectFromProgressUpdate(app, row("newest", 70))
    expect(project.state.status).toBe("For Completion")
    expect(saved.every((write) => write.status !== "Ongoing")).toBe(true)
  })

  it("should not revert For Completion on afterCreate when the new row is the only below-100 row", () => {
    const project = projectState("For Completion", 100)
    const { app, saved } = appFor(project, [
      row("newest", 70, "2026-08-01 00:00:00.000Z"),
    ])
    progressHook.syncProjectFromProgressUpdate(app, row("newest", 70))
    expect(project.state.status).toBe("For Completion")
    expect(saved.every((write) => write.status !== "Ongoing")).toBe(true)
  })

  it("should not revert For Completion when the progress list is truncated at 500", () => {
    const project = projectState("For Completion", 100)
    const rows = Array.from({ length: 500 }, (_, index) =>
      row(`row-${index}`, 50)
    )
    const { app, saved } = appFor(project, rows)
    progressHook.syncProjectFromProgressHistoryEdit(app, row("newest", 50))
    expect(saved).toEqual([])
    expect(project.state).toEqual({
      status: "For Completion",
      progress_pct: 100,
    })
  })

  it("should revert For Completion on afterUpdate even when the skip header is sent", () => {
    const project = projectState("For Completion", 100)
    const rows = [
      row("newest", 70, "2026-08-01 00:00:00.000Z"),
      row("older", 40, "2026-05-01 00:00:00.000Z"),
    ]
    const { app, saved } = appFor(project, rows)
    progressHook.handleProgressUpdateAfterUpdate(
      {
        app,
        record: row("newest", 70),
        requestInfo() {
          return {
            headers: { "X-Skip-Progress-Sync": "1" },
            auth: { role: "Super Admin" },
          }
        },
      },
      progressHook.syncProjectFromProgressHistoryEdit
    )
    expect(saved).toEqual([{ status: "Ongoing", progress_pct: 70 }])
  })

  it("should set For Completion on afterCreate from Ongoing at 100", () => {
    const project = projectState("Ongoing", 70)
    const { app, saved } = appFor(project, [
      row("newest", 100, "2026-08-01 00:00:00.000Z"),
    ])
    progressHook.syncProjectFromProgressUpdate(app, row("newest", 100))
    expect(saved).toEqual([{ status: "For Completion", progress_pct: 100 }])
  })

  it("should set For Completion on afterUpdate from Ongoing at 100", () => {
    const project = projectState("Ongoing", 70)
    const { app, saved } = appFor(project, [
      row("newest", 100, "2026-08-01 00:00:00.000Z"),
      row("older", 70, "2026-05-01 00:00:00.000Z"),
    ])
    progressHook.syncProjectFromProgressHistoryEdit(app, row("newest", 100))
    expect(saved).toEqual([{ status: "For Completion", progress_pct: 100 }])
  })

  it("should not add For Completion to the create-path Ongoing from-set", () => {
    expect(
      progressHook.projectProgressPatch(70, "For Completion")
    ).toEqual({ progress_pct: 70, status: "For Completion" })
    expect(
      progressHook.projectProgressPatchFromHistoryHighWater(70, "For Completion")
    ).toEqual({ progress_pct: 70, status: "Ongoing" })
    expect(
      progressHook.projectProgressPatchFromHistoryHighWater(100, "For Completion")
    ).toBeNull()
  })
})

describe("sync-project-procurement hook", () => {
  it("should set Ongoing from Planning or Procurement when count is 1", () => {
    expect(allocationHook.projectStatusAfterAllocation("Planning", 1)).toBe(
      "Ongoing"
    )
    expect(allocationHook.projectStatusAfterAllocation("Procurement", 1)).toBe(
      "Ongoing"
    )
    expect(allocationHook.projectStatusAfterAllocation("Cancelled", 1)).toBe(
      "Cancelled"
    )
  })

  it("should not rewrite status when count is not 1", () => {
    expect(allocationHook.projectStatusAfterAllocation("Planning", 2)).toBe(
      "Planning"
    )
    expect(allocationHook.projectStatusAfterAllocation("Procurement", 2)).toBe(
      "Procurement"
    )
  })
})

describe("sync-project-procurement after-create count", () => {
  function allocationSync(options: {
    status: string
    allocationCount: number
    omitDb?: boolean
    recordId?: string
  }) {
    const recordId = options.recordId ?? "alloc-0"
    const project = {
      status: options.status,
      get(field: string) {
        if (field === "status") return this.status
        return ""
      },
      set(field: string, value: string) {
        if (field === "status") this.status = value
      },
    }
    const saved: string[] = []
    const lockQueries: Array<{ sql: string; params: { id: string } }> = []
    const callOrder: string[] = []
    const app = {
      ...(options.omitDb
        ? {}
        : {
            db() {
              return {
                newQuery(sql: string) {
                  return {
                    bind(params: { id: string }) {
                      return {
                        execute() {
                          callOrder.push("lock")
                          lockQueries.push({ sql, params })
                        },
                      }
                    },
                  }
                },
              }
            },
          }),
      findRecordById() {
        return project
      },
      findRecordsByFilter() {
        callOrder.push("read")
        return Array.from({ length: options.allocationCount }, (_, index) => ({
          id: index === 0 ? recordId : `alloc-${index}`,
        }))
      },
      save(record: { status: string }) {
        saved.push(record.status)
      },
    }
    const record = {
      id: recordId,
      get(field: string) {
        if (field === "project") return "proj1"
        if (field === "id") return recordId
        return ""
      },
    }
    allocationHook.syncProjectProcurementFromAllocation(app, record)
    return { project, saved, lockQueries, callOrder }
  }

  it("should write Ongoing on first persist from Planning or Procurement", () => {
    expect(allocationSync({ status: "Planning", allocationCount: 1 }).saved).toEqual(
      ["Ongoing"]
    )
    expect(
      allocationSync({ status: "Procurement", allocationCount: 1 }).saved
    ).toEqual(["Ongoing"])
  })

  it("should not write status on a later allocation", () => {
    expect(
      allocationSync({ status: "Planning", allocationCount: 2 }).saved
    ).toEqual([])
    expect(
      allocationSync({ status: "Procurement", allocationCount: 2 }).saved
    ).toEqual([])
  })

  it("should not rewrite terminal or later statuses on first persist", () => {
    for (const status of [
      "Cancelled",
      "Completed",
      "For Completion",
      "For Approval",
      "For Revision",
      "Rejected",
    ]) {
      expect(allocationSync({ status, allocationCount: 1 }).saved).toEqual([])
    }
  })

  it("should write Ongoing again when count returns to 1 after delete", () => {
    expect(
      allocationSync({ status: "Planning", allocationCount: 1 }).saved
    ).toEqual(["Ongoing"])
    expect(
      allocationSync({ status: "Procurement", allocationCount: 1 }).saved
    ).toEqual(["Ongoing"])
  })

  it("should write Ongoing when this persist is the first live row before insert", () => {
    expect(
      allocationSync({ status: "Planning", allocationCount: 0 }).saved
    ).toEqual(["Ongoing"])
    expect(
      allocationSync({ status: "Procurement", allocationCount: 0 }).saved
    ).toEqual(["Ongoing"])
  })

  it("should lock the project row before counting live allocations", () => {
    const { lockQueries, callOrder, saved } = allocationSync({
      status: "Planning",
      allocationCount: 0,
    })
    expect(lockQueries).toEqual([
      { sql: allocationHook.PROJECT_ROW_LOCK_SQL, params: { id: "proj1" } },
    ])
    expect(callOrder[0]).toBe("lock")
    expect(callOrder).toContain("read")
    expect(saved).toEqual(["Ongoing"])
  })

  it("should not rewrite terminal statuses when this persist is the first live row", () => {
    for (const status of [
      "Cancelled",
      "Completed",
      "For Completion",
      "For Approval",
      "For Revision",
      "Rejected",
    ]) {
      expect(
        allocationSync({ status, allocationCount: 0 }).saved
      ).toEqual([])
    }
  })
})

describe("sync-project-procurement hook entrypoint", () => {
  it("should sync first allocation on create inside the persist transaction", () => {
    const entry = readFileSync(
      resolve(hooksDir, "sync-project-procurement.pb.js"),
      "utf8"
    )
    expect(entry).toContain("sync-project-procurement.js")
    expect(entry).toContain("onRecordCreate(")
    expect(entry).toContain("onRecordAfterCreateSuccess")
    expect(entry).toContain("budget_allocations")
  })
})
