import type { ReactNode } from 'react'

/** 页面容器：640px 居中 + 16px 安全边距 */
export function PageLayout({
  title,
  children,
  footer,
}: {
  title?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-0 max-w-app flex-1 flex-col px-4 pb-28 pt-3">
      {title ? <h1 className="mb-3 text-hero text-[var(--color-text-primary)]">{title}</h1> : null}
      <div className="min-h-0 flex-1">{children}</div>
      {footer}
    </div>
  )
}
