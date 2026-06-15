import {
  createPocketBaseClient,
  type TypedPocketBase,
} from "@workspace/pocketbase/client"

let client: TypedPocketBase | undefined

export function getPocketBase(): TypedPocketBase {
  client ??= createPocketBaseClient()
  return client
}

export { createPocketBaseClient, type TypedPocketBase }
