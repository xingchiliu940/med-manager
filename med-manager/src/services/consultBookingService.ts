/** 问诊预约状态机（Q-06）：预约 → 待就诊 → 已完成 */

import type { AppPersistRoot, ConsultationStatus, Prescription } from '../types'
import { formatLocalDate, startOfLocalDay } from '../utils/date'
import { completeConsultation as _completeConsultation } from './consultationService'

/** 预约问诊：设置预约时间，状态转为 booked */
export function bookConsultation(
  root: AppPersistRoot,
  consultationId: string,
  bookedAt: string,
): AppPersistRoot {
  return {
    ...root,
    consultations: root.consultations.map((c) =>
      c.id === consultationId
        ? { ...c, bookedAt, status: 'booked' as ConsultationStatus }
        : c,
    ),
  }
}

/** 自动推进问诊状态（reconcile 调用） */
export function advanceConsultationStatuses(
  root: AppPersistRoot,
  now: Date = new Date(),
): AppPersistRoot {
  const todayStr = formatLocalDate(now)

  let changed = false
  const updated = root.consultations.map((c) => {
    // booked → awaiting_visit: 预约日 00:00 后
    if (c.status === 'booked' && c.bookedAt) {
      const bookDay = formatLocalDate(new Date(c.bookedAt))
      if (bookDay <= todayStr) {
        changed = true
        return { ...c, status: 'awaiting_visit' as ConsultationStatus }
      }
    }

    // awaiting_visit → completed: 预约日 +1 天 24:00 后
    if (c.status === 'awaiting_visit' && c.bookedAt) {
      const bookDay = startOfLocalDay(new Date(c.bookedAt))
      const deadline = new Date(bookDay)
      deadline.setDate(deadline.getDate() + 1)
      if (now >= deadline) {
        changed = true
        return { ...c, status: 'completed' as ConsultationStatus, summary: c.summary || '系统自动完成' }
      }
    }

    return c
  })

  return changed ? { ...root, consultations: updated } : root
}

/** 确认就诊（用户手动点击完成） */
export function confirmConsultation(
  root: AppPersistRoot,
  consultationId: string,
  summary: string,
  prescriptionLines: Prescription['lines'],
  validityDays = 7,
): { ok: true; root: AppPersistRoot } | { ok: false; message: string } {
  const consultation = root.consultations.find((c) => c.id === consultationId)
  if (!consultation) return { ok: false, message: '问诊订单不存在。' }
  if (prescriptionLines.length === 0) return { ok: false, message: '处方明细不能为空。' }

  const { order, prescription } = _completeConsultation(
    consultation,
    summary,
    prescriptionLines,
    validityDays,
  )

  return {
    ok: true,
    root: {
      ...root,
      consultations: root.consultations.map((c) =>
        c.id === consultationId ? order : c,
      ),
      prescriptions: [...root.prescriptions, prescription],
    },
  }
}
