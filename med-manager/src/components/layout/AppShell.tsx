import { NavLink, Outlet } from 'react-router-dom'

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: '首页', end: true },
  { to: '/consult', label: '问诊' },
  { to: '/plan', label: '计划' },
  { to: '/rx', label: '处方' },
  { to: '/me', label: '我的' },
]

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-app flex-col bg-[var(--color-bg)]">
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-card)]"
        aria-label="主导航"
      >
        <div className="mx-auto flex max-w-app justify-around px-1 pt-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={Boolean(t.end)}
              className={({ isActive }) =>
                `flex min-h-touch min-w-touch flex-1 flex-col items-center justify-center rounded-lg pb-1 text-[13px] ${
                  isActive
                    ? 'font-semibold text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)]'
                }`
              }
            >
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
