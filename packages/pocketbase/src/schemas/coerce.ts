import { z } from "zod"

/** PocketBase returns `""` for unset optional select/relation fields. */
export function pbEmptyAsUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    schema
  )
}
