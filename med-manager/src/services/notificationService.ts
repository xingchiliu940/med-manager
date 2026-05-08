/** 浏览器通知 API 封装（R-02）与勿扰模式 */

import type { ReminderFeedItem } from '../types'

/** 请求通知权限 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.requestPermission()
}

/** 是否可以发送通知 */
export function canSendNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

/** 当前时间是否处于勿扰窗口 */
export function isWithinDndWindow(
  dndStart?: string,
  dndEnd?: string,
  now: Date = new Date(),
): boolean {
  if (!dndStart || !dndEnd) return false

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = dndStart.split(':').map(Number)
  const [endH, endM] = dndEnd.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes
  }
  // 跨夜（如 22:00 ~ 07:00）
  return nowMinutes >= startMinutes || nowMinutes <= endMinutes
}

/** 为单个提醒发送浏览器通知 */
export function sendReminderNotification(
  item: ReminderFeedItem,
  settings: { browserNotifyEnabled: boolean; doNotDisturbStart?: string; doNotDisturbEnd?: string },
): void {
  if (!settings.browserNotifyEnabled) return
  if (!canSendNotifications()) return
  if (isWithinDndWindow(settings.doNotDisturbStart, settings.doNotDisturbEnd)) return

  try {
    new Notification(item.title, {
      body: item.body,
      tag: item.businessKey,
      requireInteraction: false,
    })
  } catch {
    // 静默失败——通知可能被权限阻止
  }
}

/** 批量发送所有未读提醒的通知 */
export function flushUnreadNotifications(
  reminders: ReminderFeedItem[],
  settings: { browserNotifyEnabled: boolean; doNotDisturbStart?: string; doNotDisturbEnd?: string },
): void {
  for (const item of reminders) {
    if (!item.read) {
      sendReminderNotification(item, settings)
    }
  }
}
