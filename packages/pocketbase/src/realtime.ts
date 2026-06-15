import type { TypedPocketBase } from "./client"
import type { CollectionName } from "./types"

export type CollectionRealtimeEvent = {
  collection: CollectionName
  action: string
  record: unknown
}

export async function subscribeCollection(
  pb: TypedPocketBase,
  collection: CollectionName,
  onEvent: (event: CollectionRealtimeEvent) => void
): Promise<() => void> {
  await pb.collection(collection).subscribe("*", (payload) => {
    onEvent({
      collection,
      action: payload.action,
      record: payload.record,
    })
  })

  return () => {
    void pb.collection(collection).unsubscribe("*")
  }
}

export async function subscribeCollections(
  pb: TypedPocketBase,
  collections: CollectionName[],
  onEvent: (event: CollectionRealtimeEvent) => void
): Promise<() => void> {
  const unsubscribers = await Promise.all(
    collections.map((collection) => subscribeCollection(pb, collection, onEvent))
  )

  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
  }
}
