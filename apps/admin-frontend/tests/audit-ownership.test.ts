import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const appRoot = resolve(__dirname, "..")

const clientFiles = [
  "components/budget-module.tsx",
  "components/approvals-module.tsx",
  "components/user-management-module.tsx",
  "lib/activity-log.ts",
]

describe("audit ownership (V130)", () => {
  it("does not write activity_logs from the admin client", () => {
    for (const file of clientFiles) {
      const path = resolve(appRoot, file)
      if (!existsSync(path)) continue

      const source = readFileSync(path, "utf8")

      expect(source, file).not.toContain("writeActivityLog")
      expect(source, file).not.toContain('collection("activity_logs").create')
      expect(source, file).not.toContain("collection('activity_logs').create")
    }
  })
})
