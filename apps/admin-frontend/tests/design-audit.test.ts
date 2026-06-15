import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const bannedPatterns = [
  /gradient-text/i,
  /backdrop-blur-\[/,
  /hero-metric/i,
  /border-l-4 border-primary/,
]

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") {
        continue
      }
      files.push(...collectSourceFiles(fullPath))
      continue
    }

    if (/\.(tsx|css)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

describe("impeccable audit (V22–V31, T20)", () => {
  const adminFiles = collectSourceFiles(join(process.cwd(), "components"))
  const publicRoot = join(process.cwd(), "..", "public-frontend", "components")
  const publicFiles = collectSourceFiles(publicRoot)

  it("avoids banned UI anti-patterns in shipped surfaces", () => {
    for (const file of [...adminFiles, ...publicFiles]) {
      const source = readFileSync(file, "utf8")

      for (const pattern of bannedPatterns) {
        expect(source, `${file} matches ${pattern}`).not.toMatch(pattern)
      }
    }
  })

  it("uses semantic radius tokens instead of oversized card rounding", () => {
    for (const file of [...adminFiles, ...publicFiles]) {
      const source = readFileSync(file, "utf8")
      expect(source).not.toMatch(/rounded-\[2[4-9]px\]/)
    }
  })
})
