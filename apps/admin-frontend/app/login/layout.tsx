import { AuthProvider } from "@/lib/auth"

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthProvider>{children}</AuthProvider>
}
