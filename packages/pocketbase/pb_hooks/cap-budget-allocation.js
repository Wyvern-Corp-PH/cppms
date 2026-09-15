/**
 * Block budget_allocations create/update when Σ allocated would exceed Bid Price.
 * Collection rules cannot express a multi-row sum, so this request hook is the gate.
 */

const ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE =
  "Allocation amount exceeds the project's bid price."
const ALLOCATION_AMOUNT_INVALID_MESSAGE =
  "Allocation amount must be a valid number."
const ALLOCATION_LIST_TRUNCATED_MESSAGE =
  "Too many allocations to validate against bid price."
const ALLOCATION_QUERY_LIMIT = 500

function sumAmounts(rows) {
  return rows.reduce((sum, row) => sum + row.amount, 0)
}

function bidPriceCap(bidPrice) {
  const cap = Number(bidPrice)
  return Number.isFinite(cap) ? cap : 0
}

function validateAllocationAgainstBidPrice(input) {
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
  if (existingTotal - replaceOld + newAmount > bidPriceCap(input.bidPrice)) {
    return { ok: false, message: ALLOCATION_EXCEEDS_BID_PRICE_MESSAGE }
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

function applyAllocationBidPriceCap(event) {
  const record = event.record
  const projectId = sanitizeId(record.get("project"))
  if (!projectId) {
    if (typeof event.next === "function") event.next()
    return
  }

  const app = event.app
  let bidPrice = 0
  try {
    bidPrice = app.findRecordById("projects", projectId).get("bid_price")
  } catch {
    bidPrice = 0
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

  const result = validateAllocationAgainstBidPrice({
    newAmount: record.get("amount"),
    existingAllocations,
    bidPrice,
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
  ALLOCATION_AMOUNT_INVALID_MESSAGE,
  ALLOCATION_LIST_TRUNCATED_MESSAGE,
  validateAllocationAgainstBidPrice,
  applyAllocationBidPriceCap,
}
