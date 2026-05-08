import { createContext } from 'react'

export type ToastCtx = { show: (message: string) => void }

export const ToastContext = createContext<ToastCtx | null>(null)
