export function toLocalDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export type PeriodKey = 'month' | '3m' | '6m' | 'year' | 'all'

// Period start, built from local date components (not ISO-string slicing,
// which shifts dates backward in IST) — null means no lower bound (All Time).
export function getPeriodStartDate(period: PeriodKey, now: Date = new Date()): Date | null {
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()
  switch (period) {
    case 'month': return new Date(year, month, 1)
    case '3m': return new Date(year, month - 3, day)
    case '6m': return new Date(year, month - 6, day)
    case 'year': return new Date(year, 0, 1)
    case 'all': return null
  }
}

export function canMarkClassDone(startTime: string | null): boolean {
  if (!startTime) return true
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [h, m] = startTime.split(':').map(Number)
  const classMinutes = h * 60 + (m || 0)
  return currentMinutes >= classMinutes
}

export function addHoursToTime(time: string, hours = 1): string {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length < 2) return ''
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return ''
  const newH = ((h + hours) % 24 + 24) % 24
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function parseTimeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null
  const parts = t.split(':')
  if (parts.length < 1) return null
  const h = parseInt(parts[0], 10)
  const m = parts.length > 1 ? parseInt(parts[1], 10) : 0
  if (isNaN(h)) return null
  return h * 60 + (isNaN(m) ? 0 : m)
}

export function getClassTimeRange(cls: { start_time: string | null; end_time?: string | null }) {
  const startMinutes = parseTimeToMinutes(cls.start_time)
  if (startMinutes === null) return null

  let endMinutes = parseTimeToMinutes(cls.end_time)
  // If end_time is missing or invalid or <= startMinutes (e.g. 00:00 midnight typo for noon), default to start + 60m
  if (endMinutes === null || endMinutes <= startMinutes) {
    endMinutes = startMinutes + 60
  }
  return { startMinutes, endMinutes }
}

export function isClassExpired(cls: { start_time: string | null; end_time?: string | null }): boolean {
  const range = getClassTimeRange(cls)
  if (!range) return false
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return currentMinutes >= range.endMinutes
}

export function isClassLive(cls: { start_time: string | null; end_time?: string | null }): boolean {
  const range = getClassTimeRange(cls)
  if (!range) return false
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return currentMinutes >= range.startMinutes && currentMinutes < range.endMinutes
}

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const past = new Date(dateStr).getTime()
  if (isNaN(past)) return ''
  const now = Date.now()
  const diffSec = Math.floor((now - past) / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`

  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
