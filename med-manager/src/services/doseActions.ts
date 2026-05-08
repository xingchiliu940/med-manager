/**
 * 服药打卡写回：库存 FIFO + 依从归属日（PRD 8.3）
 */

import type { AppPersistRoot, DoseRecord } from '../types'
import { DoseRecordStatus } from '../types/enums'
import { formatLocalDate } from '../utils/date'
import { doseUnitMatchesStock } from './drugService'
import { deductStockFifo, getStockTotal } from './stockService'

type Result = { ok: true; root: AppPersistRoot } | { ok: false; root: AppPersistRoot; message: string }

function findRecord(root: AppPersistRoot, doseId: string): DoseRecord | undefined {
  return root.doseRecords.find((r) => r.id === doseId)
}

function replaceRecord(root: AppPersistRoot, next: DoseRecord): AppPersistRoot {
  return {
    ...root,
    doseRecords: root.doseRecords.map((r) => (r.id === next.id ? next : r)),
  }
}

/** 标记已服：仅适用于计划日=操作日且当前为待服 */
export function markDoseTaken(root: AppPersistRoot, doseId: string): Result {
  const record = findRecord(root, doseId)
  if (!record) return { ok: false, root, message: '未找到该应服记录。' }
  if (record.status !== DoseRecordStatus.Due) return { ok: false, root, message: '当前状态不可标记为已服。' }

  const plan = root.medicationPlans.find((p) => p.id === record.planId)
  if (!plan) return { ok: false, root, message: '用药计划不存在。' }
  const drug = root.drugMasters.find((d) => d.id === plan.drugMasterId)
  if (!drug) return { ok: false, root, message: '药品主数据不存在。' }

  const now = new Date()
  const operationDay = formatLocalDate(now)
  if (record.planDate !== operationDay) {
    return { ok: false, root, message: '非今日待服请使用「补服」入口。' }
  }

  if (!doseUnitMatchesStock(plan.doseUnit, drug.stockUnit)) {
    return { ok: false, root, message: '剂量单位与库存单位不一致，无法扣减库存。' }
  }

  const need = plan.doseAmount
  if (getStockTotal(root, drug.id) < need) {
    return { ok: false, root, message: '库存不足，无法标记已服。' }
  }

  const deducted = deductStockFifo(root, drug.id, need)
  if (!deducted.ok) return { ok: false, root, message: '库存不足，无法标记已服。' }

  const nextRecord: DoseRecord = {
    ...record,
    status: DoseRecordStatus.Taken,
    operatedAt: now.toISOString(),
    adherenceDate: record.planDate,
  }

  return { ok: true, root: replaceRecord(deducted.root, nextRecord) }
}

/** 标记漏服：不扣库存 */
export function markDoseMissed(root: AppPersistRoot, doseId: string): Result {
  const record = findRecord(root, doseId)
  if (!record) return { ok: false, root, message: '未找到该应服记录。' }
  if (record.status !== DoseRecordStatus.Due) return { ok: false, root, message: '仅待服可标记为漏服。' }

  const now = new Date()
  const operationDay = formatLocalDate(now)
  if (record.planDate !== operationDay) {
    return { ok: false, root, message: '仅当日待服可标记漏服；历史请用补服。' }
  }

  const nextRecord: DoseRecord = {
    ...record,
    status: DoseRecordStatus.Missed,
    operatedAt: now.toISOString(),
  }
  return { ok: true, root: replaceRecord(root, nextRecord) }
}

/** 补服：已漏服或历史待服（滚转前）；依从归属按 PRD 8.3.1 简化 */
export function markDoseMakeup(root: AppPersistRoot, doseId: string): Result {
  const record = findRecord(root, doseId)
  if (!record) return { ok: false, root, message: '未找到该应服记录。' }
  if (record.status !== DoseRecordStatus.Missed && record.status !== DoseRecordStatus.Due) {
    return { ok: false, root, message: '当前状态不可补服。' }
  }

  const plan = root.medicationPlans.find((p) => p.id === record.planId)
  if (!plan) return { ok: false, root, message: '用药计划不存在。' }
  const drug = root.drugMasters.find((d) => d.id === plan.drugMasterId)
  if (!drug) return { ok: false, root, message: '药品主数据不存在。' }

  const now = new Date()
  const operationDay = formatLocalDate(now)

  if (record.status === DoseRecordStatus.Due && record.planDate >= operationDay) {
    return { ok: false, root, message: '今日待服请使用「已服」或「漏服」。' }
  }

  if (!doseUnitMatchesStock(plan.doseUnit, drug.stockUnit)) {
    return { ok: false, root, message: '剂量单位与库存单位不一致，无法扣减库存。' }
  }

  const need = plan.doseAmount
  if (getStockTotal(root, drug.id) < need) {
    return { ok: false, root, message: '库存不足，无法补服。' }
  }

  const deducted = deductStockFifo(root, drug.id, need)
  if (!deducted.ok) return { ok: false, root, message: '库存不足，无法补服。' }

  // 同日补服：分子归属计划日；跨日：归属操作日
  const adherenceDate = operationDay === record.planDate ? record.planDate : operationDay

  const nextRecord: DoseRecord = {
    ...record,
    status: DoseRecordStatus.Makeup,
    operatedAt: now.toISOString(),
    adherenceDate,
  }

  return { ok: true, root: replaceRecord(deducted.root, nextRecord) }
}
