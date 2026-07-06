// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { copyTextToClipboard } from "./copy-to-clipboard"

describe("copyTextToClipboard (V214)", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    await expect(copyTextToClipboard("TempPass1234")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("TempPass1234")
  })

  it("falls back to execCommand when clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    })
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    })

    await expect(copyTextToClipboard("TempPass1234")).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith("copy")
  })
})
