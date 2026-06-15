import { Suspense } from "react"

import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-[var(--radius-lg)] border bg-card px-6 py-8">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Cagayan PPMS</h1>
          <p className="text-muted-foreground text-sm">Provincial admin sign in</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
