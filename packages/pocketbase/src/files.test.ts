import { describe, expect, it } from "vitest"

import { recordFileUrl } from "./files"

describe("recordFileUrl", () => {
  it("builds PocketBase file URL", () => {
    expect(
      recordFileUrl(
        { id: "rec1", collectionId: "col1" },
        "photo.webp",
        "http://localhost:8090"
      )
    ).toBe("http://localhost:8090/api/files/col1/rec1/photo.webp")
  })

  it("returns null when filename missing", () => {
    expect(recordFileUrl({ id: "rec1", collectionId: "col1" }, undefined)).toBeNull()
  })
})
