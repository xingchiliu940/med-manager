import { create } from 'zustand'
import type { AppPersistRoot } from '../types'
import { loadPersistedRoot, savePersistedRoot } from './persist'

type ToastFn = (message: string) => void

interface AppStore {
  root: AppPersistRoot
  /** 是否已从 localStorage 完成首帧注水 */
  hydrated: boolean
  /** 注入 Toast 展示器（由 UI 层注册） */
  setToastHandler: (fn: ToastFn | null) => void
  /** 启动时调用：加载磁盘快照 */
  hydrate: () => void
  /** 不可变更新并持久化 */
  setRoot: (updater: (prev: AppPersistRoot) => AppPersistRoot) => void
  /** 直接替换（谨慎） */
  replaceRoot: (next: AppPersistRoot) => void
}

let toastHandler: ToastFn | null = null

export const useAppStore = create<AppStore>((set, get) => ({
  // 同步读取，避免首屏空白；hydrate 在挂载时再读一次以对齐多标签「最后写入」
  root: loadPersistedRoot(),
  hydrated: false,

  setToastHandler: (fn) => {
    toastHandler = fn
  },

  hydrate: () => {
    set({ root: loadPersistedRoot(), hydrated: true })
  },

  setRoot: (updater) => {
    const prev = get().root
    const next = updater(prev)
    set({ root: next })
    savePersistedRoot(next, (m) => toastHandler?.(m))
  },

  replaceRoot: (next) => {
    set({ root: next })
    savePersistedRoot(next, (m) => toastHandler?.(m))
  },
}))
