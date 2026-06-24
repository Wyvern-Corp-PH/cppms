import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "calendar.tsx"),
  "utf8"
)

describe("Calendar", () => {
  it("uses react-day-picker v10 classNames slots", () => {
    expect(source).not.toContain("table:")
    expect(source).toContain("weekdays:")
    expect(source).toContain("week:")
  })
})
