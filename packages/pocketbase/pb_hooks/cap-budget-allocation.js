/**
 * Block budget_allocations create/update when Σ allocated would exceed Bid Price.
 * Collection rules cannot express a multi-row sum, so this request hook is the gate.
 */

const ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE =
  "Allocation amount exceeds the project's bid price."
const ALLOCATION_EXCEEDS_BUDGET_MESSAGE =
  "Allocation amount exceeds the project's Total Budget."
const ALLOCATION_AMOUNT_INVALID_MESSAGE =
  "Allocation amount must be a valid number."
const ALLOCATION_LIST_TRUNCATED_MESSAGE =
  "Too many allocations to validate against bid price."
const ALLOCATION_LOCK_FAILED_MESSAGE =
  "Unable to validate allocation cap because the project lock could not be established."
const ALLOCATION_QUERY_LIMIT = 500
// tradeoff: PocketBase JSVM has no row-lock / SELECT FOR UPDATE API.
// This no-op UPDATE takes a SQLite write lock on the project row until the
// current transaction commits (model hooks run inside Save). Request-hook
// calls auto-commit and do not span persist — the model hook re-locks.
// Failure to establish this lock rejects validation rather than using a stale sum.
const PROJECT_ROW_LOCK_SQL = "UPDATE projects SET id = id WHERE id = {:id}"

function sumAmounts(rows) {
  return rows.reduce((sum, row) => sum + row.amount, 0)
}

function bidPriceCap(bidPrice) {
  const cap = Number(bidPrice)
  return Number.isFinite(cap) ? cap : 0
}

function validateAllocationAgainstBidPrice(input) {
  return validateAllocationAgainstProjectBudget({
    ...input,
    project: { bid_price: input.bidPrice },
  })
}

function validateAllocationAgainstProjectBudget(input) {
  const existingTotal = sumAmounts(input.existingAllocations)
  const newAmount = Number(input.newAmount)
  const replaceOld =
    input.replaceOldAmount === undefined ? 0 : Number(input.replaceOldAmount)
  if (
    !Number.isFinite(newAmount) ||
    !Number.isFinite(existingTotal) ||
    (input.replaceOldAmount !== undefined && !Number.isFinite(replaceOld))
  ) {
    return { ok: false, message: ALLOCATION_AMOUNT_INVALID_MESSAGE }
  }
  const usesTotalBudget = Boolean(input.project.source_of_fund)
  const cap = bidPriceCap(
    usesTotalBudget ? input.project.total_budget : input.project.bid_price
  )
  if (existingTotal - replaceOld + newAmount > cap) {
    return {
      ok: false,
      message: usesTotalBudget
        ? ALLOCATION_EXCEEDS_BUDGET_MESSAGE
        : ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE,
    }
  }
  return { ok: true }
}

function sanitizeId(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9]/g, "")
}

function recordId(record) {
  if (!record) return ""
  if (record.id) return String(record.id)
  if (typeof record.get === "function") return String(record.get("id") || "")
  return ""
}

function lockProjectRow(app, projectId) {
  const id = sanitizeId(projectId)
  let stage = "validate app and project id"
  try {
    if (!id || !app || typeof app.db !== "function") throw new Error()
    stage = "open database builder"
    const db = app.db()
    if (!db || typeof db.newQuery !== "function") throw new Error()
    stage = "create lock query"
    const query = db.newQuery(PROJECT_ROW_LOCK_SQL)
    if (!query || typeof query.bind !== "function") throw new Error()
    stage = "bind project id"
    const boundQuery = query.bind({ id })
    if (!boundQuery || typeof boundQuery.execute !== "function") throw new Error()
    stage = "execute project lock"
    boundQuery.execute()
  } catch (error) {
    console.error(
      `Budget allocation cap lock failed for ${id} at ${stage}: ${error?.message ?? JSON.stringify(error) ?? String(error)}`
    )
    throw new BadRequestError(ALLOCATION_LOCK_FAILED_MESSAGE)
  }
}

function applyAllocationBidPriceCap(event) {
  const record = event.record
  const projectId = sanitizeId(record.get("project"))
  if (!projectId) {
    if (typeof event.next === "function") event.next()
    return
  }

  const app = event.app
  lockProjectRow(app, projectId)
  let project = { bid_price: 0 }
  try {
    const projectRecord = app.findRecordById("projects", projectId)
    project = {
      source_of_fund: projectRecord.get("source_of_fund"),
      total_budget: projectRecord.get("total_budget"),
      bid_price: projectRecord.get("bid_price"),
    }
  } catch {
    project = { bid_price: 0 }
  }

  const currentId = recordId(record)
  // tradeoff: first 500 rows per project; fail closed (reject persist) if truncated.
  const rows = app.findRecordsByFilter(
    "budget_allocations",
    `project = "${projectId}"`,
    "",
    ALLOCATION_QUERY_LIMIT,
    0
  )
  if ((rows || []).length >= ALLOCATION_QUERY_LIMIT) {
    throw new BadRequestError(ALLOCATION_LIST_TRUNCATED_MESSAGE)
  }
  const existingAllocations = []
  for (const row of rows || []) {
    if (recordId(row) === currentId) continue
    existingAllocations.push({ amount: Number(row.get("amount")) })
  }

  const result = validateAllocationAgainstProjectBudget({
    newAmount: record.get("amount"),
    existingAllocations,
    project,
  })
  if (!result.ok) {
    throw new BadRequestError(result.message)
  }
  if (typeof event.next === "function") {
    event.next()
  }
}

module.exports = {
  ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE,
  ALLOCATION_EXCEEDS_BUDGET_MESSAGE,
  ALLOCATION_AMOUNT_INVALID_MESSAGE,
  ALLOCATION_LIST_TRUNCATED_MESSAGE,
  ALLOCATION_LOCK_FAILED_MESSAGE,
  PROJECT_ROW_LOCK_SQL,
  lockProjectRow,
  validateAllocationAgainstBidPrice,
  validateAllocationAgainstProjectBudget,
  applyAllocationBidPriceCap,
}
