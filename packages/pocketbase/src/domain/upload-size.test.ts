import { describe, expect, it } from "vitest"

import {
  MAX_UPLOAD_BYTES,
  UPLOAD_SIZE_LIMIT_MESSAGE,
  isOverUploadSizeLimit,
  persistErrorMessage,
} from "./upload-size"

function fileSizeError(field = "site_photo") {
  const error = new Error("Failed to create record.")
  return Object.assign(error, {
    status: 400,
    response: {
      message: "Failed to create record.",
      data: {
        [field]: {
          code: "validation_file_size_limit",
          message: `Failed to upload photo.jpg - the maximum allowed file size is ${MAX_UPLOAD_BYTES} bytes.`,
        },
      },
    },
  })
}

describe("upload size limits", () => {
  it("treats the 10MB max as inclusive", () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024)
    expect(isOverUploadSizeLimit({ size: MAX_UPLOAD_BYTES })).toBe(false)
    expect(isOverUploadSizeLimit({ size: MAX_UPLOAD_BYTES + 1 })).toBe(true)
  })

  it("maps PocketBase file-size field errors to the over-limit sentence", () => {
    expect(persistErrorMessage(fileSizeError(), "Unable to save progress update.")).toBe(
      UPLOAD_SIZE_LIMIT_MESSAGE
    )
    expect(
      persistErrorMessage(fileSizeError("moa_file"), "Unable to save project.")
    ).toBe(UPLOAD_SIZE_LIMIT_MESSAGE)
  })

  it("keeps generic Failed to create record and other field errors", () => {
    expect(
      persistErrorMessage(new Error("Failed to create record."), "fallback")
    ).toBe("Failed to create record.")
    expect(
      persistErrorMessage(
        Object.assign(new Error("Failed to create record."), {
          response: {
            data: {
              certification_completion: {
                code: "validation_required",
                message: "Cannot be blank.",
              },
            },
          },
        }),
        "fallback"
      )
    ).toBe("Failed to create record.")
    expect(
      persistErrorMessage(
        Object.assign(new Error("Failed to create record."), {
          response: {
            data: {
              site_photo: {
                code: "validation_invalid_mime_type",
                message: "Failed to upload photo.jpg due to unsupported file type.",
              },
            },
          },
        }),
        "fallback"
      )
    ).toBe("Failed to create record.")
    expect(persistErrorMessage("not-an-error", "Unable to save project.")).toBe(
      "Unable to save project."
    )
  })
})
