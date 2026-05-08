/** 处方导入：从文本解析处方明细（M-02） */

import type { PrescriptionLine, Prescription, AppPersistRoot, DrugMaster, MedicationPlan, StockBatch } from '../types'
import { PrescriptionSource, StockBatchSource } from '../types/enums'
import { formatLocalDate } from '../utils/date'
import { newId } from '../utils/id'
import { normalizeMergeKey } from './drugService'

/** 解析处方文本：每行一条药，字段用空格/制表符/逗号分隔 */
export function parsePrescriptionText(text: string): PrescriptionLine[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const result: PrescriptionLine[] = []
  for (const line of lines) {
    // 支持空格、制表符、中文逗号、英文逗号分隔
    const parts = line.split(/[\s,，\t]+/).filter(Boolean)
    if (parts.length < 1) continue
    result.push({
      drugName: parts[0] ?? '',
      spec: parts[1] ?? '',
      doseText: parts[2] ?? '',
      frequencyText: parts[3] ?? '',
    })
  }
  return result
}

/** 从导入文本创建处方 + 用药方案 + 初始库存 */
export function importPrescription(
  root: AppPersistRoot,
  text: string,
  validityDays = 7,
): { ok: true; root: AppPersistRoot } | { ok: false; message: string } {
  const lines = parsePrescriptionText(text)
  if (lines.length === 0) return { ok: false, message: '未能解析到处方内容，请检查格式。' }
  if (lines.some((l) => l.drugName.length === 0)) return { ok: false, message: '存在药品名为空的行。' }

  const now = new Date()
  const nowIso = now.toISOString()
  const validUntil = new Date(now)
  validUntil.setDate(validUntil.getDate() + validityDays)

  const prescription: Prescription = {
    id: newId(),
    source: PrescriptionSource.Import,
    issuedAt: nowIso,
    validUntil: validUntil.toISOString(),
    lines,
  }

  const mergedMasters = [...root.drugMasters]
  const newBatches: StockBatch[] = []
  const newPlans: MedicationPlan[] = []
  const today = formatLocalDate(now)

  for (const line of lines) {
    const drug = _ensureDrugMaster(root, line, mergedMasters, root.settings.stockLowDefaultThreshold)
    if (!mergedMasters.some((d) => d.mergeKey === drug.mergeKey)) {
      mergedMasters.push(drug)
    }

    // 创建初始库存（默认 1 批次，数量 1）
    newBatches.push({
      id: newId(),
      drugMasterId: drug.id,
      quantity: 1,
      receivedAt: nowIso,
      source: StockBatchSource.PrescriptionImport,
    })

    // 创建用药计划
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
      sourcePrescriptionId: prescription.id,
    })
  }

  return {
    ok: true,
    root: {
      ...root,
      prescriptions: [...root.prescriptions, prescription],
      drugMasters: mergedMasters,
      stockBatches: [...root.stockBatches, ...newBatches],
      medicationPlans: [...root.medicationPlans, ...newPlans],
    },
  }
}

function _ensureDrugMaster(
  root: AppPersistRoot,
  line: PrescriptionLine,
  existing: DrugMaster[],
  threshold: number,
): DrugMaster {
  const key = normalizeMergeKey(line.drugName, line.spec)
  const found = existing.find((d) => d.mergeKey === key)
  if (found) return found
  const existingRoot = root.drugMasters.find((d) => d.mergeKey === key)
  if (existingRoot) return existingRoot
  return {
    id: newId(),
    name: line.drugName.trim(),
    spec: line.spec.trim(),
    stockUnit: '片',
    mergeKey: key,
    lowStockThreshold: threshold,
  }
}

