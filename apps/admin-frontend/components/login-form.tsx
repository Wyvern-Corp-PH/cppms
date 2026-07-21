"use client"

import { useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import {
  fieldErrorsFromZod,
  loginFormSchema,
} from "@workspace/pocketbase/schemas"
import { mustChangePassword } from "@workspace/pocketbase/domain/access-control"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { useAuth } from "@/lib/auth"
import { getPocketBase } from "@/lib/pocketbase"

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
      const record = getPocketBase().authStore.record
      if (mustChangePassword(record)) {
        router.replace("/change-password")
      } else {
        router.replace(next)
      }
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
      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            aria-invalid={Boolean(fieldErrors.email)}
            onChange={(event) => setEmail(event.target.value)}
          />
          <FieldError>{fieldErrors.email}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors.password)}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            aria-invalid={Boolean(fieldErrors.password)}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FieldError>{fieldErrors.password}</FieldError>
        </Field>
        {error ? <FieldError>{error}</FieldError> : null}
      </FieldGroup>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
