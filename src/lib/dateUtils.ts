export function toLocalDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
