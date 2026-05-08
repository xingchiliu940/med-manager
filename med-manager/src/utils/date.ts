/** 业务日：本地时区日历日，格式 YYYY-MM-DD */

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 当天 0 点的本地 Date */
export function startOfLocalDay(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function todayLocalString(): string {
  return formatLocalDate(new Date())
}
