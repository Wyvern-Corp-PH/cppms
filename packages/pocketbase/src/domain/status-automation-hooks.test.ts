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
