import { describe, expect, it } from "vitest"

import {
  buildUserDisplayMap,
  displayUserRef,
  usersFromExpandedRows,
} from "./user-display"
import type { UserRecord } from "../types"

const users: UserRecord[] = [
  {
    id: "u1",
    collectionId: "users",
    collectionName: "users",
    email: "ana@example.test",
    name: "Ana Santos",
    role: "Province",
    account_status: "Active",
  },
  {
    id: "u2",
    collectionId: "users",
    collectionName: "users",
    email: "ben@example.test",
    role: "Barangay",
    account_status: "Active",
  },
]

describe("user display helpers (V149)", () => {
  it("maps user ids to name, then email, then fallback", () => {
    const displayMap = buildUserDisplayMap(users)

    expect(displayUserRef("u1", displayMap)).toBe("Ana Santos")
    expect(displayUserRef("u2", displayMap)).toBe("ben@example.test")
    expect(displayUserRef("missing", displayMap)).toBe("missing")
    expect(displayUserRef(undefined, displayMap, "Pending")).toBe("Pending")
  })

  it("uses fallback user records when the users collection is unavailable", () => {
    const displayMap = buildUserDisplayMap([], [
      {
        id: "current-user",
        name: "Current Admin",
        email: "current@example.test",
      },
    ])

    expect(displayUserRef("current-user", displayMap)).toBe("Current Admin")
  })

  it("should collect user rows from PocketBase expand payloads", () => {
    const harvested = usersFromExpandedRows([
      {
        id: "p1",
        approved_by: "province-user",
        expand: {
          approved_by: { id: "province-user", name: "Province Reviewer" },
        },
      },
      {
        id: "u1",
        updated_by: "officer-user",
        expand: {
          updated_by: { id: "officer-user", name: "Barangay Officer" },
        },
      },
    ])

    const displayMap = buildUserDisplayMap(harvested)
    expect(displayUserRef("province-user", displayMap)).toBe("Province Reviewer")
    expect(displayUserRef("officer-user", displayMap)).toBe("Barangay Officer")
  })
})
