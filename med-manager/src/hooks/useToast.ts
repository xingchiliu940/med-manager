import { useContext } from 'react'
import { ToastContext } from '../components/ui/toastContext'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 须在 ToastProvider 内使用')
  return ctx
}
