import { describe, expect, it, vi } from "vitest"

import type { TypedPocketBase } from "./client"
import { subscribeCollections } from "./realtime"

function mockPb() {
  const handlers: Array<(data: { action: string; record: unknown }) => void> = []
  const collection = {
    subscribe: vi.fn(async (_topic: string, handler: typeof handlers[number]) => {
      handlers.push(handler)
    }),
    unsubscribe: vi.fn(async () => undefined),
  }
  const pb = {
    collection: vi.fn(() => collection),
  } as unknown as TypedPocketBase
  return { pb, collection, handlers }
}

describe("subscribeCollections", () => {
  it("subscribes to each collection and returns unsubscribe all", async () => {
    const { pb, collection } = mockPb()
    const onEvent = vi.fn()

    const unsubscribe = await subscribeCollections(pb, ["projects", "budget_expenses"], onEvent)

    expect(pb.collection).toHaveBeenCalledWith("projects")
    expect(pb.collection).toHaveBeenCalledWith("budget_expenses")
    expect(collection.subscribe).toHaveBeenCalledTimes(2)

    unsubscribe()
    expect(collection.unsubscribe).toHaveBeenCalledTimes(2)
  })

  it("forwards subscription events to onEvent", async () => {
    const { pb, handlers } = mockPb()
    const onEvent = vi.fn()

    await subscribeCollections(pb, ["projects"], onEvent)
    handlers[0]?.({ action: "update", record: { id: "1" } })

    expect(onEvent).toHaveBeenCalledWith({
      collection: "projects",
      action: "update",
      record: { id: "1" },
    })
  })
})
