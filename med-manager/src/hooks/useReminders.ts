/** 提醒同步 Hook：挂载时重建 Feed 并推送浏览器通知 */

import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import { flushUnreadNotifications } from '../services/notificationService'

export function useReminders() {
  const root = useAppStore((s) => s.root)
  const hydrated = useAppStore((s) => s.hydrated)
  const notifiedKeys = useRef(new Set<string>())

  // 每次 reminders 更新后，对新未读项发通知
  useEffect(() => {
    if (!hydrated) return

    const unread = root.reminders.filter(
      (r) => !r.read && !notifiedKeys.current.has(r.businessKey),
    )
    if (unread.length === 0) return

    for (const item of unread) {
      notifiedKeys.current.add(item.businessKey)
    }

    flushUnreadNotifications(unread, root.settings)
  }, [hydrated, root.reminders, root.settings])
}
