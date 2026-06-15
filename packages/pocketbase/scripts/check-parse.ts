import { parseRecordList } from "../src/schemas/parse.ts"
import {
  budgetAllocationRecordSchema,
  budgetExpenseRecordSchema,
  projectRecordSchema,
} from "../src/schemas/records.ts"

const base = process.env.POCKETBASE_INTERNAL_URL ?? "http://pocketbase:8090"

async function check(collection: string, schema: Parameters<typeof parseRecordList>[0]) {
  const res = await fetch(`${base}/api/collections/${collection}/records?perPage=200`)
  const body = await res.json()
  const items = body.items ?? []
  const parsed = parseRecordList(schema, items)
  console.log(`${collection}: API=${items.length} parsed=${parsed.length}`)
  if (parsed.length < items.length) {
    for (const row of items) {
      const result = schema.safeParse(row)
      if (!result.success) {
        console.log("  FAIL", (row as { id?: string; name?: string }).name ?? row)
        console.log("  ", JSON.stringify(result.error.issues.slice(0, 3)))
      }
    }
  }
}

await check("projects", projectRecordSchema)
await check("budget_allocations", budgetAllocationRecordSchema)
await check("budget_expenses", budgetExpenseRecordSchema)
