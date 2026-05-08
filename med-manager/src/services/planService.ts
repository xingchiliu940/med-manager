/**
 * 用药计划新增/更新（M-01）与药品主数据、首批次入库
 */

import type { AppPersistRoot, DrugMaster, MedicationPlan, StockBatch } from '../types'
import { DoseRecordStatus, FrequencyType, StockBatchSource } from '../types/enums'
import { buildMergeKeyPreview, doseUnitMatchesStock, findDrugByMergeKey } from './drugService'
import { newId } from '../utils/id'

export interface NewMedicationPlanInput {
  drugName: string
  spec: string
  stockUnit: string
  doseAmount: number
  doseUnit: string
  timesPerDay: number
  timePoints: string[]
  startDate: string
  endDate?: string
  initialStock: number
  lowStockThreshold: number
}

function assertValidPlanInput(input: NewMedicationPlanInput): string | null {
  if (!input.drugName.trim()) return '请填写药品名称。'
  if (!input.spec.trim()) return '请填写规格。'
  if (!input.stockUnit.trim()) return '请填写库存单位。'
  if (input.doseAmount <= 0 || !Number.isFinite(input.doseAmount)) return '每次剂量须为大于 0 的数字。'
  if (!doseUnitMatchesStock(input.doseUnit, input.stockUnit)) {
    return '剂量单位与库存单位不一致，请统一后再保存（首版不做自动换算）。'
  }
  const n = input.timesPerDay
  if (n < 1 || n > 6) return '每日次数须在 1～6 次之间。'
  if (input.timePoints.length !== n) return `请提供与每日次数一致的 ${n} 个时间点（HH:mm）。`
  if (!input.startDate) return '请选择用药开始日期。'
  if (input.endDate && input.endDate < input.startDate) return '结束日不能早于开始日。'
  if (input.initialStock < 0 || !Number.isFinite(input.initialStock)) return '初始库存须为不小于 0 的数字。'
  return null
}

/** 新增用药计划：合并主数据、首批次、计划本体 */
export function addMedicationPlan(root: AppPersistRoot, input: NewMedicationPlanInput): { ok: true; root: AppPersistRoot } | { ok: false; message: string } {
  const err = assertValidPlanInput(input)
  if (err) return { ok: false, message: err }

  const mergeKey = buildMergeKeyPreview(input.drugName, input.spec)
  const existing = findDrugByMergeKey(root.drugMasters, mergeKey)
  const nowIso = new Date().toISOString()

  let drugMasterId: string
  let drugMasters = root.drugMasters
  let stockBatches = root.stockBatches

  if (existing) {
    drugMasterId = existing.id
    drugMasters = drugMasters.map((d) =>
      d.id === existing.id
        ? {
            ...d,
            lowStockThreshold: input.lowStockThreshold,
          }
        : d,
    )
  } else {
    drugMasterId = newId()
    const dm: DrugMaster = {
      id: drugMasterId,
      name: input.drugName.trim(),
      spec: input.spec.trim(),
      stockUnit: input.stockUnit.trim(),
      mergeKey,
      lowStockThreshold: input.lowStockThreshold,
    }
    drugMasters = [...drugMasters, dm]
  }

  if (input.initialStock > 0) {
    const batch: StockBatch = {
      id: newId(),
      drugMasterId,
      quantity: Math.floor(input.initialStock),
      receivedAt: nowIso,
      source: StockBatchSource.Manual,
    }
    stockBatches = [...stockBatches, batch]
  }

  const plan: MedicationPlan = {
    id: newId(),
    drugMasterId,
    doseAmount: input.doseAmount,
    doseUnit: input.doseUnit.trim(),
    frequencyType: FrequencyType.DailyTimes,
    timesPerDay: input.timesPerDay,
    timePoints: input.timePoints.map((t) => t.trim()),
    startDate: input.startDate,
    endDate: input.endDate?.trim() || undefined,
    enabled: true,
    createdAt: nowIso,
  }

  return {
    ok: true,
    root: {
      ...root,
      drugMasters,
      stockBatches,
      medicationPlans: [...root.medicationPlans, plan],
    },
  }
}

export interface PatchMedicationPlanInput {
  doseAmount: number
  doseUnit: string
  timesPerDay: number
  timePoints: string[]
  startDate: string
  endDate?: string
  enabled: boolean
  lowStockThreshold: number
}

/** 更新计划及同主数据的低库存阈值 */
export function patchMedicationPlan(
  root: AppPersistRoot,
  planId: string,
  patch: PatchMedicationPlanInput,
): { ok: true; root: AppPersistRoot } | { ok: false; message: string } {
  const plan = root.medicationPlans.find((p) => p.id === planId)
  if (!plan) return { ok: false, message: '未找到该用药计划。' }

  const drug = root.drugMasters.find((d) => d.id === plan.drugMasterId)
  if (!drug) return { ok: false, message: '药品主数据缺失。' }

  const synthetic: NewMedicationPlanInput = {
    drugName: drug.name,
    spec: drug.spec,
    stockUnit: drug.stockUnit,
    doseAmount: patch.doseAmount,
    doseUnit: patch.doseUnit,
    timesPerDay: patch.timesPerDay,
    timePoints: patch.timePoints,
    startDate: patch.startDate,
    endDate: patch.endDate,
    initialStock: 0,
    lowStockThreshold: patch.lowStockThreshold,
  }
  const err = assertValidPlanInput(synthetic)
  if (err) return { ok: false, message: err }

  const nextPlans = root.medicationPlans.map((p) =>
    p.id === planId
      ? {
          ...p,
          doseAmount: patch.doseAmount,
          doseUnit: patch.doseUnit.trim(),
          timesPerDay: patch.timesPerDay,
          timePoints: patch.timePoints.map((t) => t.trim()),
          startDate: patch.startDate,
          endDate: patch.endDate?.trim() || undefined,
          enabled: patch.enabled,
        }
      : p,
  )

  const drugMasters = root.drugMasters.map((d) =>
    d.id === plan.drugMasterId ? { ...d, lowStockThreshold: patch.lowStockThreshold } : d,
  )

  // 每日次数减少时：移除多余时段的待服记录，保留已服/补服留痕
  const n = patch.timesPerDay
  const doseRecords = root.doseRecords.filter((r) => {
    if (r.planId !== planId) return true
    if (r.slotIndex < n) return true
    return r.status === DoseRecordStatus.Taken || r.status === DoseRecordStatus.Makeup
  })

  return { ok: true, root: { ...root, medicationPlans: nextPlans, drugMasters, doseRecords } }
}

/** 列表快捷启用/停用 */
export function togglePlanEnabled(root: AppPersistRoot, planId: string): AppPersistRoot {
  return {
    ...root,
    medicationPlans: root.medicationPlans.map((p) =>
      p.id === planId ? { ...p, enabled: !p.enabled } : p,
    ),
  }
}
