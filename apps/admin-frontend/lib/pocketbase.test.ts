import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@workspace/pocketbase/client", () => ({
  createPocketBaseClient: vi.fn(() => ({ baseUrl: "http://localhost:8090" })),
}))

import { createPocketBaseClient } from "@workspace/pocketbase/client"

import { getPocketBase } from "./pocketbase"

describe("getPocketBase", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns a singleton PocketBase client", () => {
    const first = getPocketBase()
    const second = getPocketBase()

    expect(first).toBe(second)
    expect(createPocketBaseClient).toHaveBeenCalledTimes(1)
  })
})
