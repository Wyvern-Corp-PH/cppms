import { LivePill } from "@/components/live-pill"

export type PageHeaderKpi = {
  label: string
  value: string
}

type PageHeaderBandProps = {
  title: string
  context: string
  kpis?: PageHeaderKpi[]
  live?: boolean
}

export function PageHeaderBand({ title, context, kpis, live }: PageHeaderBandProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{context}</p>
      </div>
      {kpis && kpis.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {live ? <LivePill /> : null}
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-[var(--radius-lg)] border border-border bg-card px-3 py-2"
            >
              <p className="text-muted-foreground text-xs">{kpi.label}</p>
              <p className="text-sm font-semibold tabular-nums">{kpi.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
