import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

async function tsSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(dir, entry.name)
      if (entry.isDirectory()) return tsSourceFiles(entryPath)
      if (entry.isFile() && entry.name.endsWith(".ts")) return [entryPath]
      return []
    })
  )

  return files.flat()
}

describe("workspace package source imports", () => {
  it("keeps relative TypeScript source imports extensionless for Next transpilePackages", async () => {
    const srcDir = path.resolve(import.meta.dirname, ".")
    const files = await tsSourceFiles(srcDir)
    const offenders: string[] = []

    for (const file of files) {
      const source = await readFile(file, "utf8")
      const matches = source.matchAll(
        /\b(?:import|export)\b[^"']*from\s+["']\.[^"']+\.js["']/g
      )
      for (const match of matches) {
        offenders.push(`${path.relative(srcDir, file)}: ${match[0]}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
