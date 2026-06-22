"use client"

import { useState } from "react"

import { recordFileUrl } from "@workspace/pocketbase/files"
import type { ProgressUpdateRecord } from "@workspace/pocketbase/types"
import { Button } from "@workspace/ui/components/button"

import { sitePhotoNames } from "@/components/site-photo"

type SitePhotoCarouselProps = {
  updates: Pick<ProgressUpdateRecord, "id" | "collectionId" | "site_photo">[]
  alt: string
}

export function SitePhotoCarousel({ updates, alt }: SitePhotoCarouselProps) {
  const photos = updates.flatMap((update) =>
    sitePhotoNames(update.site_photo).map((filename) => ({ update, filename }))
  )
  const [index, setIndex] = useState(0)

  if (photos.length === 0) {
    return null
  }

  const current = photos[index] ?? photos[0]!

  return (
    <div data-testid="site-photo-carousel">
      <img
        src={recordFileUrl(current.update, current.filename) ?? ""}
        alt={`${alt} ${index + 1}`}
        className="h-32 w-full rounded-md border border-border object-cover"
        loading="lazy"
      />
      {photos.length > 1 ? (
        <div className="mt-1 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setIndex((value) => (value - 1 + photos.length) % photos.length)
            }
          >
            Prev
          </Button>
          <span className="text-muted-foreground text-xs">
            {index + 1} / {photos.length}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIndex((value) => (value + 1) % photos.length)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}
