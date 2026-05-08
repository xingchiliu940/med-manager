/** 提醒生成、合并、R/U 钳制算法 */

import type { AppPersistRoot, Prescription, ReminderFeedItem } from '../types'
import { formatLocalDate } from '../utils/date'
import { newId } from '../utils/id'
import { isRxExpired, rxRemainingDays } from './rxService'

/** 从当前状态重建提醒 Feed */
export function rebuildReminderFeed(
  root: AppPersistRoot,
  now: Date = new Date(),
): ReminderFeedItem[] {
  const items: ReminderFeedItem[] = []
  const today = formatLocalDate(now)
  const U = root.settings.rxExpiringDays
  const nowIso = now.toISOString()

  // 1. 库存不足
  for (const drug of root.drugMasters) {
    const qty = root.stockBatches
      .filter((b) => b.drugMasterId === drug.id)
      .reduce((s, b) => s + b.quantity, 0)
    if (qty <= drug.lowStockThreshold) {
      items.push({
        id: newId(),
        businessKey: `stock_low:${drug.id}`,
        type: 'stock_low',
        title: '库存不足',
        body: `${drug.name}（${drug.spec}）剩余 ${qty} ${drug.stockUnit}，请及时购药。`,
        read: _isRead(root, `stock_low:${drug.id}`),
        createdAt: nowIso,
        triggeredAt: nowIso,
        relatedId: drug.id,
      })
    }
  }

  // 2. 处方临期/过期 + R/U 钳制续方
  for (const rx of root.prescriptions) {
    const R = rxRemainingDays(rx, now)

    if (isRxExpired(rx, now)) {
      // R=0：过期链路，不发续方
      items.push({
        id: newId(),
        businessKey: `rx_expired:${rx.id}`,
        type: 'rx_expired',
        title: '处方已过期',
        body: `处方（${_rxSummary(rx)}）已过期，无法继续使用。`,
        read: _isRead(root, `rx_expired:${rx.id}`),
        createdAt: nowIso,
        triggeredAt: nowIso,
        relatedId: rx.id,
      })
    } else if (R <= U) {
      // U >= R > 0：不单独发续方，合并进临期窗
      items.push({
        id: newId(),
        businessKey: `rx_expiring:${rx.id}`,
        type: 'rx_expiring',
        title: '处方临期',
        body: `处方（${_rxSummary(rx)}）将在 ${R} 天后过期，请及时复诊或购药。`,
        read: _isRead(root, `rx_expiring:${rx.id}`),
        createdAt: nowIso,
        triggeredAt: nowIso,
        relatedId: rx.id,
      })
    } else if (U < R) {
      // U < R：独立续方提醒，在「失效前 U 天」窗口内触发
      // 当 R - U <= 1 时认为进入了提醒窗口（允许一定触发精度）
      if (R - U <= 1) {
        items.push({
          id: newId(),
          businessKey: `renewal:${rx.id}`,
          type: 'renewal',
          title: '续方提醒',
          body: `处方（${_rxSummary(rx)}）还有 ${R} 天过期，建议提前续方。`,
          read: _isRead(root, `renewal:${rx.id}`),
          createdAt: nowIso,
          triggeredAt: nowIso,
          relatedId: rx.id,
        })
      }
    }
  }

  // 3. 复诊随访
  for (const fu of root.followUps) {
    const fuDate = formatLocalDate(new Date(fu.at))
    if (fuDate <= today) {
      const key = `follow_up:${fu.id}`
      items.push({
        id: newId(),
        businessKey: key,
        type: 'follow_up',
        title: fu.title,
        body: fu.doctorName ? `医生：${fu.doctorName}` : '请按时复诊',
        read: _isRead(root, key),
        createdAt: nowIso,
        triggeredAt: nowIso,
        relatedId: fu.linkedConsultationId,
      })
    }
  }

  // 4. 问诊预约
  for (const c of root.consultations) {
    if (c.status === 'booked' && c.bookedAt) {
      const bookDate = formatLocalDate(new Date(c.bookedAt))
      if (bookDate <= today) {
        const key = `consult_booked:${c.id}`
        items.push({
          id: newId(),
          businessKey: key,
          type: 'consult_booked',
          title: '问诊预约',
          body: '您已成功预约问诊，请按时参加。',
          read: _isRead(root, key),
          createdAt: nowIso,
          triggeredAt: nowIso,
          relatedId: c.id,
        })
      }
    }
  }

  items.sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt))
  return items
}

/** 合并新提醒到持久化状态，保留已有 read 状态 */
export function mergeReminders(
  root: AppPersistRoot,
  fresh: ReminderFeedItem[],
): AppPersistRoot {
  const existingMap = new Map(root.reminders.map((r) => [r.businessKey, r]))

  const merged = fresh.map((item) => {
    const existing = existingMap.get(item.businessKey)
    if (existing) {
      return { ...item, read: existing.read }
    }
    return item
  })

  return { ...root, reminders: merged }
}

/** 标记单个提醒为已读 */
export function markReminderRead(
  root: AppPersistRoot,
  businessKey: string,
): AppPersistRoot {
  return {
    ...root,
    reminders: root.reminders.map((r) =>
      r.businessKey === businessKey ? { ...r, read: true } : r,
    ),
  }
}

/** 全部标记为已读 */
export function markAllRemindersRead(root: AppPersistRoot): AppPersistRoot {
  return {
    ...root,
    reminders: root.reminders.map((r) => ({ ...r, read: true })),
  }
}

/** R/U 钳制：返回处方提醒策略 */
export function computeRxReminderStrategy(
  rx: Prescription,
  rxExpiringDays: number,
  now: Date = new Date(),
): 'expired' | 'merged' | 'independent' | 'none' {
  const R = rxRemainingDays(rx, now)
  const U = rxExpiringDays

  if (R === 0) return 'expired'
  if (U >= R) return 'merged'
  if (U < R) return 'independent'
  return 'none'
}

function _isRead(root: AppPersistRoot, businessKey: string): boolean {
  return root.reminders.find((r) => r.businessKey === businessKey)?.read ?? false
}

function _rxSummary(rx: Prescription): string {
  return rx.lines.length > 0 ? rx.lines[0].drugName : '未知药品'
}
