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
  projectStatusAfterAllocation: (currentStatus: string) => string
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

  it("still syncs when Province sends the skip header", () => {
    const calls: unknown[] = []
    progressHook.handleProgressUpdateAfterUpdate(
      eventFor({ role: "Province" }, { "X-Skip-Progress-Sync": "1" }),
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
  it("sets Procurement only from Planning", () => {
    expect(allocationHook.projectStatusAfterAllocation("Planning")).toBe(
      "Procurement"
    )
    expect(allocationHook.projectStatusAfterAllocation("Ongoing")).toBe(
      "Ongoing"
    )
    expect(allocationHook.projectStatusAfterAllocation("Cancelled")).toBe(
      "Cancelled"
    )
  })
})
