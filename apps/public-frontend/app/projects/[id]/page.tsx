import { PublicProjectDetail } from "@/components/public-project-detail"
import { PublicShell } from "@/components/public-shell"

export default async function PublicProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <PublicShell>
      <PublicProjectDetail projectId={id} />
    </PublicShell>
  )
}
