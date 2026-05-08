import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAppStore } from '../../store'
import { ToastContext } from './toastContext'

/** 极简底部 Toast，满足持久化失败等横切提示 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const setToastHandler = useAppStore((s) => s.setToastHandler)

  const show = useCallback((message: string) => {
    setMsg(message)
    window.setTimeout(() => setMsg(null), 3200)
  }, [])

  useEffect(() => {
    setToastHandler(show)
    return () => setToastHandler(null)
  }, [setToastHandler, show])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {msg ? (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 max-w-app -translate-x-1/2 rounded-xl bg-[var(--color-text-primary)] px-4 py-3 text-center text-[15px] text-white shadow-lg"
        >
          {msg}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}
