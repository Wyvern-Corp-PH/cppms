import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import {
  formatProjectDateRange,
  projectLocationDisplayParts,
} from "@workspace/pocketbase/domain/project-filters"
import type { ProjectRecord } from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import { Progress } from "@workspace/ui/components/progress"

type AdminPortalPreviewProps = {
  projects?: ProjectRecord[]
}

const sidebarLabels = ["Dashboard", "Projects", "Budget", "Progress", "Approvals", "Reports"]

export function AdminPortalPreview({ projects = [] }: AdminPortalPreviewProps) {
  const previewProjects = projects.slice(0, 2)

  return (
    <div
      className="w-full rounded-(--radius-lg) border border-border bg-card p-2 text-left shadow-none"
      data-testid="admin-portal-preview"
    >
      <div className="flex gap-2">
        <aside className="bg-muted/40 hidden w-24 shrink-0 rounded-md border border-border p-2 sm:block">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            PPMS
          </p>
          <ul className="space-y-1 text-[10px]">
            {sidebarLabels.map((label, index) => (
              <li
                key={label}
                className={[
                  "rounded px-1.5 py-0.5",
                  index === 1 ? "bg-background font-medium text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {label}
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 p-1">
          <p className="text-muted-foreground mb-2 text-[10px]">Projects › All records</p>
          <div className="text-muted-foreground mb-2 flex flex-wrap gap-1 text-[10px]">
            <span className="bg-muted rounded px-1.5 py-0.5">Search</span>
            <span className="bg-muted rounded px-1.5 py-0.5">Status</span>
            <span className="bg-muted rounded px-1.5 py-0.5">Category</span>
            <span className="bg-muted ml-auto rounded px-1.5 py-0.5 text-primary">+ New project</span>
          </div>

          {previewProjects.length > 0 ? (
            <ul className="space-y-2">
              {previewProjects.map((project) => (
                <li
                  key={project.id}
                  className="rounded-md border border-border bg-background p-2 text-[10px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{project.name}</span>
                    <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate">
                    {[
                      ...projectLocationDisplayParts(project),
                      project.category,
                      project.lgu_level,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {formatProjectDateRange(project.start_date, project.target_end_date)} ·{" "}
                    {formatPhp(project.total_budget ?? 0)}
                  </p>
                  <Progress className="mt-1 h-1" value={project.progress_pct ?? 0} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              {[0, 1].map((key) => (
                <div key={key} className="bg-muted/50 h-12 rounded-md border border-border" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
