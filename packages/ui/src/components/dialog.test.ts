import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const componentPath = resolve(dirname(fileURLToPath(import.meta.url)), "dialog.tsx")
const source = readFileSync(componentPath, "utf8")

describe("Dialog stacking", () => {
  it("renders above sticky admin chrome", () => {
    expect(source).toContain("z-(--z-modal-backdrop)")
    expect(source).toContain("z-(--z-modal)")
    expect(source).not.toContain(" z-50 ")
  })
})
