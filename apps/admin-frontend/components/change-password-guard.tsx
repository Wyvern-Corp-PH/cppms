"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import {
  isActiveUser,
  mustChangePassword,
} from "@workspace/pocketbase/domain/access-control"

import { useAuth } from "@/lib/auth"

type ChangePasswordGuardProps = {
  children: ReactNode
}

export function ChangePasswordGuard({ children }: ChangePasswordGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) {
      return
    }

    if (!user) {
      router.replace("/login?next=%2Fchange-password")
      return
    }

    if (!isActiveUser(user)) {
      router.replace("/login?inactive=1")
      return
    }

    if (!mustChangePassword(user)) {
      router.replace("/dashboard")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div
        className="text-muted-foreground flex min-h-svh items-center justify-center text-sm"
        data-testid="change-password-loading"
      >
        Checking session…
      </div>
    )
  }

  if (!user || !isActiveUser(user) || !mustChangePassword(user)) {
    return null
  }

  return children
}
