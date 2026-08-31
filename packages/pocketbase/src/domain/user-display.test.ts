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

  it("should harvest only known user relations from expand payloads", () => {
    const harvested = usersFromExpandedRows([
      {
        id: "p1",
        expand: {
          project: { id: "proj-1", name: "Bridge Project" },
          allocated_by: { id: "allocator-user", name: "Allocator Name" },
          approved_by: { id: "approver-user", name: "Approver Name" },
          updated_by: { id: "updater-user", name: "Updater Name" },
          actor_user: { id: "actor-user", name: "Actor Name" },
        },
      },
    ])

    const displayMap = buildUserDisplayMap(harvested)
    expect(displayUserRef("allocator-user", displayMap)).toBe("Allocator Name")
    expect(displayUserRef("approver-user", displayMap)).toBe("Approver Name")
    expect(displayUserRef("updater-user", displayMap)).toBe("Updater Name")
    expect(displayUserRef("actor-user", displayMap)).toBe("Actor Name")
    expect(displayUserRef("proj-1", displayMap)).toBe("proj-1")
  })

  it("should fall back to email then id from expanded allocated_by, updated_by, and approved_by", () => {
    const harvested = usersFromExpandedRows([
      {
        id: "row-1",
        expand: {
          allocated_by: {
            id: "allocator-user",
            email: "allocator@example.test",
          },
          updated_by: { id: "updater-user" },
          approved_by: {
            id: "approver-user",
            name: "  ",
            email: "approver@example.test",
          },
        },
      },
    ])

    const displayMap = buildUserDisplayMap(harvested)
    expect(displayUserRef("allocator-user", displayMap)).toBe(
      "allocator@example.test"
    )
    expect(displayUserRef("updater-user", displayMap)).toBe("updater-user")
    expect(displayUserRef("approver-user", displayMap)).toBe(
      "approver@example.test"
    )
  })
})
