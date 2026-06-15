"use client"

import { useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import {
  fieldErrorsFromZod,
  loginFormSchema,
} from "@workspace/pocketbase/schemas"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { useAuth } from "@/lib/auth"

export function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const parsed = loginFormSchema.safeParse({ email, password })
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      setSubmitting(false)
      return
    }

    setFieldErrors({})

    try {
      await login(parsed.data.email, parsed.data.password)
      const next = searchParams.get("next") ?? "/dashboard"
      router.replace(next)
    } catch {
      setError("Invalid email or password.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-4"
      onSubmit={handleSubmit}
      aria-label="Admin login"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          aria-invalid={Boolean(fieldErrors.email)}
          onChange={(event) => setEmail(event.target.value)}
        />
        {fieldErrors.email ? (
          <p className="text-destructive text-sm" role="alert">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={Boolean(fieldErrors.password)}
          onChange={(event) => setPassword(event.target.value)}
        />
        {fieldErrors.password ? (
          <p className="text-destructive text-sm" role="alert">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
