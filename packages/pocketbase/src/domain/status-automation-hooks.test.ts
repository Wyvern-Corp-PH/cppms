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
  handleProgressUpdateAfterUpdate: (
    event: {
      app: unknown
      record: { get: (field: string) => unknown }
      requestInfo?: unknown
    },
    sync: (app: unknown, record: unknown) => void
  ) => void
}>("sync-project-progress.js")

const allocationHook = loadHook<{
  projectStatusAfterAllocation: (
    currentStatus: string,
    allocationCount: number
  ) => string
  syncProjectProcurementFromAllocation: (
    app: {
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

  function projectRecord() {
    return {
      get(field: string) {
        if (field === "municipality") return tuguegarao.municipality
        if (field === "barangay") return tuguegarao.barangay
        return ""
      },
    }
  }

  function progressRecord() {
    return {
      get(field: string) {
        if (field === "project") return "proj-1"
        return ""
      },
    }
  }

  function eventFor(auth: Record<string, unknown> | null, headers: Record<string, string>) {
    return {
      app: {
        findRecordById(collection: string, id: string) {
          if (collection === "projects" && id === "proj-1") return projectRecord()
          throw new Error("missing record")
        },
      },
      record: progressRecord(),
      requestInfo() {
        return { headers, auth }
      },
    }
  }

  it("does not call sync when Super Admin sends the skip header", () => {
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

  it("does not call sync when Municipality in scope sends the skip header", () => {
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

  it("does not call sync when Province sends the skip header", () => {
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

  it("does not call sync when Barangay in scope sends the skip header", () => {
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
  }) {
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
    const app = {
      findRecordById() {
        return project
      },
      findRecordsByFilter() {
        return Array.from({ length: options.allocationCount }, (_, index) => ({
          id: `alloc-${index}`,
        }))
      },
      save(record: { status: string }) {
        saved.push(record.status)
      },
    }
    const record = {
      get(field: string) {
        if (field === "project") return "proj1"
        return ""
      },
    }
    allocationHook.syncProjectProcurementFromAllocation(app, record)
    return { project, saved }
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
})
