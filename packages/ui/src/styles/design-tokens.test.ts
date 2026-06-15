import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "globals.css")
const css = readFileSync(cssPath, "utf8")

/** Canonical :root tokens from DESIGN.md (Linear dark canvas) */
const ROOT_TOKENS: Record<string, string> = {
  "--background": "oklch(0.07 0.004 264)",
  "--foreground": "oklch(0.98 0.002 264)",
  "--primary": "oklch(0.58 0.145 276)",
  "--primary-foreground": "oklch(1 0 0)",
  "--accent": "oklch(0.68 0.18 276)",
  "--accent-foreground": "oklch(1 0 0)",
  "--muted-foreground": "oklch(0.62 0.015 264)",
  "--success": "oklch(0.55 0.17 145)",
  "--warning": "oklch(0.65 0.18 55)",
  "--info": "oklch(0.55 0.14 250)",
}

function tokenLine(name: string, value: string) {
  return `${name}: ${value};`
}

describe("design tokens (DESIGN.md / V32)", () => {
  for (const [token, value] of Object.entries(ROOT_TOKENS)) {
    it(`${token} matches Linear OKLCH palette`, () => {
      expect(css).toContain(tokenLine(token, value))
    })
  }

  it("card radius stays within 16px cap", () => {
    expect(css).toContain("--radius: 0.75rem")
  })
})
