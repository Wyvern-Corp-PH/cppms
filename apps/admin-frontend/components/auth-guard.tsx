"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { isActiveUser, mustChangePassword } from "@workspace/pocketbase/domain/access-control"

import { canAccessAdminPath } from "@/lib/admin-nav"
import { useAuth } from "@/lib/auth"

type AuthGuardProps = {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const pathAllowed = canAccessAdminPath(user, pathname)

  useEffect(() => {
    if (loading) {
      return
    }

    if (user && !isActiveUser(user)) {
      router.replace("/login?inactive=1")
      return
    }

    if (user && mustChangePassword(user)) {
      router.replace("/change-password")
      return
    }

    if (user && !pathAllowed) {
      router.replace("/dashboard?forbidden=1")
      return
    }

    if (user) {
      return
    }

    router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [loading, user, router, pathname, pathAllowed])

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

  if (
    !user ||
    !isActiveUser(user) ||
    mustChangePassword(user) ||
    !pathAllowed
  ) {
    return null
  }

  return children
}
