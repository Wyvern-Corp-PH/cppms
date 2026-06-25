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

describe("production deploy workflow", () => {
  it("deploys through GHCR and direct EC2 sync without GitHub artifacts", async () => {
    const workflowPath = path.resolve(
      import.meta.dirname,
      "../../../.github/workflows/deploy.yml"
    )
    const workflow = await readFile(workflowPath, "utf8")

    expect(workflow).not.toMatch(/\bactions\/(?:upload|download)-artifact\b/)
    expect(workflow).not.toMatch(/\bartifact(?:s)?\b/i)
    expect(workflow).toContain(
      'echo "GHCR_REGISTRY=ghcr.io/${GITHUB_REPOSITORY_OWNER,,}"'
    )
    expect(workflow).toContain("push: true")
    expect(workflow).toContain("rsync -az --delete")
    expect(workflow).toContain("scp -F")
  })
})
