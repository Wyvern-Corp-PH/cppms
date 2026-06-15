import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("public read-only guard (V2, V3)", () => {
  const source = readFileSync(
    join(process.cwd(), "..", "public-frontend", "components", "public-shell.tsx"),
    "utf8"
  )

  it("does not expose approvals navigation on the public frontend", () => {
    expect(source.toLowerCase()).not.toContain("approvals")
  })
})
