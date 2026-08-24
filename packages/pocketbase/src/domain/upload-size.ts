export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const UPLOAD_SIZE_LIMIT_MESSAGE =
  "File size exceeds the maximum allowed limit. Please upload a smaller file."

export function isOverUploadSizeLimit(file: { size: number }): boolean {
  return file.size > MAX_UPLOAD_BYTES
}

type FieldError = {
  code?: string
  message?: string
}

function fieldErrorsFromUnknown(error: unknown): FieldError[] {
  if (!error || typeof error !== "object") return []

  const obj = error as {
    response?: { data?: unknown }
    data?: { data?: unknown }
  }
  const fields = obj.response?.data ?? obj.data?.data
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return []
  }

  return Object.values(fields as Record<string, FieldError>)
}

function isFileSizeFieldError(field: FieldError): boolean {
  const code = field.code ?? ""
  const message = field.message ?? ""
  return (
    code === "validation_file_size_limit" ||
    code.includes("file_size") ||
    /maximum allowed file size|file size exceeds/i.test(message)
  )
}

export function persistErrorMessage(error: unknown, fallback: string): string {
  if (fieldErrorsFromUnknown(error).some(isFileSizeFieldError)) {
    return UPLOAD_SIZE_LIMIT_MESSAGE
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
