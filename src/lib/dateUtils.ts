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
