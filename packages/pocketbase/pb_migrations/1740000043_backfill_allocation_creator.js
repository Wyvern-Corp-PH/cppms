/**
 * Backfill allocated_by on system-generated budget allocations from the
 * earliest successful project-create activity log.
 * Idempotent: skips manual rows and any allocated_by that is already set.
 * Writes allocated_by only.
 *
 * @see pickAllocationCreator in packages/pocketbase/src/domain/pick-allocation-creator.ts
 * PB migrations cannot import TS — keep this picker in sync.
 *
 * Note: migration findRecordsByFilter rejects sort field "created" (PB serve
 * error). Fetch unsorted and pick earliest via created/created_at/id in JS.
 */

const migrate = globalThis.migrate

const SYSTEM_ALLOCATION_DESCRIPTION =
  "System-generated from Provincial project creation."
const PAGE_SIZE = 500

function findCollection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  } catch {
    return null
  }
}

function findRecordPage(app, collectionName, filter, offset) {
  if (!findCollection(app, collectionName)) return []
  return (
    app.findRecordsByFilter(collectionName, filter, "", PAGE_SIZE, offset) || []
  )
}

function findRecords(app, collectionName, filter) {
  const records = []
  let offset = 0
  while (true) {
    const batch = findRecordPage(app, collectionName, filter, offset)
    records.push(...batch)
    if (batch.length < PAGE_SIZE) break
    offset += batch.length
  }
  return records
}

function logStamp(row) {
  return String(row.get("created") || row.get("created_at") || "")
}

function isEarlierLog(candidate, current) {
  const candidateStamp = logStamp(candidate)
  const currentStamp = logStamp(current)
  if (candidateStamp !== currentStamp) {
    if (!candidateStamp) return false
    if (!currentStamp) return true
    return candidateStamp < currentStamp
  }
  return String(candidate.id || "") < String(current.id || "")
}

function userStillExists(app, userId) {
  try {
    return Boolean(app.findRecordById("users", userId))
  } catch {
    return false
  }
}

function pickAllocationCreator(app, projectId) {
  const safeId = String(projectId || "").replace(/[^a-zA-Z0-9]/g, "")
  if (!safeId) return ""

  const filter = `resource = "projects" && action = "create" && outcome = "success" && resource_id = "${safeId}"`
  let earliest = null
  let offset = 0
  while (true) {
    const batch = findRecordPage(app, "activity_logs", filter, offset)
    for (const row of batch) {
      if (!earliest || isEarlierLog(row, earliest)) earliest = row
    }
    if (batch.length < PAGE_SIZE) break
    offset += batch.length
  }

  if (!earliest) return ""
  const actor = String(earliest.get("actor_user") || "").trim()
  if (!actor || !userStillExists(app, actor)) return ""
  return actor
}

function backfillAllocationCreators(app) {
  if (!findCollection(app, "budget_allocations")) return

  const rows = findRecords(
    app,
    "budget_allocations",
    `description = "${SYSTEM_ALLOCATION_DESCRIPTION}"`
  )
  for (const row of rows) {
    if (String(row.get("allocated_by") || "").trim()) continue
    const creator = pickAllocationCreator(app, row.get("project"))
    if (!creator) continue
    row.set("allocated_by", creator)
    // No request context: request cap and completeness hooks do not run.
    // Amount is unchanged, so the model cap check does not raise the total.
    app.save(row)
  }
}

migrate(
  (app) => {
    backfillAllocationCreators(app)
  },
  () => {
    // One-way data repair — no destructive down.
  }
)
