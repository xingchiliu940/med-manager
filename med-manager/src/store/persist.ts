import type { AppPersistRoot } from '../types'
import { SCHEMA_VERSION_INITIAL } from '../types'
import {
  DEFAULT_RX_EXPIRING_DAYS,
  DEFAULT_STOCK_LOW_THRESHOLD,
} from '../constants/defaults'
import {
  MED_MANAGER_STORAGE_KEY,
  estimateLocalStorageRemainingBytes,
  safeGetItem,
  safeSetItem,
} from '../utils/storage'

/** 创建空持久化根（新用户或损坏数据回退） */
export function createDefaultRoot(): AppPersistRoot {
  return {
    schemaVersion: SCHEMA_VERSION_INITIAL,
    userProfile: { name: '', age: 0, gender: '其他', phone: '', medicalRecord: '' },
    drugMasters: [],
    stockBatches: [],
    medicationPlans: [],
    doseRecords: [],
    consultations: [],
    prescriptions: [],
    followUps: [],
    reminders: [],
    settings: {
      stockLowDefaultThreshold: DEFAULT_STOCK_LOW_THRESHOLD,
      rxExpiringDays: DEFAULT_RX_EXPIRING_DAYS,
      browserNotifyEnabled: false,
    },
    meta: {},
  }
}

/** 链式迁移入口：随 schemaVersion 递增追加 case */
function migrate(raw: unknown): AppPersistRoot {
  const base = createDefaultRoot()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  const ver = typeof o.schemaVersion === 'number' ? o.schemaVersion : 0
  if (ver < 1) return base

  const incoming = raw as AppPersistRoot

  // v1 → v2: userProfile 结构变更
  const profile: AppPersistRoot['userProfile'] = (() => {
    const up = incoming.userProfile as unknown as Record<string, unknown> | undefined
    if (!up) return base.userProfile
    // v1 旧字段：重置为空
    if ('displayName' in up || 'birthYear' in up || 'chronicNote' in up) {
      return base.userProfile
    }
    // v2 新字段
    return {
      name: (up.name as string) ?? '',
      age: (up.age as number) ?? 0,
      gender: (up.gender as '男' | '女' | '其他') ?? '其他',
      phone: (up.phone as string) ?? '',
      medicalRecord: (up.medicalRecord as string) ?? '',
    }
  })()

  // 不 spread incoming，显式逐项迁移，避免携带旧字段
  return {
    schemaVersion: 2,
    userProfile: profile,
    drugMasters: incoming.drugMasters ?? base.drugMasters,
    stockBatches: incoming.stockBatches ?? base.stockBatches,
    medicationPlans: incoming.medicationPlans ?? base.medicationPlans,
    doseRecords: incoming.doseRecords ?? base.doseRecords,
    consultations: incoming.consultations ?? base.consultations,
    prescriptions: incoming.prescriptions ?? base.prescriptions,
    followUps: incoming.followUps ?? base.followUps,
    reminders: incoming.reminders ?? base.reminders,
    settings: { ...base.settings, ...(incoming.settings ?? {}) },
    meta: { ...base.meta, ...(incoming.meta ?? {}) },
  }
}

export function loadPersistedRoot(): AppPersistRoot {
  const raw = safeGetItem(MED_MANAGER_STORAGE_KEY)
  if (!raw) return createDefaultRoot()
  try {
    return migrate(JSON.parse(raw))
  } catch {
    return createDefaultRoot()
  }
}

let quotaWarnedThisSession = false

/** 接近配额时回调一次（< 200KB） */
function maybeWarnQuota(onToast?: (msg: string) => void) {
  if (quotaWarnedThisSession || !onToast) return
  const left = estimateLocalStorageRemainingBytes()
  if (left !== null && left < 200 * 1024) {
    quotaWarnedThisSession = true
    onToast('本地存储空间紧张，建议归档或导出后清理数据。')
  }
}

/**
 * 写入持久化；失败时 Toast + 自动重试 1 次（PRD / CLAUDE）
 * @returns 是否写入成功
 */
export function savePersistedRoot(
  root: AppPersistRoot,
  onToast?: (msg: string) => void,
): boolean {
  maybeWarnQuota(onToast)
  const payload = JSON.stringify(root)
  const writeOnce = () => {
    safeSetItem(MED_MANAGER_STORAGE_KEY, payload)
  }
  try {
    writeOnce()
    return true
  } catch {
    const msg = '数据保存失败，将自动重试一次。'
    onToast?.(msg)
    try {
      writeOnce()
      return true
    } catch {
      onToast?.('数据仍无法保存，请检查浏览器存储权限或清理空间。')
      return false
    }
  }
}
