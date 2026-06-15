import { describe, expect, it } from "vitest"

import { formatDisplayDate, formatDisplayDateTime } from "./format-display-date"

describe("formatDisplayDate", () => {
  it("formats YYYY-MM-DD as MMM D, YYYY", () => {
    expect(formatDisplayDate("2026-04-10")).toBe("Apr 10, 2026")
  })

  it("formats ISO datetime using date portion", () => {
    expect(formatDisplayDate("2025-05-01 00:00:00.000Z")).toBe("May 1, 2025")
  })

  it("returns em dash when empty", () => {
    expect(formatDisplayDate(undefined)).toBe("—")
  })
})

describe("formatDisplayDateTime", () => {
  it("formats timestamps with time", () => {
    const formatted = formatDisplayDateTime("2026-04-10T14:30:00.000Z")
    expect(formatted).toMatch(/Apr 10, 2026/)
    expect(formatted).toMatch(/\d{1,2}:\d{2}/)
  })

  it("falls back to date-only format without time component", () => {
    expect(formatDisplayDateTime("2026-04-10")).toBe("Apr 10, 2026")
  })
})
