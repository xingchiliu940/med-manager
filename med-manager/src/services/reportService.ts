/** 依从性统计报表（U-04 + 报表细化） */

import type { AppPersistRoot } from '../types'
import { DoseRecordStatus } from '../types/enums'
import { formatLocalDate, startOfLocalDay } from '../utils/date'
import { adherenceNumeratorForDay, expectedDoseCountForDay } from './doseService'

export interface AdherenceDayData {
  date: string
  numerator: number
  denominator: number
  ratio: number
}

export interface AdherenceWeekData {
  weekLabel: string
  startDate: string
  endDate: string
  numerator: number
  denominator: number
  ratio: number
  perfectDays: number
  missedDays: number
}

export interface AdherenceMonthData {
  monthLabel: string
  year: number
  month: number
  numerator: number
  denominator: number
  ratio: number
  perfectDays: number
  missedDays: number
}

export interface DrugAdherenceData {
  drugId: string
  drugName: string
  spec: string
  numerator: number
  denominator: number
  ratio: number
}

/** 最近 N 天依从数据 */
export function getAdherenceRange(
  root: AppPersistRoot,
  days: number,
  now: Date = new Date(),
): AdherenceDayData[] {
  const result: AdherenceDayData[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = formatLocalDate(d)
    const denom = expectedDoseCountForDay(root, dateStr)
    const numer = adherenceNumeratorForDay(root, dateStr)
    result.push({
      date: dateStr,
      numerator: numer,
      denominator: denom,
      ratio: denom === 0 ? 0 : numer / denom,
    })
  }
  return result
}

/** 总依从率 */
export function overallAdherenceRate(data: { numerator: number; denominator: number }[]): number {
  const totalNumer = data.reduce((s, d) => s + d.numerator, 0)
  const totalDenom = data.reduce((s, d) => s + d.denominator, 0)
  return totalDenom === 0 ? 0 : totalNumer / totalDenom
}

/** 连续全勤天数（从今天往前数） */
export function adherenceStreak(root: AppPersistRoot, now: Date = new Date()): number {
  let streak = 0
  const d = new Date(now)
  while (true) {
    const dateStr = formatLocalDate(d)
    const denom = expectedDoseCountForDay(root, dateStr)
    if (denom === 0) break
    const numer = adherenceNumeratorForDay(root, dateStr)
    if (numer < denom) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/** 最近 N 周依从汇总 */
export function getWeeklyAdherence(
  root: AppPersistRoot,
  weeks: number,
  now: Date = new Date(),
): AdherenceWeekData[] {
  const today = startOfLocalDay(now)
  const result: AdherenceWeekData[] = []

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() - w * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 6)

    let totalNumer = 0
    let totalDenom = 0
    let perfectDays = 0
    let missedDays = 0

    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + d)
      const dateStr = formatLocalDate(day)
      const denom = expectedDoseCountForDay(root, dateStr)
      const numer = adherenceNumeratorForDay(root, dateStr)
      totalNumer += numer
      totalDenom += denom
      if (denom > 0) {
        if (numer >= denom) perfectDays++
        else missedDays++
      }
    }

    result.push({
      weekLabel: `第${weeks - w}周`,
      startDate: formatLocalDate(weekStart),
      endDate: formatLocalDate(weekEnd),
      numerator: totalNumer,
      denominator: totalDenom,
      ratio: totalDenom === 0 ? 0 : totalNumer / totalDenom,
      perfectDays,
      missedDays,
    })
  }

  return result
}

/** 最近 N 月依从汇总 */
export function getMonthlyAdherence(
  root: AppPersistRoot,
  months: number,
  now: Date = new Date(),
): AdherenceMonthData[] {
  const today = startOfLocalDay(now)
  const result: AdherenceMonthData[] = []

  for (let m = months - 1; m >= 0; m--) {
    const ref = new Date(today.getFullYear(), today.getMonth() - m, 1)
    const year = ref.getFullYear()
    const month = ref.getMonth() + 1
    const daysInMonth = new Date(year, month, 0).getDate()

    let totalNumer = 0
    let totalDenom = 0
    let perfectDays = 0
    let missedDays = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const denom = expectedDoseCountForDay(root, dateStr)
      const numer = adherenceNumeratorForDay(root, dateStr)
      totalNumer += numer
      totalDenom += denom
      if (denom > 0) {
        if (numer >= denom) perfectDays++
        else missedDays++
      }
    }

    result.push({
      monthLabel: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      numerator: totalNumer,
      denominator: totalDenom,
      ratio: totalDenom === 0 ? 0 : totalNumer / totalDenom,
      perfectDays,
      missedDays,
    })
  }

  return result
}

/** 按药品拆分依从性 */
export function getDrugAdherenceBreakdown(
  root: AppPersistRoot,
  days: number,
  now: Date = new Date(),
): DrugAdherenceData[] {
  const result: Map<string, { numerator: number; denominator: number }> = new Map()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = formatLocalDate(d)

    for (const record of root.doseRecords) {
      if (record.planDate !== dateStr) continue
      // Find the plan and its drugMaster
      const plan = root.medicationPlans.find((p) => p.id === record.planId)
      if (!plan) continue
      const drug = root.drugMasters.find((dm) => dm.id === plan.drugMasterId)
      if (!drug) continue

      const key = drug.id
      const entry = result.get(key) ?? { numerator: 0, denominator: 0 }
      entry.denominator += 1
      if (record.status === DoseRecordStatus.Taken || record.status === DoseRecordStatus.Makeup) {
        entry.numerator += 1
      }
      result.set(key, entry)
    }
  }

  const drugs: DrugAdherenceData[] = []
  for (const [drugId, stats] of result) {
    const drug = root.drugMasters.find((d) => d.id === drugId)
    if (!drug) continue
    drugs.push({
      drugId,
      drugName: drug.name,
      spec: drug.spec,
      numerator: stats.numerator,
      denominator: stats.denominator,
      ratio: stats.denominator === 0 ? 0 : stats.numerator / stats.denominator,
    })
  }

  return drugs.sort((a, b) => b.denominator - a.denominator)
}
