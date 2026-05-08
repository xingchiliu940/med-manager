import { useReducer } from 'react'
import type { AppPersistRoot, MedicationPlan } from '../../types'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../hooks/useToast'
import { defaultTimePointsForDaily } from '../../services/doseService'
import { addMedicationPlan, patchMedicationPlan, type NewMedicationPlanInput } from '../../services/planService'
import { isValidHm } from '../../utils/time'
import { todayLocalString } from '../../utils/date'

export type PlanEditContext = {
  plan: MedicationPlan
  drugName: string
  spec: string
  stockUnit: string
  lowStockThreshold: number
}

type FormState = {
  drugName: string
  spec: string
  stockUnit: string
  doseAmount: string
  doseUnit: string
  timesPerDay: number
  timePointsText: string
  startDate: string
  endDate: string
  initialStock: string
  lowStock: string
  enabled: boolean
}

type Props = {
  mode: 'add' | 'edit'
  editContext: PlanEditContext | null
  defaultLowStockThreshold: number
  onClose: () => void
  commit: (updater: (prev: AppPersistRoot) => AppPersistRoot) => void
}

function buildInitialForm(
  mode: 'add' | 'edit',
  editContext: PlanEditContext | null,
  defaultLow: number,
): FormState {
  if (mode === 'edit' && editContext) {
    const { plan, drugName, spec, stockUnit, lowStockThreshold } = editContext
    return {
      drugName,
      spec,
      stockUnit,
      doseAmount: String(plan.doseAmount),
      doseUnit: plan.doseUnit,
      timesPerDay: plan.timesPerDay,
      timePointsText: plan.timePoints.join(','),
      startDate: plan.startDate,
      endDate: plan.endDate ?? '',
      initialStock: '0',
      lowStock: String(lowStockThreshold),
      enabled: plan.enabled,
    }
  }
  return {
    drugName: '',
    spec: '',
    stockUnit: '片',
    doseAmount: '1',
    doseUnit: '片',
    timesPerDay: 2,
    timePointsText: defaultTimePointsForDaily(2).join(','),
    startDate: todayLocalString(),
    endDate: '',
    initialStock: '0',
    lowStock: String(defaultLow),
    enabled: true,
  }
}

/** M-01：添加 / 编辑用药计划（父级设置 key 以在切换记录时重置表单） */
export function PlanFormModal({
  mode,
  editContext,
  defaultLowStockThreshold,
  onClose,
  commit,
}: Props) {
  const toast = useToast()
  const [form, patch] = useReducer(
    (_: FormState, next: FormState) => next,
    { mode, editContext, defaultLowStockThreshold },
    (ia: {
      mode: 'add' | 'edit'
      editContext: PlanEditContext | null
      defaultLowStockThreshold: number
    }) => buildInitialForm(ia.mode, ia.editContext, ia.defaultLowStockThreshold),
  )

  const parsedTimes = form.timePointsText
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const syncTimesFromCount = (n: number) => {
    patch({
      ...form,
      timesPerDay: n,
      timePointsText: defaultTimePointsForDaily(n).join(','),
    })
  }

  const handleSubmit = () => {
    for (const t of parsedTimes) {
      if (!isValidHm(t)) {
        toast.show(`时间点格式不正确：${t}，请使用 HH:mm`)
        return
      }
    }
    const n = form.timesPerDay
    if (parsedTimes.length !== n) {
      toast.show(`每日 ${n} 次需填写 ${n} 个时间点。`)
      return
    }
    const dose = Number(form.doseAmount)
    const stock0 = Number(form.initialStock)
    const low = Number(form.lowStock)

    if (mode === 'add') {
      const input: NewMedicationPlanInput = {
        drugName: form.drugName,
        spec: form.spec,
        stockUnit: form.stockUnit,
        doseAmount: dose,
        doseUnit: form.doseUnit,
        timesPerDay: n,
        timePoints: parsedTimes,
        startDate: form.startDate,
        endDate: form.endDate.trim() || undefined,
        initialStock: stock0,
        lowStockThreshold: low,
      }
      commit((prev) => {
        const res = addMedicationPlan(prev, input)
        if (!res.ok) {
          toast.show(res.message)
          return prev
        }
        toast.show('已保存用药计划')
        onClose()
        return res.root
      })
      return
    }

    if (mode === 'edit' && editContext) {
      commit((prev) => {
        const res = patchMedicationPlan(prev, editContext.plan.id, {
          doseAmount: dose,
          doseUnit: form.doseUnit,
          timesPerDay: n,
          timePoints: parsedTimes,
          startDate: form.startDate,
          endDate: form.endDate.trim() || undefined,
          enabled: form.enabled,
          lowStockThreshold: low,
        })
        if (!res.ok) {
          toast.show(res.message)
          return prev
        }
        toast.show('已更新用药计划')
        onClose()
        return res.root
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-app overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:rounded-card">
        <h2 className="text-card-title text-[var(--color-text-primary)]">
          {mode === 'add' ? '添加用药计划' : '编辑用药计划'}
        </h2>
        <p className="mt-1 text-caption text-[var(--color-text-secondary)]">
          当前版本仅支持「每日 N 次」；剂量单位须与库存单位一致方可保存与扣减库存。
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-caption text-[var(--color-text-secondary)]">药品名称</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-3 text-body text-[var(--color-text-primary)] disabled:bg-[var(--color-bg)]"
              value={form.drugName}
              disabled={mode === 'edit'}
              onChange={(e) => patch({ ...form, drugName: e.target.value })}
              placeholder="如：氨氯地平"
            />
          </label>
          <label className="block">
            <span className="text-caption text-[var(--color-text-secondary)]">规格</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-3 text-body disabled:bg-[var(--color-bg)]"
              value={form.spec}
              disabled={mode === 'edit'}
              onChange={(e) => patch({ ...form, spec: e.target.value })}
              placeholder="如：5mg×28 片"
            />
          </label>
          <label className="block">
            <span className="text-caption text-[var(--color-text-secondary)]">库存单位</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-3 text-body disabled:bg-[var(--color-bg)]"
              value={form.stockUnit}
              disabled={mode === 'edit'}
              onChange={(e) => patch({ ...form, stockUnit: e.target.value })}
              placeholder="片、粒、盒拆片等"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-caption text-[var(--color-text-secondary)]">每次剂量（数值）</span>
              <input
                type="number"
                min={0.25}
                step="any"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-3 text-body"
                value={form.doseAmount}
                onChange={(e) => patch({ ...form, doseAmount: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-caption text-[var(--color-text-secondary)]">剂量单位</span>
              <input
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-3 text-body"
                value={form.doseUnit}
                onChange={(e) => patch({ ...form, doseUnit: e.target.value })}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-caption text-[var(--color-text-secondary)]">每日次数（1～6）</span>
            <select
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-3 text-body"
              value={form.timesPerDay}
              onChange={(e) => syncTimesFromCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map((x) => (
                <option key={x} value={x}>
                  {x} 次
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-[var(--color-text-secondary)]">时间点（英文逗号分隔，HH:mm）</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-3 text-body"
              value={form.timePointsText}
              onChange={(e) => patch({ ...form, timePointsText: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-caption text-[var(--color-text-secondary)]">开始日期</span>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-2 py-3 text-body"
                value={form.startDate}
                onChange={(e) => patch({ ...form, startDate: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-caption text-[var(--color-text-secondary)]">结束日期（可选）</span>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-2 py-3 text-body"
                value={form.endDate}
                onChange={(e) => patch({ ...form, endDate: e.target.value })}
              />
            </label>
          </div>
          {mode === 'add' ? (
            <label className="block">
              <span className="text-caption text-[var(--color-text-secondary)]">初始库存数量</span>
              <input
                type="number"
                min={0}
                step={1}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-3 text-body"
                value={form.initialStock}
                onChange={(e) => patch({ ...form, initialStock: e.target.value })}
              />
            </label>
          ) : null}
          {mode === 'edit' ? (
            <label className="flex min-h-touch cursor-pointer items-center gap-2 text-body text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => patch({ ...form, enabled: e.target.checked })}
              />
              启用此计划
            </label>
          ) : null}
          <label className="block">
            <span className="text-caption text-[var(--color-text-secondary)]">低库存阈值（剩余量提醒）</span>
            <input
              type="number"
              min={0}
              step={1}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-3 text-body"
              value={form.lowStock}
              onChange={(e) => patch({ ...form, lowStock: e.target.value })}
            />
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>
            取消
          </Button>
          <Button className="flex-1" type="button" onClick={handleSubmit}>
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}
