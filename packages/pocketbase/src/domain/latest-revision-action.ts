type RevisionActionRow = {
  id: string
  project: string
  action: string
  reason?: string | null
  created?: string
  created_at?: string
}

/** Newest request_revision with a reason. Sort key is created_at, else created, else id. */
export function latestRevisionAction<T extends RevisionActionRow>(
  actions: readonly T[],
  projectId: string
): T | null {
  return (
    actions
      .filter(
        (action) =>
          action.project === projectId &&
          action.action === "request_revision" &&
          action.reason
      )
      .sort((a, b) => {
        const aKey = a.created_at ?? a.created ?? a.id
        const bKey = b.created_at ?? b.created ?? b.id
        return bKey.localeCompare(aKey)
      })[0] ?? null
  )
}
