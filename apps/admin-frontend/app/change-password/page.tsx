import { ChangePasswordForm } from "@/components/change-password-form"

export default function ChangePasswordPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Change password</h1>
          <p className="text-muted-foreground text-sm">
            Your account requires a new password before you can continue.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  )
}
