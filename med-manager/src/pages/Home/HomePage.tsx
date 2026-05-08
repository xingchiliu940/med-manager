import { Link } from 'react-router-dom'
import { PageLayout } from '../../components/layout/PageLayout'
import { useAppStore } from '../../store'
import { todayLocalString } from '../../utils/date'
import {
  adherenceNumeratorForDay,
  expectedDoseCountForDay,
  listDoseSlotRowsForDay,
} from '../../services/doseService'
import { DoseRecordStatus } from '../../types/enums'
import { DEPARTMENTS } from '../../constants/departments'

/** 首页仪表盘 H-01～H-05（骨架：空状态与快捷入口已就绪） */
export function HomePage() {
  const root = useAppStore((s) => s.root)
  const day = todayLocalString()
  const denom = expectedDoseCountForDay(root, day)
  const taken = adherenceNumeratorForDay(root, day)
  const ratio = denom === 0 ? 0 : Math.min(1, taken / denom)
  const dueRows = listDoseSlotRowsForDay(root, day).filter((r) => r.record.status === DoseRecordStatus.Due)

  const nextFollow = root.followUps.slice().sort((a, b) => a.at.localeCompare(b.at))[0]

  const lowDrugs = root.drugMasters.filter((d) => {
    const qty = root.stockBatches
      .filter((b) => b.drugMasterId === d.id)
      .reduce((s, b) => s + b.quantity, 0)
    return qty <= d.lowStockThreshold
  })

  return (
    <PageLayout title="今日概览">
      {/* H-02 服药完成率：纯 CSS 环形进度 */}
      <section
        className="mb-4 flex items-center gap-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-4"
        aria-label="今日服药完成率"
      >
        <div
          className="relative h-16 w-16 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(var(--color-success) ${ratio * 360}deg, var(--color-border) 0)`,
          }}
        >
          <div className="absolute inset-1 flex items-center justify-center rounded-full bg-[var(--color-card)] text-stat text-[var(--color-text-primary)]">
            {denom === 0 ? '—' : `${Math.round(ratio * 100)}%`}
          </div>
        </div>
        <div>
          <p className="text-caption text-[var(--color-text-secondary)]">今日完成率（演示）</p>
          <p className="text-body text-[var(--color-text-primary)]">
            {denom === 0 ? '今日无应服次数' : `依从完成 ${taken} / 今日应服 ${denom} 次`}
          </p>
        </div>
      </section>

      {/* H-01 今日待服药 */}
      <section className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="text-card-title text-[var(--color-text-primary)]">今日待服药</h2>
        {dueRows.length === 0 ? (
          <p className="mt-2 text-body text-[var(--color-text-secondary)]">
            {denom === 0
              ? '还没有用药计划。可到「用药计划」添加，或由处方同步生成。'
              : '今日应服项均已处理或暂无待服。'}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {dueRows.map(({ record, plan, drugName, scheduleTime }) => (
              <li
                key={record.id}
                className="flex min-h-[72px] flex-col justify-center rounded-lg border border-[var(--color-border)] px-3 py-2 text-body text-[var(--color-text-primary)]"
              >
                <span className="font-medium">{drugName}</span>
                <span className="mt-1 text-caption text-[var(--color-text-secondary)]">
                  {scheduleTime} · 每次 {plan.doseAmount}
                  {plan.doseUnit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* H-03 待复诊 / 问诊卡片 */}
      <section className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="text-card-title text-[var(--color-text-primary)]">复诊与问诊</h2>
        {!nextFollow && root.consultations.length === 0 ? (
          <p className="mt-2 text-body text-[var(--color-text-secondary)]">暂无待处理预约或问诊记录。</p>
        ) : (
          <div className="mt-2 space-y-2 text-body text-[var(--color-text-primary)]">
            {nextFollow ? (
              <div className="rounded-lg bg-[var(--tag-booked-bg)] px-3 py-2 text-[var(--tag-booked-fg)]">
                下一场：{nextFollow.title}（{nextFollow.at}）
              </div>
            ) : null}
            {root.consultations.filter((c) => c.status !== 'completed' && c.status !== 'cancelled').map((c) => {
              const dept = DEPARTMENTS.find((d) => d.id === c.departmentId)
              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2"
                >
                  <p className="font-medium">{dept?.name ?? '未知科室'}问诊</p>
                  <p className="text-caption text-[var(--color-text-secondary)]">
                    状态：{c.status === 'booked' ? '已预约' : c.status === 'awaiting_visit' ? '待就诊' : c.status}
                    {c.bookedAt ? ` · ${new Date(c.bookedAt).toLocaleDateString('zh-CN')}` : ''}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* H-04 库存预警 */}
      <section className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="text-card-title text-[var(--color-text-primary)]">库存预警</h2>
        {lowDrugs.length === 0 ? (
          <p className="mt-2 text-body text-[var(--color-text-secondary)]">当前没有低于阈值的药品摘要。</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {lowDrugs.map((d) => (
              <li
                key={d.id}
                className="rounded-lg px-3 py-2 text-body"
                style={{
                  background: 'var(--tag-stock-low-bg)',
                  color: 'var(--tag-stock-low-fg)',
                }}
              >
                {d.name}（{d.spec}）
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* H-05 快捷入口 */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          to="/consult"
          className="flex min-h-touch items-center justify-center rounded-card bg-[var(--color-primary)] text-center text-[17px] font-semibold text-white hover:bg-[var(--color-primary-hover)]"
        >
          发起问诊
        </Link>
        <Link
          to="/plan"
          className="flex min-h-touch items-center justify-center rounded-card border-2 border-[var(--color-primary)] bg-[var(--color-card)] text-center text-[17px] font-semibold text-[var(--color-primary)]"
        >
          添加用药
        </Link>
        <Link
          to="/consult"
          className="flex min-h-touch items-center justify-center rounded-card bg-[var(--color-primary-light)] text-center text-[17px] font-semibold text-[var(--color-primary)]"
        >
          预约复诊
        </Link>
      </section>
    </PageLayout>
  )
}
