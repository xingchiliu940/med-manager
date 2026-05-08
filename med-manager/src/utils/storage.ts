/** localStorage 工具：与业务 key 解耦，便于单测 mock */

export const MED_MANAGER_STORAGE_KEY = 'med-manager-data' as const

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): void {
  localStorage.setItem(key, value)
}

/** 粗估剩余配额（字节），用于 PRD 接近配额预警 */
export function estimateLocalStorageRemainingBytes(): number | null {
  if (!window.localStorage) return null
  let used = 0
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i)
    if (!k) continue
    const v = localStorage.getItem(k) ?? ''
    used += k.length + v.length
  }
  // 常见上限约 5MB，按 5 * 1024 * 1024 估算剩余
  const budget = 5 * 1024 * 1024
  return Math.max(0, budget - used * 2)
}
