export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// "09:00" / "09:00:00" -> "9:00 AM"
export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Dates are parsed with an explicit local midnight so they never shift a day
// backward in IST the way bare `new Date('2026-09-16')` (UTC) does.
function localDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`)
}

export function formatDateShort(dateStr: string): string {
  return localDate(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatDateFull(dateStr: string): string {
  return localDate(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatPrice(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

export function dayOfWeek(dateStr: string): number {
  return localDate(dateStr).getDay()
}
