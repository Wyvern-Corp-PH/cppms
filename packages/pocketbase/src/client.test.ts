import { afterEach, describe, expect, it } from "vitest"
import PocketBase, { ClientResponseError } from "pocketbase"

import {
  createPocketBaseClient,
  isPocketBaseAutoCancelled,
  resolvePocketBaseUrl,
} from "./client"
import { COLLECTION_NAMES } from "../schema/manifest"

const ENV_KEY = "NEXT_PUBLIC_POCKETBASE_URL"

describe("resolvePocketBaseUrl", () => {
  const original = process.env[ENV_KEY]

  afterEach(() => {
    if (original === undefined) {
      delete process.env[ENV_KEY]
    } else {
      process.env[ENV_KEY] = original
    }
  })

  it("throws when NEXT_PUBLIC_POCKETBASE_URL is missing", () => {
    delete process.env[ENV_KEY]
    expect(() => resolvePocketBaseUrl()).toThrow(/NEXT_PUBLIC_POCKETBASE_URL/)
  })

  it("returns env value without trailing slash", () => {
    process.env[ENV_KEY] = "https://pocketbase.cppms.local/"
    expect(resolvePocketBaseUrl()).toBe("https://pocketbase.cppms.local")
  })

  it("accepts an explicit override", () => {
    delete process.env[ENV_KEY]
    expect(resolvePocketBaseUrl("http://localhost:8090/")).toBe(
      "http://localhost:8090"
    )
  })
})

describe("createPocketBaseClient", () => {
  it("creates a client bound to the given base URL", () => {
    const client = createPocketBaseClient("http://localhost:8090")
    expect(client.baseUrl).toBe("http://localhost:8090")
  })

  it("exposes typed collection accessors for every manifest collection", () => {
    const client = createPocketBaseClient("http://localhost:8090")

    for (const name of COLLECTION_NAMES) {
      expect(client.collection(name)).toBeDefined()
    }
  })

  it("disables auto cancellation for React client usage (V38)", () => {
    const client = createPocketBaseClient("http://localhost:8090")
    expect(
      (client as PocketBase & { enableAutoCancellation?: boolean }).enableAutoCancellation
    ).toBe(false)
  })
})

describe("isPocketBaseAutoCancelled", () => {
  it("returns true for PocketBase abort status 0 (V38)", () => {
    const error = new ClientResponseError({
      url: "http://localhost:8090/api/collections/projects/records",
      status: 0,
      data: {},
    })

    expect(isPocketBaseAutoCancelled(error)).toBe(true)
  })

  it("returns false for other errors", () => {
    const error = new ClientResponseError({
      url: "http://localhost:8090/api/collections/projects/records",
      status: 400,
      data: {},
    })

    expect(isPocketBaseAutoCancelled(error)).toBe(false)
  })
})
