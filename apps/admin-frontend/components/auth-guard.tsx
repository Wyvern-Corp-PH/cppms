"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { canAccess, isActiveUser } from "@workspace/pocketbase/domain/access-control"

import { useAuth } from "@/lib/auth"

type AuthGuardProps = {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) {
      return
    }

    if (user && !isActiveUser(user)) {
      router.replace("/login?inactive=1")
      return
    }

    if (user && pathname.startsWith("/users") && !canAccess(user, "users.update")) {
      router.replace("/dashboard?forbidden=users")
      return
    }

    if (user) {
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

  if (
    !user ||
    !isActiveUser(user) ||
    (pathname.startsWith("/users") && !canAccess(user, "users.update"))
  ) {
    return null
  }

  return children
}
