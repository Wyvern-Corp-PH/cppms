import { recordFileUrl } from "@workspace/pocketbase/files"
import type { ProgressUpdateRecord } from "@workspace/pocketbase/types"
import { cn } from "@workspace/ui/lib/utils"

type SitePhotoProps = {
  update: Pick<ProgressUpdateRecord, "id" | "collectionId" | "site_photo">
  alt: string
  className?: string
}

export function SitePhoto({ update, alt, className }: SitePhotoProps) {
  const photos = sitePhotoNames(update.site_photo)
  if (photos.length === 0) {
    return null
  }

  return (
    <div className={cn("grid gap-2", photos.length > 1 && "sm:grid-cols-2")}>
      {photos.map((filename, index) => {
        const src = recordFileUrl(update, filename)
        if (!src) return null

        return (
          <img
            key={filename}
            src={src}
            alt={photos.length > 1 ? `${alt} ${index + 1}` : alt}
            className={cn(
              "rounded-md border border-border object-cover",
              className
            )}
            loading="lazy"
          />
        )
      })}
    </div>
  )
}

export function sitePhotoNames(
  value: ProgressUpdateRecord["site_photo"] | string | undefined
): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }
  return value ? [value] : []
}
