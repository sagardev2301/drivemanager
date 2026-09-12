// Android contact copy/paste sometimes prepends a 0 to a 10-digit number
// (dialer trunk-prefix habit) — an 11-digit number starting with 0 is a
// valid paste, not an error, so strip the 0 rather than rejecting it.
export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1)
  }
  return trimmed
}
