"use client"

import type {
  FundingYearBreakdownRow,
  ParticipationStats,
} from "@workspace/pocketbase/domain/barangay-participation"

export { buildParticipationStats } from "@workspace/pocketbase/domain/barangay-participation"

type ParticipationStatsPanelProps = {
  participation: ParticipationStats
  fundingYearBreakdown: FundingYearBreakdownRow[]
  testIdPrefix?: string
}

export function ParticipationStatsPanel({
  participation,
  fundingYearBreakdown,
  testIdPrefix = "participation",
}: ParticipationStatsPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section
        className="rounded-(--radius-lg) border border-border bg-card p-4"
        data-testid={`${testIdPrefix}-participation-panel`}
      >
        <h2 className="text-sm font-semibold">Barangay participation</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Total barangays</dt>
            <dd data-testid={`${testIdPrefix}-total-barangays`}>
              {participation.totalBarangays}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">With projects</dt>
            <dd data-testid={`${testIdPrefix}-active-barangays`}>
              {participation.withProjects}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Participation rate</dt>
            <dd data-testid={`${testIdPrefix}-participation-rate`}>
              {participation.rate}%
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">{participation.copy}</p>
      </section>

      <section
        className="rounded-(--radius-lg) border border-border bg-card p-4"
        data-testid={`${testIdPrefix}-funding-year-panel`}
      >
        <h2 className="text-sm font-semibold">Funding-year utilization</h2>
        {fundingYearBreakdown.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {fundingYearBreakdown.map((row) => (
              <li
                key={row.year}
                data-testid={`${testIdPrefix}-funding-year-${row.year}`}
              >
                {row.copy}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No active projects with funding-year data in the current view.
          </p>
        )}
      </section>
    </div>
  )
}
