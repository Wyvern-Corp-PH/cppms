/** Normalize PocketBase file field values to filename lists. */

export function normalizeFileNames(value: unknown): string[] {
  if (value == null || value === "") return []
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .filter(Boolean)
  }
  if (typeof value === "string") return [value]
  return []
}
