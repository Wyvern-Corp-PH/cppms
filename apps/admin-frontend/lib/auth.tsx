"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { RecordModel } from "pocketbase"

import { getPocketBase } from "@/lib/pocketbase"

type AuthContextValue = {
  user: RecordModel | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const pb = getPocketBase()
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(pb.authStore.record)
    setLoading(false)

    return pb.authStore.onChange((_token, record) => {
      setUser(record)
    })
  }, [pb])

  const login = useCallback(
    async (email: string, password: string) => {
      await pb.collection("users").authWithPassword(email, password)
    },
    [pb]
  )

  const logout = useCallback(() => {
    pb.authStore.clear()
  }, [pb])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
