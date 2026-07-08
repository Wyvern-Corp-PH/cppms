import type { ZodType } from "zod"
import { ZodError } from "zod"

export function parseRecordList<T>(schema: ZodType<T>, rows: unknown[]): T[] {
  const parsed: T[] = []

  for (const row of rows) {
    const result = schema.safeParse(row)
    if (result.success) {
      parsed.push(result.data)
    }
  }

  return parsed
}

export function parseRecord<T>(schema: ZodType<T>, row: unknown): T | null {
  const result = schema.safeParse(row)
  return result.success ? result.data : null
}

export function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".")
    if (key && !errors[key]) {
      errors[key] = issue.message
    }
  }

  return errors
}

export function firstZodError(error: ZodError): string {
  return error.issues[0]?.message ?? "Validation failed."
}
