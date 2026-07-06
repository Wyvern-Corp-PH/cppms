const TEMP_PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"

export const TEMP_PASSWORD_LENGTH = 12

export function generateTempPassword(
  length: number = TEMP_PASSWORD_LENGTH
): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => TEMP_PASSWORD_CHARS[byte % TEMP_PASSWORD_CHARS.length]).join(
    ""
  )
}
