/** 挂载时二次 hydrate；冷启动跑一次 reconcile（含当日应服懒生成与提醒重建） */

import { useEffect } from 'react'
import { reconcileAll } from '../services/reconcileService'
import { useAppStore } from '../store'
import { useReconcileLoop } from './useReconcile'
import { useReminders } from './useReminders'

export function useBootstrap() {
  const hydrate = useAppStore((s) => s.hydrate)
  const setRoot = useAppStore((s) => s.setRoot)
  useReconcileLoop()

  useEffect(() => {
    hydrate()
    setRoot((r) => reconcileAll(r))
  }, [hydrate, setRoot])

  useReminders()
}
