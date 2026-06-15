import { describe, expect, it } from "vitest"

import {
  budgetAllocationRecordSchema,
  projectRecordSchema,
} from "./records"
import { parseRecord, parseRecordList } from "./parse"

const validProject = {
  id: "1",
  collectionId: "p",
  created: "2026-01-01",
  updated: "2026-01-01",
  name: "Bridge",
  category: "Infrastructure",
  status: "Ongoing",
  budget_year: 2026,
}

describe("parseRecordList (V33)", () => {
  it("returns only valid records and skips invalid rows", () => {
    const rows = [
      validProject,
      { ...validProject, id: "2", category: "NotReal" },
      { ...validProject, id: "3", name: "School" },
    ]

    const parsed = parseRecordList(projectRecordSchema, rows)

    expect(parsed).toHaveLength(2)
    expect(parsed.map((row) => row.id)).toEqual(["1", "3"])
  })
})

describe("parseRecord", () => {
  it("returns null for invalid input", () => {
    expect(parseRecord(budgetAllocationRecordSchema, { amount: -1 })).toBeNull()
  })
})
