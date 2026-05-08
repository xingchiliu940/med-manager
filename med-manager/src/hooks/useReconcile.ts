import { useEffect } from 'react'
import { useAppStore } from '../store'
import { reconcileAll } from '../services/reconcileService'

/** Q-06 / 处方等定时 reconcile：可见性变化 + 60s 补充轮询 */
export function useReconcileLoop() {
  const hydrated = useAppStore((s) => s.hydrated)
  const setRoot = useAppStore((s) => s.setRoot)

  useEffect(() => {
    if (!hydrated) return

    const tick = () => {
      setRoot((r) => reconcileAll(r))
    }

    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }

    document.addEventListener('visibilitychange', onVis)
    const id = window.setInterval(tick, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(id)
    }
  }, [hydrated, setRoot])
}
