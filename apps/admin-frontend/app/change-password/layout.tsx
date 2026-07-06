import { AuthProvider } from "@/lib/auth"

import { ChangePasswordGuard } from "@/components/change-password-guard"

export default function ChangePasswordLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <ChangePasswordGuard>{children}</ChangePasswordGuard>
    </AuthProvider>
  )
}
