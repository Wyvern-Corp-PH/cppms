export type UserDisplayRecord = {
  id?: string
  email?: string
  name?: string
}

export function buildUserDisplayMap(
  users: readonly UserDisplayRecord[],
  fallbackUsers: readonly UserDisplayRecord[] = []
): Map<string, string> {
  return new Map(
    [...users, ...fallbackUsers]
      .filter((user): user is UserDisplayRecord & { id: string } =>
        Boolean(user.id?.trim())
      )
      .map((user) => [
        user.id,
        user.name?.trim() || user.email || user.id,
      ])
  )
}

export function displayUserRef(
  userId: string | undefined,
  users: ReadonlyMap<string, string>,
  fallback = "—"
): string {
  if (!userId?.trim()) {
    return fallback
  }
  return users.get(userId) ?? userId
}

export function usersFromExpandedRows(
  rows: readonly unknown[]
): UserDisplayRecord[] {
  const users: UserDisplayRecord[] = []
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const expand = (row as { expand?: unknown }).expand
    if (!expand || typeof expand !== "object") continue
    for (const value of Object.values(expand as Record<string, unknown>)) {
      const records = Array.isArray(value) ? value : [value]
      for (const record of records) {
        if (!record || typeof record !== "object") continue
        const id = (record as { id?: unknown }).id
        if (typeof id === "string" && id.trim()) {
          users.push(record as UserDisplayRecord)
        }
      }
    }
  }
  return users
}
