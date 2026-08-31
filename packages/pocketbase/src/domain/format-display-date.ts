const DISPLAY_LOCALE = "en-US"
const DATE_ONLY = /^(\d{4}-\d{2}-\d{2})$/

export function localCalendarDateKey(value: string): string | null {
  const date = parseDateValue(value)
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateValue(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (DATE_ONLY.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number)
    return new Date(year!, month! - 1, day)
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function hasTimeComponent(value: string): boolean {
  return value.includes("T") || /\d{2}:\d{2}/.test(value)
}

export function formatDisplayDate(value?: string | null): string {
  if (!value?.trim()) {
    return "—"
  }

  const date = parseDateValue(value)
  if (!date) {
    return value
  }

  return date.toLocaleDateString(DISPLAY_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDisplayDateTime(value?: string | null): string {
  if (!value?.trim()) {
    return "—"
  }

  if (!hasTimeComponent(value)) {
    return formatDisplayDate(value)
  }

  const date = parseDateValue(value)
  if (!date) {
    return value
  }

  return date.toLocaleString(DISPLAY_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
