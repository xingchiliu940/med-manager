/**
 * 应服实例懒生成、幂等与当日视图聚合（CLAUDE 1 + PRD 8.4）
 */

import type { AppPersistRoot, DoseRecord, MedicationPlan } from '../types'
import { DoseRecordStatus } from '../types/enums'
import { isValidHm, parseHmToMinutes } from '../utils/time'

/** 幂等主键：同一计划+业务日+时段仅一条 */
export function stableDoseId(planId: string, planDate: string, slotIndex: number): string {
  return `dose:${planId}:${planDate}:${slotIndex}`
}

/** 当日启用且在疗程内的计划（YYYY-MM-DD 字符串比较） */
export function listPlansForDay(root: AppPersistRoot, localDate: string): MedicationPlan[] {
  return root.medicationPlans.filter((p) => {
    if (!p.enabled) return false
    if (p.startDate > localDate) return false
    if (p.endDate && p.endDate < localDate) return false
    return true
  })
}

export function doseRecordsForDay(root: AppPersistRoot, localDate: string): DoseRecord[] {
  return root.doseRecords.filter((r) => r.planDate === localDate)
}

/** 默认每日 N 次时间点（MVP） */
export function defaultTimePointsForDaily(n: number): string[] {
  const presets: Record<number, string[]> = {
    1: ['08:00'],
    2: ['08:00', '20:00'],
    3: ['08:00', '13:00', '20:00'],
    4: ['08:00', '12:00', '18:00', '22:00'],
    5: ['07:00', '10:00', '13:00', '17:00', '21:00'],
    6: ['07:00', '09:30', '12:00', '15:00', '18:00', '21:00'],
  }
  if (presets[n]) return [...presets[n]]
  const out: string[] = []
  for (let i = 0; i < n; i += 1) {
    const hour = 7 + Math.floor((i * 14) / Math.max(1, n - 1 || 1))
    out.push(`${String(Math.min(21, hour)).padStart(2, '0')}:00`)
  }
  return out
}

/** 渲染某日前：为当日所有应服时段懒创建 Due 记录（不重复） */
export function ensureDoseRecordsForDate(root: AppPersistRoot, date: string): AppPersistRoot {
  const plans = listPlansForDay(root, date)
  const keys = new Set(root.doseRecords.map((r) => `${r.planId}|${r.planDate}|${r.slotIndex}`))
  const toAdd: DoseRecord[] = []

  for (const p of plans) {
    const n = Math.min(6, Math.max(1, p.timesPerDay))
    for (let i = 0; i < n; i += 1) {
      const key = `${p.id}|${date}|${i}`
      if (keys.has(key)) continue
      keys.add(key)
      toAdd.push({
        id: stableDoseId(p.id, date, i),
        planId: p.id,
        planDate: date,
        slotIndex: i,
        status: DoseRecordStatus.Due,
      })
    }
  }

  if (toAdd.length === 0) return root
  return { ...root, doseRecords: [...root.doseRecords, ...toAdd] }
}

/** 已过业务日且仍为待服的，自动记为漏服 */
export function rollMissedDueRecords(root: AppPersistRoot, todayStr: string): AppPersistRoot {
  return {
    ...root,
    doseRecords: root.doseRecords.map((r) => {
      if (r.status === DoseRecordStatus.Due && r.planDate < todayStr) {
        return { ...r, status: DoseRecordStatus.Missed }
      }
      return r
    }),
  }
}

/** 疗程结束日次日 0 点起自动停用（PRD M-01） */
export function applyTherapyAutoDisablePlans(root: AppPersistRoot, todayStr: string): AppPersistRoot {
  return {
    ...root,
    medicationPlans: root.medicationPlans.map((p) => {
      if (!p.enabled) return p
      if (p.endDate && p.endDate < todayStr) return { ...p, enabled: false }
      return p
    }),
  }
}

/** 当日应服总次数（分母，与 PRD 8.3 H-02 对齐） */
export function expectedDoseCountForDay(root: AppPersistRoot, localDate: string): number {
  return listPlansForDay(root, localDate).reduce((s, p) => s + Math.min(6, Math.max(1, p.timesPerDay)), 0)
}

/** 当日依从完成次数（分子）：已服归属计划日；补服按 adherenceDate */
export function adherenceNumeratorForDay(root: AppPersistRoot, localDate: string): number {
  return root.doseRecords.filter((r) => {
    if (r.status === DoseRecordStatus.Taken) {
      const ad = r.adherenceDate ?? r.planDate
      return ad === localDate
    }
    if (r.status === DoseRecordStatus.Makeup) {
      const ad = r.adherenceDate ?? r.planDate
      return ad === localDate
    }
    return false
  }).length
}

export interface DoseSlotRow {
  record: DoseRecord
  plan: MedicationPlan
  drugName: string
  scheduleTime: string
}

/** 某日清单行：按时间排序 */
export function listDoseSlotRowsForDay(root: AppPersistRoot, localDate: string): DoseSlotRow[] {
  const plans = listPlansForDay(root, localDate)
  const planMap = new Map(plans.map((p) => [p.id, p]))
  const drugMap = new Map(root.drugMasters.map((d) => [d.id, d]))
  const records = doseRecordsForDay(root, localDate).filter((r) => planMap.has(r.planId))

  const rows: DoseSlotRow[] = records.map((record) => {
    const plan = planMap.get(record.planId)!
    const drug = drugMap.get(plan.drugMasterId)
    const scheduleTime = plan.timePoints[record.slotIndex] ?? '--:--'
    return {
      record,
      plan,
      drugName: drug?.name ?? '未知药品',
      scheduleTime,
    }
  })

  const orderKey = (t: string) => (isValidHm(t) ? parseHmToMinutes(t) : 9999)
  rows.sort((a, b) => orderKey(a.scheduleTime) - orderKey(b.scheduleTime))
  return rows
}
