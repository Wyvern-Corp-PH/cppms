import { recordFileUrl } from "@workspace/pocketbase/files"
import type { ProgressUpdateRecord } from "@workspace/pocketbase/types"
import { cn } from "@workspace/ui/lib/utils"

type SitePhotoProps = {
  update: Pick<ProgressUpdateRecord, "id" | "collectionId" | "site_photo">
  alt: string
  className?: string
}

export function SitePhoto({ update, alt, className }: SitePhotoProps) {
  const src = recordFileUrl(update, update.site_photo)
  if (!src) {
    return null
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("rounded-md border border-border object-cover", className)}
      loading="lazy"
    />
  )
}
