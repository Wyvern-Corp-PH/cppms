"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { mustChangePassword } from "@workspace/pocketbase/domain/access-control"
import {
  changePasswordFormSchema,
  fieldErrorsFromZod,
} from "@workspace/pocketbase/schemas"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { PasswordRequirements } from "@/components/password-requirements"
import { useAuth } from "@/lib/auth"
import { getPocketBase } from "@/lib/pocketbase"

export function ChangePasswordForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const parsed = changePasswordFormSchema.safeParse({
      currentPassword,
      password,
      passwordConfirm,
    })
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      setSubmitting(false)
      return
    }

    setFieldErrors({})

    if (!user?.id || !user.email) {
      setError("Session expired. Sign in again.")
      setSubmitting(false)
      return
    }

    const pb = getPocketBase()

    try {
      await pb.collection("users").update(user.id, {
        oldPassword: parsed.data.currentPassword,
        password: parsed.data.password,
        passwordConfirm: parsed.data.passwordConfirm,
        must_change_password: false,
      })
      await pb.collection("users").authWithPassword(user.email, parsed.data.password)
      router.replace("/dashboard")
    } catch {
      setError("Could not update password. Check your current password and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (user && !mustChangePassword(user)) {
    return null
  }

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-4"
      onSubmit={handleSubmit}
      aria-label="Change password"
    >
      <Field data-invalid={!!fieldErrors.currentPassword}>
        <FieldLabel htmlFor="current-password">Current password</FieldLabel>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          aria-invalid={!!fieldErrors.currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <FieldError>{fieldErrors.currentPassword}</FieldError>
      </Field>
      <FieldGroup>
        <Field data-invalid={!!fieldErrors.password}>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            aria-invalid={!!fieldErrors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordRequirements />
          <FieldError>{fieldErrors.password}</FieldError>
        </Field>
        <Field data-invalid={!!fieldErrors.passwordConfirm}>
          <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            aria-invalid={!!fieldErrors.passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
          />
          <FieldError>{fieldErrors.passwordConfirm}</FieldError>
        </Field>
      </FieldGroup>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Updating…" : "Update password"}
      </Button>
    </form>
  )
}
