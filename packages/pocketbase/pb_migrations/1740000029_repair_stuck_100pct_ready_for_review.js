/**
 * Repair stuck projects: effectivePct ≥ 100 ∧ status ∈ {Planning, Procurement, Ongoing}
 * → sync progress_pct + status Ready for Review.
 * effectivePct = max(latest progress_updates.to_pct, projects.progress_pct)
 * Idempotent: re-run safe (Ready for Review rows skipped).
 *
 * STUCK_STATUSES mirrors domain STUCK_AT_100_PROGRESS_STATUSES +
 * isStuckAt100NeedingReadyForReview (packages/pocketbase/src/domain/progress-summary.ts).
 * PB migrations cannot import TS — keep this list in sync.
 *
 * Note: migration findRecordsByFilter rejects sort field "created" (PB serve
 * error). Fetch unsorted and pick newest via created/updated/id in JS.
 */

const migrate = globalThis.migrate

/** @see STUCK_AT_100_PROGRESS_STATUSES in domain/progress-summary.ts */
const STUCK_STATUSES = ["Planning", "Procurement", "Ongoing"]
const PAGE_SIZE = 500

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function findRecords(app, collectionName, filter, sort = "", pageSize = PAGE_SIZE) {
  if (!findCollection(app, collectionName)) return []

  const records = []
  let offset = 0
  while (true) {
    const batch = app.findRecordsByFilter(
      collectionName,
      filter,
      sort,
      pageSize,
      offset
    )
    records.push(...batch)
    if (batch.length < pageSize) break
    offset += batch.length
  }
  return records
}

function recordRecencyKey(row) {
  return String(row.get("created") || row.get("updated") || row.id || "")
}

function latestToPct(app, projectId) {
  const safeId = String(projectId).replace(/[^a-zA-Z0-9]/g, "")
  const rows = findRecords(
    app,
    "progress_updates",
    `project = "${safeId}"`,
    "",
    PAGE_SIZE
  )
  if (!rows.length) return null

  let newest = rows[0]
  let newestKey = recordRecencyKey(newest)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const key = recordRecencyKey(row)
    if (key > newestKey) {
      newest = row
      newestKey = key
    }
  }

  const value = Number(newest.get("to_pct"))
  return Number.isFinite(value) ? value : null
}

function repairStuckAt100(app) {
  if (!findCollection(app, "projects")) return

  for (const status of STUCK_STATUSES) {
    const rows = findRecords(app, "projects", `status = "${status}"`)
    for (const project of rows) {
      const progressPct = Number(project.get("progress_pct") || 0)
      const latest = latestToPct(app, project.id)
      const effectivePct = Math.max(
        Number.isFinite(progressPct) ? progressPct : 0,
        latest ?? 0
      )
      if (effectivePct < 100) continue

      project.set("progress_pct", effectivePct)
      project.set("status", "Ready for Review")
      app.save(project)
    }
  }
}

migrate(
  (app) => {
    repairStuckAt100(app)
  },
  () => {
    // One-way data repair — no destructive down.
  }
)
