import { z } from "zod"

/** PocketBase returns `""` for unset optional select/relation fields. */
export function pbEmptyAsUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    schema
  )
}

/** PocketBase returns `0` for unset optional number fields. */
export function pbZeroAsUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === null || value === 0 ? undefined : value),
    schema
  )
}
