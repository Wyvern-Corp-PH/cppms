import { describe, expect, it } from "vitest"

import { buildUserDisplayMap, displayUserRef } from "./user-display"
import type { UserRecord } from "../types"

const users: UserRecord[] = [
  {
    id: "u1",
    collectionId: "users",
    collectionName: "users",
    email: "ana@example.test",
    name: "Ana Santos",
    role: "Admin",
    account_status: "Active",
  },
  {
    id: "u2",
    collectionId: "users",
    collectionName: "users",
    email: "ben@example.test",
    role: "User",
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
})
