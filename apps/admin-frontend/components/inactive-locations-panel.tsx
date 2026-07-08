"use client"

import type { InactiveLocationsResult } from "@workspace/pocketbase/domain/inactive-locations"

type InactiveLocationsPanelProps = {
  data: InactiveLocationsResult
  testIdPrefix?: string
}

export function InactiveLocationsPanel({
  data,
  testIdPrefix = "inactive-locations",
}: InactiveLocationsPanelProps) {
  return (
    <section
      className="rounded-(--radius-lg) border border-border bg-card p-4"
      data-testid={`${testIdPrefix}-panel`}
    >
      <h2 className="text-sm font-semibold">Inactive locations</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Municipalities and barangays with no projects in the current dashboard
        view.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium">
            Municipalities without projects (
            <span data-testid={`${testIdPrefix}-municipality-count`}>
              {data.inactiveMunicipalities.length}
            </span>
            /{data.totalMunicipalities})
          </h3>
          <ul
            className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm"
            data-testid={`${testIdPrefix}-municipality-list`}
          >
            {data.inactiveMunicipalities.map((municipality) => (
              <li key={municipality}>{municipality}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium">
            Barangays without projects (
            <span data-testid={`${testIdPrefix}-barangay-count`}>
              {data.inactiveBarangays.length}
            </span>
            /{data.totalBarangays})
          </h3>
          <ul
            className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm"
            data-testid={`${testIdPrefix}-barangay-list`}
          >
            {data.inactiveBarangays.map((row) => (
              <li key={`${row.municipality}|${row.barangay}`}>
                {row.municipality} — {row.barangay}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
