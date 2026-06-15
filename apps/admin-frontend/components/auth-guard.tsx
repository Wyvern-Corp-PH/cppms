"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/lib/auth"

type AuthGuardProps = {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading || user) {
      return
    }

    router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [loading, user, router, pathname])

  if (loading) {
    return (
      <div
        className="text-muted-foreground flex min-h-svh items-center justify-center text-sm"
        data-testid="auth-loading"
      >
        Checking session…
      </div>
    )
  }

  if (!user) {
    return null
  }

  return children
}
