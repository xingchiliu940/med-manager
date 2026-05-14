import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageLayout } from '../../components/layout/PageLayout'
import { Button } from '../../components/ui/Button'
import { useAppStore } from '../../store'
import { useToast } from '../../hooks/useToast'
import {
  ensureDoseRecordsForDate,
  listDoseSlotRowsForDay,
  rollMissedDueRecords,
} from '../../services/doseService'
import { markDoseMakeup, markDoseMissed, markDoseTaken, undoDoseTaken } from '../../services/doseActions'
import { reconcileAll } from '../../services/reconcileService'
import { deleteMedicationPlan, togglePlanEnabled } from '../../services/planService'
import { isRxExpired, syncRxToMedicationPlan } from '../../services/rxService'
import { getStockTotal } from '../../services/stockService'
import { todayLocalString } from '../../utils/date'
import { DoseRecordStatus } from '../../types/enums'
import { PlanFormModal, type PlanEditContext } from './PlanFormModal'

type TabKey = 'today' | 'plans'

const statusLabel: Record<string, string> = {
  [DoseRecordStatus.Due]: '待服',
  [DoseRecordStatus.Taken]: '已服',
  [DoseRecordStatus.Missed]: '漏服',
  [DoseRecordStatus.Makeup]: '补服已记',
}

/** 用药计划：M-01 维护 + M-03 按日清单 + M-04 打卡 */
export function PlanPage() {
  const toast = useToast()
  const hydrated = useAppStore((s) => s.hydrated)
  const root = useAppStore((s) => s.root)
  const setRoot = useAppStore((s) => s.setRoot)

  const [tab, setTab] = useState<TabKey>('today')
  const [pickerDate, setPickerDate] = useState(() => todayLocalString())
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [editContext, setEditContext] = useState<PlanEditContext | null>(null)
  /** 每次打开「添加」时递增，用于表单 key 重挂载 */
  const [addFormSeq, setAddFormSeq] = useState(0)

  const defaultLow = root.settings.stockLowDefaultThreshold

  const syncDay = useCallback(() => {
    setRoot((r) => {
      const x = reconcileAll(r)
      const y = ensureDoseRecordsForDate(x, pickerDate)
      return rollMissedDueRecords(y, todayLocalString())
    })
  }, [setRoot, pickerDate])

  useEffect(() => {
    if (!hydrated) return
    syncDay()
  }, [hydrated, syncDay])

  const doseRows = useMemo(
    () => listDoseSlotRowsForDay(root, pickerDate),
    [root, pickerDate],
  )

  const commit = useCallback(
    (updater: Parameters<typeof setRoot>[0]) => {
      setRoot(updater)
    },
    [setRoot],
  )

  const openAdd = () => {
    setAddFormSeq((n) => n + 1)
    setFormMode('add')
    setEditContext(null)
    setFormOpen(true)
  }

  const openEdit = (ctx: PlanEditContext) => {
    setFormMode('edit')
    setEditContext(ctx)
    setFormOpen(true)
  }

  const plansSorted = useMemo(() => {
    return [...root.medicationPlans].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [root.medicationPlans])

  const drugMap = useMemo(() => new Map(root.drugMasters.map((d) => [d.id, d])), [root.drugMasters])

  const handleDoseAction = (doseId: string, action: 'taken' | 'missed' | 'makeup') => {
    setRoot((prev) => {
      const res =
        action === 'taken'
          ? markDoseTaken(prev, doseId)
          : action === 'missed'
            ? markDoseMissed(prev, doseId)
            : markDoseMakeup(prev, doseId)
      if (!res.ok) toast.show(res.message)
      return res.root
    })
  }

  const handleUndoTaken = (doseId: string) => {
    setRoot((prev) => {
      const res = undoDoseTaken(prev, doseId)
      if (!res.ok) toast.show(res.message)
      else toast.show('已撤回已服状态')
      return res.root
    })
  }

  const handleCreatePlanFromRx = () => {
    const rx = [...root.prescriptions]
      .filter((item) => !item.usedForPlan && !isRxExpired(item))
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0]

    if (!rx) {
      toast.show('暂无可用于生成计划的有效处方')
      return
    }

    setRoot((prev) => {
      const res = syncRxToMedicationPlan(prev, rx.id)
      if (!res.ok) toast.show(res.message)
      else toast.show('已根据处方生成用药计划')
      return res.ok ? res.root : prev
    })
  }

  const handleDeletePlan = (planId: string, drugName: string) => {
    const ok = window.confirm(`确定删除「${drugName}」的用药计划吗？删除后今日提醒、历史应服记录、库存预警也会同步清理。`)
    if (!ok) return
    setRoot((prev) => deleteMedicationPlan(prev, planId))
    toast.show('已删除用药计划')
  }

  return (
    <PageLayout title="用药计划">
      <div className="mb-4 flex rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1">
        <button
          type="button"
          className={`min-h-touch flex-1 rounded-lg text-[16px] font-medium ${
            tab === 'today' ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
          }`}
          onClick={() => setTab('today')}
        >
          今日清单
        </button>
        <button
          type="button"
          className={`min-h-touch flex-1 rounded-lg text-[16px] font-medium ${
            tab === 'plans' ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
          }`}
          onClick={() => setTab('plans')}
        >
          我的计划
        </button>
      </div>

      {tab === 'today' ? (
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-body text-[var(--color-text-secondary)]">
              选择日期
              <input
                type="date"
                className="ml-2 rounded-lg border border-[var(--color-border)] px-2 py-2 text-body text-[var(--color-text-primary)]"
                value={pickerDate}
                onChange={(e) => setPickerDate(e.target.value)}
              />
            </label>
            <Button variant="secondary" type="button" onClick={() => setPickerDate(todayLocalString())}>
              回到今天
            </Button>
          </div>

          {doseRows.length === 0 ? (
            <p className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-body text-[var(--color-text-secondary)]">
              该日没有待服条目。请先在「我的计划」添加用药，并确认疗程包含此日期。
            </p>
          ) : (
            <ul className="space-y-2">
              {doseRows.map(({ record, plan, drugName, scheduleTime }) => {
                const stock = getStockTotal(root, plan.drugMasterId)
                const canTake =
                  record.status === DoseRecordStatus.Due && record.planDate === todayLocalString()
                const canMiss =
                  record.status === DoseRecordStatus.Due && record.planDate === todayLocalString()
                const canMakeup =
                  record.status === DoseRecordStatus.Missed ||
                  (record.status === DoseRecordStatus.Due && record.planDate < todayLocalString())
                const done =
                  record.status === DoseRecordStatus.Taken || record.status === DoseRecordStatus.Makeup

                return (
                  <li
                    key={record.id}
                    className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-card-title text-[var(--color-text-primary)]">{drugName}</p>
                        <p className="mt-1 text-caption text-[var(--color-text-secondary)]">
                          {scheduleTime} · 每次 {plan.doseAmount}
                          {plan.doseUnit}
                        </p>
                        <p className="mt-1 text-caption text-[var(--color-text-secondary)]">库存剩余：{stock}</p>
                      </div>
                      {record.status === DoseRecordStatus.Taken ? (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg px-2 py-1 text-[14px] font-medium"
                          style={{
                            background: 'var(--tag-done-bg)',
                            color: 'var(--tag-done-fg)',
                          }}
                          onClick={() => handleUndoTaken(record.id)}
                          aria-label="撤回已服状态"
                        >
                          已服
                        </button>
                      ) : (
                        <span
                          className="shrink-0 rounded-lg px-2 py-1 text-[14px] font-medium"
                          style={{
                            background:
                              record.status === DoseRecordStatus.Makeup
                                ? 'var(--tag-done-bg)'
                                : record.status === DoseRecordStatus.Missed
                                  ? 'var(--tag-missed-bg)'
                                  : 'var(--tag-due-bg)',
                            color:
                              record.status === DoseRecordStatus.Makeup
                                ? 'var(--tag-done-fg)'
                                : record.status === DoseRecordStatus.Missed
                                  ? 'var(--tag-missed-fg)'
                                  : 'var(--tag-due-fg)',
                          }}
                        >
                          {statusLabel[record.status] ?? record.status}
                        </span>
                      )}
                    </div>
                    {!done ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="flex-1 min-w-[120px]"
                          disabled={!canTake || stock < plan.doseAmount}
                          onClick={() => handleDoseAction(record.id, 'taken')}
                        >
                          已服
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          className="flex-1 min-w-[120px]"
                          disabled={!canMiss}
                          onClick={() => handleDoseAction(record.id, 'missed')}
                        >
                          漏服
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          className="flex-1 min-w-[120px]"
                          disabled={!canMakeup || stock < plan.doseAmount}
                          onClick={() => handleDoseAction(record.id, 'makeup')}
                        >
                          补服
                        </Button>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : (
        <section>
          <Button variant="secondary" type="button" className="mb-3 w-full" onClick={handleCreatePlanFromRx}>
            从处方生成用药计划
          </Button>
          <Button type="button" className="mb-4 w-full" onClick={openAdd}>
            添加用药计划
          </Button>
          {plansSorted.length === 0 ? (
            <p className="text-body text-[var(--color-text-secondary)]">暂无计划，请点击上方按钮添加。</p>
          ) : (
            <ul className="space-y-2">
              {plansSorted.map((p) => {
                const d = drugMap.get(p.drugMasterId)
                return (
                  <li
                    key={p.id}
                    className="flex min-h-[72px] flex-col gap-2 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-card-title text-[var(--color-text-primary)]">
                        {d?.name ?? '未知药品'} {!p.enabled ? '（已停用）' : ''}
                      </p>
                      <p className="mt-1 text-caption text-[var(--color-text-secondary)]">
                        {d?.spec} · 每日 {p.timesPerDay} 次 · {p.startDate}
                        {p.endDate ? ` ~ ${p.endDate}` : '（长期）'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() =>
                          d &&
                          openEdit({
                            plan: p,
                            drugName: d.name,
                            spec: d.spec,
                            stockUnit: d.stockUnit,
                            lowStockThreshold: d.lowStockThreshold,
                          })
                        }
                        disabled={!d}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() => commit((prev) => togglePlanEnabled(prev, p.id))}
                      >
                        {p.enabled ? '停用' : '启用'}
                      </Button>
                      <Button
                        variant="secondary"
                        type="button"
                        className="text-[var(--color-error)]"
                        onClick={() => handleDeletePlan(p.id, d?.name ?? '该药品')}
                      >
                        删除
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {formOpen ? (
        <PlanFormModal
          key={formMode === 'edit' && editContext ? `edit-${editContext.plan.id}` : `add-${addFormSeq}`}
          mode={formMode}
          editContext={editContext}
          defaultLowStockThreshold={defaultLow}
          onClose={() => setFormOpen(false)}
          commit={commit}
        />
      ) : null}
    </PageLayout>
  )
}
