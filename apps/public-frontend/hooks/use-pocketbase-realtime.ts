"use client"

import { useEffect, useRef, useState } from "react"

import type { CollectionName } from "@workspace/pocketbase/types"
import { subscribeCollections } from "@workspace/pocketbase/realtime"

import { getPocketBase } from "@/lib/pocketbase"

export function usePocketBaseRealtime(
  collections: CollectionName[],
  onEvent: () => void,
  enabled = true
) {
  const [live, setLive] = useState(false)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const collectionsKey = collections.join(",")

  useEffect(() => {
    if (!enabled) {
      setLive(false)
      return
    }

    let unsubscribe: (() => void) | undefined
    let cancelled = false

    const connect = async () => {
      unsubscribe?.()
      const pb = getPocketBase()
      const next = await subscribeCollections(pb, collections, () => {
        onEventRef.current()
      })
      if (cancelled) {
        next()
        return
      }
      unsubscribe = next
      setLive(true)
    }

    void connect()

    const onFocus = () => {
      void connect()
    }
    window.addEventListener("focus", onFocus)

    return () => {
      cancelled = true
      unsubscribe?.()
      window.removeEventListener("focus", onFocus)
      setLive(false)
    }
  }, [collectionsKey, enabled])

  return { live }
}
