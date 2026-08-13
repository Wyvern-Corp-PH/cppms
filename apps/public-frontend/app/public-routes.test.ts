import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const appDir = path.dirname(fileURLToPath(import.meta.url))

describe("public routes", () => {
  it("exposes only landing, projects list, and project detail", () => {
    expect(existsSync(path.join(appDir, "page.tsx"))).toBe(true)
    expect(existsSync(path.join(appDir, "projects/page.tsx"))).toBe(true)
    expect(existsSync(path.join(appDir, "projects/[id]/page.tsx"))).toBe(true)
    expect(existsSync(path.join(appDir, "budget"))).toBe(false)
    expect(existsSync(path.join(appDir, "progress"))).toBe(false)
    expect(existsSync(path.join(appDir, "reports"))).toBe(false)
  })
})
