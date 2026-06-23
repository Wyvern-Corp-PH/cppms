import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const componentDir = dirname(fileURLToPath(import.meta.url))

function readComponent(name: string) {
  return readFileSync(resolve(componentDir, name), "utf8")
}

describe("Overlay stacking", () => {
  it("uses overlay z-index tokens for portal dropdown primitives", () => {
    for (const file of [
      "select.tsx",
      "popover.tsx",
      "dropdown-menu.tsx",
      "combobox.tsx",
    ]) {
      const source = readComponent(file)

      expect(source, file).toContain("z-(--z-overlay)")
      expect(source, file).not.toContain("z-50")
    }
  })
})
