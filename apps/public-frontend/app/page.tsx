import { PublicLanding } from "@/components/public-landing"
import { PublicShell } from "@/components/public-shell"

export default function HomePage() {
  return (
    <PublicShell>
      <PublicLanding />
    </PublicShell>
  )
}
