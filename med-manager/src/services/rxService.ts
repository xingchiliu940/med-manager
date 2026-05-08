/** 处方业务逻辑：过期判定、R 值计算、购药确认、方案同步 */

import type { AppPersistRoot, DrugMaster, MedicationPlan, Prescription, PrescriptionLine, StockBatch } from '../types'
import { PrescriptionSource, StockBatchSource } from '../types/enums'
import { formatLocalDate, startOfLocalDay } from '../utils/date'
import { newId } from '../utils/id'
import { normalizeMergeKey } from './drugService'

/** 处方是否已过期（validUntil 日期 <= 今日） */
export function isRxExpired(rx: Prescription, now: Date = new Date()): boolean {
  const today = formatLocalDate(now)
  const expiryDate = formatLocalDate(new Date(rx.validUntil))
  return today >= expiryDate
}

/** 剩余完整自然日 R（不含失效日当天） */
export function rxRemainingDays(rx: Prescription, now: Date = new Date()): number {
  const today = startOfLocalDay(now)
  const expiryDay = startOfLocalDay(new Date(rx.validUntil))
  const diffMs = expiryDay.getTime() - today.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

/** 处方来源中文标签 */
export function rxSourceLabel(source: Prescription['source']): string {
  const labels: Record<string, string> = {
    consult_image: '图文问诊',
    consult_renewal: '复诊续方',
    import: '处方导入',
    manual: '手动录入',
  }
  return labels[source] ?? source
}

/** 购药确认：为处方每行创建 StockBatch（FIFO 最早入库） */
export function confirmRxPurchase(
  root: AppPersistRoot,
  rxId: string,
  quantities: number[] = [],
): { ok: true; root: AppPersistRoot } | { ok: false; message: string } {
  const rx = root.prescriptions.find((r) => r.id === rxId)
  if (!rx) return { ok: false, message: '处方不存在。' }
  if (isRxExpired(rx)) return { ok: false, message: '处方已过期，无法购药。' }

  const nowIso = new Date().toISOString()
  const newBatches: StockBatch[] = []

  for (let i = 0; i < rx.lines.length; i++) {
    const line = rx.lines[i]
    const drug = _findOrCreateDrugMaster(root, line)
    const qty = quantities[i] ?? 1
    newBatches.push({
      id: newId(),
      drugMasterId: drug.id,
      quantity: qty,
      receivedAt: nowIso,
      source: StockBatchSource.PurchaseConfirmed,
    })
  }

  const mergedMasters = [...root.drugMasters]
  for (const line of rx.lines) {
    const key = normalizeMergeKey(line.drugName, line.spec)
    if (!mergedMasters.some((d) => d.mergeKey === key)) {
      mergedMasters.push(_findOrCreateDrugMaster(root, line))
    }
  }

  return {
    ok: true,
    root: {
      ...root,
      drugMasters: mergedMasters,
      stockBatches: [...root.stockBatches, ...newBatches],
    },
  }
}

/** 手动录入处方（M-02） */
export function createManualPrescription(
  root: AppPersistRoot,
  lines: PrescriptionLine[],
  validityDays = 7,
): { ok: true; root: AppPersistRoot } | { ok: false; message: string } {
  const validLines = lines.filter((l) => l.drugName.trim().length > 0)
  if (validLines.length === 0) return { ok: false, message: '请至少填写一条药品。' }

  const now = new Date()
  const validUntil = new Date(now)
  validUntil.setDate(validUntil.getDate() + validityDays)

  const prescription: Prescription = {
    id: newId(),
    source: PrescriptionSource.Manual,
    issuedAt: now.toISOString(),
    validUntil: validUntil.toISOString(),
    lines: validLines,
  }

  return {
    ok: true,
    root: {
      ...root,
      prescriptions: [...root.prescriptions, prescription],
    },
  }
}

/** 用处方更新用药方案（P-06） */
export function syncRxToMedicationPlan(
  root: AppPersistRoot,
  rxId: string,
): { ok: true; root: AppPersistRoot } | { ok: false; message: string } {
  const rx = root.prescriptions.find((r) => r.id === rxId)
  if (!rx) return { ok: false, message: '处方不存在。' }
  if (isRxExpired(rx)) return { ok: false, message: '处方已过期。' }

  const nowIso = new Date().toISOString()
  const today = formatLocalDate(new Date())
  const mergedMasters = [...root.drugMasters]
  const newPlans: MedicationPlan[] = []

  for (const line of rx.lines) {
    const drug = _findOrCreateDrugMaster(root, line)
    const key = normalizeMergeKey(line.drugName, line.spec)
    if (!mergedMasters.some((d) => d.mergeKey === key)) {
      mergedMasters.push(drug)
    }
    newPlans.push({
      id: newId(),
      drugMasterId: drug.id,
      doseAmount: 1,
      doseUnit: drug.stockUnit,
      frequencyType: 'daily_times',
      timesPerDay: 1,
      timePoints: ['08:00'],
      startDate: today,
      enabled: true,
      createdAt: nowIso,
      sourcePrescriptionId: rx.id,
    })
  }

  return {
    ok: true,
    root: {
      ...root,
      drugMasters: mergedMasters,
      medicationPlans: [...root.medicationPlans, ...newPlans],
      prescriptions: root.prescriptions.map((r) =>
        r.id === rxId ? { ...r, usedForPlan: true } : r,
      ),
    },
  }
}


function _findOrCreateDrugMaster(
  root: AppPersistRoot,
  line: { drugName: string; spec: string },
): DrugMaster {
  const key = normalizeMergeKey(line.drugName, line.spec)
  const existing = root.drugMasters.find((d) => d.mergeKey === key)
  if (existing) return existing
  return {
    id: newId(),
    name: line.drugName.trim(),
    spec: line.spec.trim(),
    stockUnit: '片',
    mergeKey: key,
    lowStockThreshold: root.settings.stockLowDefaultThreshold,
  }
}
