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
