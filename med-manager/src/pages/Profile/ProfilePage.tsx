import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageLayout } from '../../components/layout/PageLayout'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../hooks/useToast'
import { useAppStore } from '../../store'
import { DEPARTMENTS } from '../../constants/departments'
import { rxSourceLabel } from '../../services/rxService'
import { getAdherenceRange, overallAdherenceRate, adherenceStreak, getWeeklyAdherence, getMonthlyAdherence, getDrugAdherenceBreakdown } from '../../services/reportService'
import { markAllRemindersRead, markReminderRead } from '../../services/reminderService'
import { reconcileAll } from '../../services/reconcileService'
import { requestNotificationPermission } from '../../services/notificationService'

type ProfileView = 'main' | 'edit' | 'archive' | 'settings' | 'reports' | 'inbox'

export function ProfilePage() {
  const [view, setView] = useState<ProfileView>('main')

  if (view === 'edit') return <ProfileEditView onBack={() => setView('main')} />
  if (view === 'archive') return <ArchiveView onBack={() => setView('main')} />
  if (view === 'settings') return <SettingsView onBack={() => setView('main')} />
  if (view === 'reports') return <ReportsView onBack={() => setView('main')} />
  if (view === 'inbox') return <InboxView onBack={() => setView('main')} />

  return <MainView onNavigate={setView} />
}

/** 主页：入口卡片列表 */
function MainView({ onNavigate }: { onNavigate: (v: ProfileView) => void }) {
  const root = useAppStore((s) => s.root)
  const profile = root.userProfile
  const unreadCount = root.reminders.filter((r) => !r.read).length

  return (
    <PageLayout title="个人中心">
      {/* 个人信息 */}
      <section className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="text-card-title text-[var(--color-text-primary)]">个人信息</h2>
        <div className="mt-2 space-y-1 text-body text-[var(--color-text-primary)]">
          {profile.name && <p>姓名：{profile.name}</p>}
          {profile.age > 0 && <p>年龄：{profile.age} 岁</p>}
          {profile.gender && profile.gender !== '其他' && <p>性别：{profile.gender}</p>}
          {profile.phone && <p>手机号：{profile.phone}</p>}
          {profile.medicalRecord && <p className="text-[var(--color-text-secondary)]">病历：{profile.medicalRecord}</p>}
          {!profile.name && <p className="text-[var(--color-text-secondary)]">尚未填写个人信息</p>}
        </div>
        <Button variant="ghost" className="mt-3" onClick={() => onNavigate('edit')}>
          编辑
        </Button>
      </section>

      {/* 功能入口 */}
      <div className="space-y-3">
        <NavCard label="归档与历史" desc="查看问诊、处方、用药计划记录" onClick={() => onNavigate('archive')} />
        <NavCard label="提醒收件箱" desc={unreadCount > 0 ? `${unreadCount} 条未读` : '暂无新提醒'} badge={unreadCount} onClick={() => onNavigate('inbox')} />
        <NavCard label="依从性报表" desc="查看用药依从统计" onClick={() => onNavigate('reports')} />
        <NavCard label="应用设置" desc="库存阈值、通知、勿扰模式" onClick={() => onNavigate('settings')} />
      </div>
    </PageLayout>
  )
}

function NavCard({ label, desc, badge, onClick }: { label: string; desc: string; badge?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex w-full min-h-[72px] items-center justify-between rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-left hover:bg-[var(--color-primary-light)]"
      onClick={onClick}
    >
      <div>
        <p className="text-card-title text-[var(--color-text-primary)]">{label}</p>
        <p className="text-caption text-[var(--color-text-secondary)]">{desc}</p>
      </div>
      <div className="flex items-center gap-2">
        {badge && badge > 0 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-error)] text-caption text-white">{badge}</span>
        )}
        <span className="text-[var(--color-text-secondary)]">→</span>
      </div>
    </button>
  )
}

/** U-01 个人信息编辑 */
function ProfileEditView({ onBack }: { onBack: () => void }) {
  const root = useAppStore((s) => s.root)
  const setRoot = useAppStore((s) => s.setRoot)
  const { show: toast } = useToast()
  const [name, setName] = useState(root.userProfile.name)
  const [age, setAge] = useState(root.userProfile.age?.toString() ?? '')
  const [gender, setGender] = useState<'男' | '女' | '其他'>(root.userProfile.gender ?? '其他')
  const [phone, setPhone] = useState(root.userProfile.phone ?? '')
  const [medicalRecord, setMedicalRecord] = useState(root.userProfile.medicalRecord ?? '')

  const handleSave = useCallback(() => {
    const ageNum = age.trim() ? parseInt(age, 10) : 0
    if (ageNum < 0 || ageNum > 150) {
      toast('年龄不合法')
      return
    }
    setRoot((prev) => ({
      ...prev,
      userProfile: {
        name: name.trim(),
        age: ageNum,
        gender,
        phone: phone.trim(),
        medicalRecord: medicalRecord.trim(),
      },
    }))
    toast('个人信息已保存')
    onBack()
  }, [name, age, gender, phone, medicalRecord, setRoot, toast, onBack])

  return (
    <PageLayout title="编辑个人信息">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" onClick={onBack}>← 返回</Button>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-body text-[var(--color-text-primary)]">姓名</span>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入姓名"
          />
        </label>
        <label className="block">
          <span className="text-body text-[var(--color-text-primary)]">年龄</span>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="请输入年龄"
            type="number"
          />
        </label>
        <label className="block">
          <span className="text-body text-[var(--color-text-primary)]">性别</span>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
            value={gender}
            onChange={(e) => setGender(e.target.value as '男' | '女' | '其他')}
          >
            <option value="男">男</option>
            <option value="女">女</option>
            <option value="其他">其他</option>
          </select>
        </label>
        <label className="block">
          <span className="text-body text-[var(--color-text-primary)]">手机号</span>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="请输入手机号"
            type="tel"
          />
        </label>
        <label className="block">
          <span className="text-body text-[var(--color-text-primary)]">病历</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
            rows={4}
            value={medicalRecord}
            onChange={(e) => setMedicalRecord(e.target.value)}
            placeholder="请输入病历信息"
          />
        </label>
      </div>

      <Button variant="primary" className="mt-6 w-full" onClick={handleSave}>
        保存
      </Button>
    </PageLayout>
  )
}

/** U-02 归档与历史 */
function ArchiveView({ onBack }: { onBack: () => void }) {
  const root = useAppStore((s) => s.root)
  const [tab, setTab] = useState<'consultations' | 'prescriptions' | 'plans'>('consultations')

  const consultations = useMemo(
    () => [...root.consultations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [root.consultations],
  )
  const prescriptions = useMemo(
    () => [...root.prescriptions].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    [root.prescriptions],
  )
  const plans = useMemo(
    () => [...root.medicationPlans].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [root.medicationPlans],
  )

  return (
    <PageLayout title="归档与历史">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" onClick={onBack}>← 返回</Button>
      </div>

      {/* Tab 切换 */}
      <div className="mb-4 flex gap-2">
        {([['consultations', '问诊'], ['prescriptions', '处方'], ['plans', '用药计划']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-body ${tab === key ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'consultations' && (
        consultations.length === 0 ? (
          <p className="text-body text-[var(--color-text-secondary)]">暂无问诊记录。</p>
        ) : (
          <ul className="space-y-3">
            {consultations.map((c) => {
              const dept = DEPARTMENTS.find((d) => d.id === c.departmentId)
              return (
                <li key={c.id} className="min-h-[72px] rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
                  <p className="text-card-title text-[var(--color-text-primary)]">{dept?.name ?? '未知科室'}</p>
                  <p className="text-caption text-[var(--color-text-secondary)]">
                    时间：{new Date(c.createdAt).toLocaleString('zh-CN')} · 状态：{c.status}
                  </p>
                  {c.summary && <p className="mt-1 text-caption text-[var(--color-text-secondary)]">{c.summary}</p>}
                </li>
              )
            })}
          </ul>
        )
      )}

      {tab === 'prescriptions' && (
        prescriptions.length === 0 ? (
          <p className="text-body text-[var(--color-text-secondary)]">暂无处方记录。</p>
        ) : (
          <ul className="space-y-3">
            {prescriptions.map((rx) => (
              <li key={rx.id} className="min-h-[72px] rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-card-title text-[var(--color-text-primary)]">{rx.lines[0]?.drugName ?? '未知药品'}</p>
                  <span className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-caption text-[var(--color-primary)]">
                    {rxSourceLabel(rx.source)}
                  </span>
                </div>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  开具：{new Date(rx.issuedAt).toLocaleDateString('zh-CN')} · 有效期至：{new Date(rx.validUntil).toLocaleDateString('zh-CN')}
                </p>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === 'plans' && (
        plans.length === 0 ? (
          <p className="text-body text-[var(--color-text-secondary)]">暂无用药计划。</p>
        ) : (
          <ul className="space-y-3">
            {plans.map((p) => (
              <li key={p.id} className="min-h-[72px] rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-card-title text-[var(--color-text-primary)]">用药计划</p>
                  <span className={`rounded-full px-2 py-0.5 text-caption ${p.enabled ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'}`}>
                    {p.enabled ? '启用中' : '已停用'}
                  </span>
                </div>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  开始：{p.startDate} {p.endDate ? `· 结束：${p.endDate}` : '· 无结束日期'}
                </p>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  每日 {p.timesPerDay} 次，每次 {p.doseAmount}{p.doseUnit}
                </p>
              </li>
            ))}
          </ul>
        )
      )}
    </PageLayout>
  )
}

/** U-03 应用设置 */
function SettingsView({ onBack }: { onBack: () => void }) {
  const root = useAppStore((s) => s.root)
  const setRoot = useAppStore((s) => s.setRoot)
  const { show: toast } = useToast()
  const settings = root.settings

  const update = useCallback(
    (patch: Partial<typeof settings>) => {
      setRoot((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }))
    },
    [setRoot],
  )

  const handleNotifyToggle = useCallback(async () => {
    if (!settings.browserNotifyEnabled) {
      const perm = await requestNotificationPermission()
      if (perm !== 'granted') {
        toast('通知权限被拒绝，请在浏览器设置中允许通知。')
        return
      }
    }
    update({ browserNotifyEnabled: !settings.browserNotifyEnabled })
    toast(settings.browserNotifyEnabled ? '通知已关闭' : '通知已开启')
  }, [settings.browserNotifyEnabled, update, toast])

  const handleSaveDnd = useCallback(
    (field: 'doNotDisturbStart' | 'doNotDisturbEnd', value: string) => {
      update({ [field]: value || undefined })
    },
    [update],
  )

  return (
    <PageLayout title="应用设置">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" onClick={onBack}>← 返回</Button>
      </div>

      <div className="space-y-4">
        {/* 库存低阈值 */}
        <label className="block">
          <span className="text-body text-[var(--color-text-primary)]">库存低阈值</span>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
            type="number"
            min={1}
            value={settings.stockLowDefaultThreshold}
            onChange={(e) => update({ stockLowDefaultThreshold: parseInt(e.target.value, 10) || 1 })}
          />
        </label>

        {/* 处方临期天数 */}
        <label className="block">
          <span className="text-body text-[var(--color-text-primary)]">处方临期提醒天数</span>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
            type="number"
            min={1}
            value={settings.rxExpiringDays}
            onChange={(e) => update({ rxExpiringDays: parseInt(e.target.value, 10) || 1 })}
          />
        </label>

        {/* 浏览器通知 */}
        <div className="flex items-center justify-between rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
          <div>
            <p className="text-body text-[var(--color-text-primary)]">浏览器通知</p>
            <p className="text-caption text-[var(--color-text-secondary)]">开启后将推送用药和续方提醒</p>
          </div>
          <button
            type="button"
            className={`h-7 w-12 rounded-full transition-colors ${settings.browserNotifyEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
            onClick={handleNotifyToggle}
          >
            <div className={`h-5 w-5 rounded-full bg-white transition-transform ${settings.browserNotifyEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* 勿扰模式 */}
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 space-y-3">
          <p className="text-body text-[var(--color-text-primary)]">勿扰模式</p>
          <p className="text-caption text-[var(--color-text-secondary)]">在以下时间段内不发送通知</p>
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="text-caption text-[var(--color-text-secondary)]">开始</span>
              <input
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                type="time"
                value={settings.doNotDisturbStart ?? ''}
                onChange={(e) => handleSaveDnd('doNotDisturbStart', e.target.value)}
              />
            </label>
            <label className="flex-1">
              <span className="text-caption text-[var(--color-text-secondary)]">结束</span>
              <input
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                type="time"
                value={settings.doNotDisturbEnd ?? ''}
                onChange={(e) => handleSaveDnd('doNotDisturbEnd', e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

/** U-04 依从性报表 */
function ReportsView({ onBack }: { onBack: () => void }) {
  const root = useAppStore((s) => s.root)
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly' | 'drug'>('daily')
  const [days, setDays] = useState<7 | 30>(7)

  const dailyData = getAdherenceRange(root, days)
  const weeklyData = getWeeklyAdherence(root, 4)
  const monthlyData = getMonthlyAdherence(root, 3)
  const drugData = getDrugAdherenceBreakdown(root, 30)

  const activeData = tab === 'daily' ? dailyData : tab === 'weekly' ? weeklyData : tab === 'monthly' ? monthlyData : []
  const rate = overallAdherenceRate(activeData)
  const streak = adherenceStreak(root)
  const totalMissed = activeData.reduce((s, d) => s + (d.denominator - d.numerator), 0)

  return (
    <PageLayout title="依从性报表">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" onClick={onBack}>← 返回</Button>
      </div>

      {/* Tab 切换 */}
      <div className="mb-4 flex gap-2">
        {([['daily', '按日'], ['weekly', '按周'], ['monthly', '按月'], ['drug', '按药品']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-body ${tab === key ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 摘要 */}
      <section className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="总依从率" value={`${Math.round(rate * 100)}%`} />
        <StatCard label="连续全勤" value={`${streak} 天`} />
        <StatCard label="漏服次数" value={`${totalMissed}`} />
      </section>

      {tab === 'daily' && (
        <>
          <div className="mb-4 flex gap-2">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-body ${days === d ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'}`}
                onClick={() => setDays(d)}
              >
                最近 {d} 天
              </button>
            ))}
          </div>
          <section className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <h3 className="text-card-title text-[var(--color-text-primary)]">每日依从</h3>
            <div className="mt-3 flex items-end gap-1" style={{ height: '120px' }}>
              {dailyData.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: `${(d.ratio * 100)}%`,
                      minHeight: d.denominator > 0 ? '4px' : '0',
                      background: d.ratio >= 1 ? 'var(--color-success)' : d.ratio > 0 ? 'var(--color-warn)' : 'var(--color-border)',
                    }}
                    title={`${d.date}: ${d.numerator}/${d.denominator}`}
                  />
                  {days <= 7 && (
                    <span className="text-caption text-[var(--color-text-secondary)]" style={{ fontSize: '10px' }}>
                      {d.date.slice(5)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'weekly' && (
        <section className="mb-4 space-y-3">
          {weeklyData.map((w, i) => (
            <div key={i} className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-card-title text-[var(--color-text-primary)]">{w.weekLabel}（{w.startDate} ~ {w.endDate}）</p>
                <span className={`rounded-full px-2 py-0.5 text-caption ${w.ratio >= 1 ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : w.ratio > 0 ? 'bg-[var(--color-warn-bg)] text-[var(--color-warn)]' : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'}`}>
                  {Math.round(w.ratio * 100)}%
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-caption text-[var(--color-text-secondary)]">
                <span>应服 {w.denominator} 次</span>
                <span>实服 {w.numerator} 次</span>
                <span>全勤 {w.perfectDays} 天</span>
                <span>漏服 {w.missedDays} 天</span>
              </div>
            </div>
          ))}
          {weeklyData.length === 0 && (
            <p className="text-body text-[var(--color-text-secondary)]">暂无周报数据。</p>
          )}
        </section>
      )}

      {tab === 'monthly' && (
        <section className="mb-4 space-y-3">
          {monthlyData.map((m, i) => (
            <div key={i} className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-card-title text-[var(--color-text-primary)]">{m.monthLabel}</p>
                <span className={`rounded-full px-2 py-0.5 text-caption ${m.ratio >= 1 ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : m.ratio > 0 ? 'bg-[var(--color-warn-bg)] text-[var(--color-warn)]' : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'}`}>
                  {Math.round(m.ratio * 100)}%
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-caption text-[var(--color-text-secondary)]">
                <span>应服 {m.denominator} 次</span>
                <span>实服 {m.numerator} 次</span>
                <span>全勤 {m.perfectDays} 天</span>
                <span>漏服 {m.missedDays} 天</span>
              </div>
            </div>
          ))}
          {monthlyData.length === 0 && (
            <p className="text-body text-[var(--color-text-secondary)]">暂无月报数据。</p>
          )}
        </section>
      )}

      {tab === 'drug' && (
        <section className="mb-4 space-y-3">
          {drugData.map((d, i) => (
            <div key={i} className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-card-title text-[var(--color-text-primary)]">{d.drugName}</p>
                  <p className="text-caption text-[var(--color-text-secondary)]">{d.spec}</p>
                </div>
                <div className="text-right">
                  <p className="text-stat text-[var(--color-text-primary)]">{Math.round(d.ratio * 100)}%</p>
                  <p className="text-caption text-[var(--color-text-secondary)]">{d.numerator}/{d.denominator}</p>
                </div>
              </div>
            </div>
          ))}
          {drugData.length === 0 && (
            <p className="text-body text-[var(--color-text-secondary)]">暂无用药依从数据。</p>
          )}
        </section>
      )}
    </PageLayout>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-3 text-center">
      <p className="text-stat text-[var(--color-text-primary)]">{value}</p>
      <p className="mt-1 text-caption text-[var(--color-text-secondary)]">{label}</p>
    </div>
  )
}

/** 提醒收件箱 */
function InboxView({ onBack }: { onBack: () => void }) {
  const root = useAppStore((s) => s.root)
  const setRoot = useAppStore((s) => s.setRoot)

  // 挂载时跑一次 reconcile 确保提醒已刷新
  useEffect(() => {
    setRoot((prev) => reconcileAll(prev))
  }, [setRoot])

  const handleMarkRead = useCallback(
    (businessKey: string) => {
      setRoot((prev) => markReminderRead(prev, businessKey))
    },
    [setRoot],
  )

  const handleMarkAllRead = useCallback(() => {
    setRoot((prev) => markAllRemindersRead(prev))
  }, [setRoot])

  const sorted = useMemo(
    () => [...root.reminders].sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt)),
    [root.reminders],
  )

  return (
    <PageLayout title="提醒收件箱">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>← 返回</Button>
        {sorted.some((r) => !r.read) && (
          <Button variant="ghost" onClick={handleMarkAllRead}>全部已读</Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-8 text-center">
          <p className="text-body text-[var(--color-text-secondary)]">暂无提醒。</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((item) => (
            <li
              key={item.id}
              className={`min-h-[72px] rounded-card border ${!item.read ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'} bg-[var(--color-card)] px-4 py-3`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => handleMarkRead(item.businessKey)}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${!item.read ? 'bg-[var(--color-primary)]' : 'bg-transparent'}`} />
                  <span className={`text-card-title ${!item.read ? 'font-semibold' : ''} text-[var(--color-text-primary)]`}>
                    {item.title}
                  </span>
                </div>
                <p className={`mt-1 text-body ${!item.read ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                  {item.body}
                </p>
                <p className="mt-1 text-caption text-[var(--color-text-secondary)]">
                  {new Date(item.triggeredAt).toLocaleString('zh-CN')}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  )
}
