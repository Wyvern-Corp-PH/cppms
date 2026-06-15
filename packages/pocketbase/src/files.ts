import { resolvePocketBaseUrl } from "./client"

type FileRecord = {
  id: string
  collectionId: string
}

export function recordFileUrl(
  record: FileRecord,
  filename: string | undefined,
  baseUrl?: string
): string | null {
  if (!filename?.trim()) {
    return null
  }

  const root = resolvePocketBaseUrl(baseUrl)
  return `${root}/api/files/${record.collectionId}/${record.id}/${filename}`
}
