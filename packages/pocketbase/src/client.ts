import PocketBase, { ClientResponseError, type RecordService } from "pocketbase"

import type { CollectionName, CollectionRecords } from "./types"

export type TypedPocketBase = PocketBase & {
  collection<K extends CollectionName>(
    idOrName: K
  ): RecordService<CollectionRecords[K]>
}

export function isPocketBaseAutoCancelled(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 0
}

export function resolvePocketBaseUrl(
  override?: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  // Literal access required — Next.js only inlines NEXT_PUBLIC_* at compile time.
  const raw =
    override ??
    process.env.NEXT_PUBLIC_POCKETBASE_URL ??
    env.NEXT_PUBLIC_POCKETBASE_URL

  if (!raw) {
    throw new Error("NEXT_PUBLIC_POCKETBASE_URL is not set")
  }

  return raw.replace(/\/$/, "")
}

export function createPocketBaseClient(baseUrl?: string): TypedPocketBase {
  const pb = new PocketBase(resolvePocketBaseUrl(baseUrl)) as TypedPocketBase
  pb.autoCancellation(false)
  return pb
}
