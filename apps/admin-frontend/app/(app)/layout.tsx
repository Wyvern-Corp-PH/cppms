import { AdminShell } from "@/components/admin-shell"
import { AuthGuard } from "@/components/auth-guard"
import { AuthProvider } from "@/lib/auth"

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthProvider>
      <AuthGuard>
        <AdminShell>{children}</AdminShell>
      </AuthGuard>
    </AuthProvider>
  )
}
