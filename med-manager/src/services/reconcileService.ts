/** 全局 reconcile：疗程自动停用、应服滚漏服、当日应服懒生成、问诊状态推进、提醒 Feed 重建 */

import type { AppPersistRoot } from '../types'
import { formatLocalDate } from '../utils/date'
import {
  applyTherapyAutoDisablePlans,
  ensureDoseRecordsForDate,
  rollMissedDueRecords,
} from './doseService'
import { advanceConsultationStatuses } from './consultBookingService'
import { mergeReminders, rebuildReminderFeed } from './reminderService'

export function reconcileAll(root: AppPersistRoot, now: Date = new Date()): AppPersistRoot {
  const todayStr = formatLocalDate(now)
  let next = root
  next = applyTherapyAutoDisablePlans(next, todayStr)
  next = rollMissedDueRecords(next, todayStr)
  next = ensureDoseRecordsForDate(next, todayStr)

  // Q-06 问诊状态自动推进
  next = advanceConsultationStatuses(next, now)

  // 重建提醒 Feed
  const fresh = rebuildReminderFeed(next, now)
  next = mergeReminders(next, fresh)

  return next
}
