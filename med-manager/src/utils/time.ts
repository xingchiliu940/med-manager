/** 校验 HH:mm */

export function isValidHm(t: string): boolean {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t.trim())
  return Boolean(m)
}

export function parseHmToMinutes(t: string): number {
  const [h, min] = t.trim().split(':').map(Number)
  return h * 60 + min
}
