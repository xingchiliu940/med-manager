import { useCallback, useMemo, useState } from 'react'
import { PageLayout } from '../../components/layout/PageLayout'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../hooks/useToast'
import { useAppStore } from '../../store'
import { confirmRxPurchase, createManualPrescription, isRxExpired, rxRemainingDays, rxSourceLabel, syncRxToMedicationPlan } from '../../services/rxService'
import { importPrescription, parsePrescriptionText } from '../../services/importService'
import type { PrescriptionLine, Prescription } from '../../types'

type RxView = 'list' | 'detail' | 'import' | 'manual'

export function PrescriptionPage() {
  const root = useAppStore((s) => s.root)
  const setRoot = useAppStore((s) => s.setRoot)
  const { show: toast } = useToast()

  const sortedRx = useMemo(
    () => [...root.prescriptions].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    [root.prescriptions],
  )

  const [selectedRxId, setSelectedRxId] = useState<string | null>(null)
  const [view, setView] = useState<RxView>('list')
  const selectedRx = sortedRx.find((r) => r.id === selectedRxId)

  // Purchase confirmation modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseQuantities, setPurchaseQuantities] = useState<number[]>([])

  const handleSelectRx = useCallback((id: string) => setSelectedRxId(id), [])
  const handleBack = useCallback(() => { setSelectedRxId(null); setView('list') }, [])
  const handleShowImport = useCallback(() => setView('import'), [])
  const handleBackFromImport = useCallback(() => setView('list'), [])
  const handleShowManual = useCallback(() => setView('manual'), [])
  const handleBackFromManual = useCallback(() => setView('list'), [])

  const handleImport = useCallback(
    (text: string) => {
      const result = importPrescription(root, text)
      if (result.ok) {
        setRoot(() => result.root)
        toast('导入成功，已生成用药计划')
        setView('list')
      } else {
        toast(result.message)
      }
    },
    [root, setRoot, toast],
  )

  const handleManualSubmit = useCallback(
    (lines: PrescriptionLine[], validityDays: number) => {
      const result = createManualPrescription(root, lines, validityDays)
      if (result.ok) {
        setRoot(() => result.root)
        toast('手动录入成功')
        setView('list')
      } else {
        toast(result.message)
      }
    },
    [root, setRoot, toast],
  )

  const handlePurchaseClick = useCallback(() => {
    if (!selectedRx) return
    setPurchaseQuantities(selectedRx.lines.map(() => 1))
    setShowPurchaseModal(true)
  }, [selectedRx])

  const handlePurchaseConfirm = useCallback(() => {
    if (!selectedRx) return
    const result = confirmRxPurchase(root, selectedRx.id, purchaseQuantities)
    if (result.ok) {
      setRoot(() => result.root)
      toast('购药确认成功，库存已更新')
      setShowPurchaseModal(false)
      setSelectedRxId(null)
    } else {
      toast(result.message)
    }
  }, [selectedRx, root, setRoot, toast, purchaseQuantities])

  const handleSyncPlan = useCallback(() => {
    if (!selectedRx) return
    const result = syncRxToMedicationPlan(root, selectedRx.id)
    if (result.ok) {
      setRoot(() => result.root)
      toast('已用本处方更新用药方案')
      setSelectedRxId(null)
    } else {
      toast(result.message)
    }
  }, [selectedRx, root, setRoot, toast])

  if (view === 'import') {
    return <RxImportView onBack={handleBackFromImport} onImport={handleImport} />
  }

  if (view === 'manual') {
    return <RxManualView onBack={handleBackFromManual} onSubmit={handleManualSubmit} />
  }

  if (selectedRx) {
    return (
      <>
        <RxDetail
          rx={selectedRx}
          onBack={handleBack}
          onPurchase={handlePurchaseClick}
          onSyncPlan={handleSyncPlan}
        />
        {showPurchaseModal && selectedRx && (
          <PurchaseConfirmModal
            lines={selectedRx.lines}
            quantities={purchaseQuantities}
            onQuantityChange={(i, v) => setPurchaseQuantities((prev) => prev.map((q, j) => (j === i ? v : q)))}
            onConfirm={handlePurchaseConfirm}
            onCancel={() => setShowPurchaseModal(false)}
          />
        )}
      </>
    )
  }

  return (
    <PageLayout title="复诊处方">
      {/* 顶部操作栏 */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-body text-[var(--color-text-secondary)]">
          {sortedRx.length > 0 ? `${sortedRx.length} 条处方` : '暂无处方记录'}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleShowManual}>
            + 手动录入
          </Button>
          <Button variant="secondary" onClick={handleShowImport}>
            + 导入处方
          </Button>
        </div>
      </div>

      {sortedRx.length === 0 ? (
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-8 text-center">
          <p className="text-body text-[var(--color-text-secondary)]">
            暂无处方记录。完成一次问诊或将外部处方导入。
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedRx.map((rx) => (
            <RxCard
              key={rx.id}
              rx={rx}
              rxExpiringDays={root.settings.rxExpiringDays}
              onSelect={() => handleSelectRx(rx.id)}
            />
          ))}
        </ul>
      )}
    </PageLayout>
  )
}

/** 处方导入视图 */
function RxImportView({ onBack, onImport }: { onBack: () => void; onImport: (text: string) => void }) {
  const [text, setText] = useState('')
  const preview = useMemo(() => {
    if (text.trim().length === 0) return []
    return parsePrescriptionText(text)
  }, [text])
  const valid = preview.length > 0 && preview.every((l) => l.drugName.trim().length > 0)

  return (
    <PageLayout title="导入处方">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" onClick={onBack}>← 返回处方列表</Button>
      </div>

      <div className="mb-4 space-y-3">
        <p className="text-body text-[var(--color-text-secondary)]">
          粘贴处方文本，每行一条药，字段用空格分隔（药品名 规格 用量 频次）。
        </p>
        <textarea
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
          rows={6}
          placeholder={'示例：\n降压药A 10mg×14片 每次1片 每日1次\n降糖药B 5mg×30片 每次2片 每日2次'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {preview.length > 0 && (
        <div className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
          <h3 className="text-card-title text-[var(--color-text-primary)]">预览（{preview.length} 条药品）</h3>
          <ul className="mt-3 space-y-2">
            {preview.map((line, i) => (
              <li key={i} className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
                <p className="text-body font-medium text-[var(--color-text-primary)]">{line.drugName || '（空）'}</p>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  {line.spec || '无规格'} · {line.doseText || '无用量'} · {line.frequencyText || '无频次'}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="primary" disabled={!valid} onClick={() => valid && onImport(text)}>
        确认导入并生成用药计划
      </Button>
    </PageLayout>
  )
}

/** 手动录入处方视图（M-02 Manual） */
function RxManualView({
  onBack,
  onSubmit,
}: {
  onBack: () => void
  onSubmit: (lines: PrescriptionLine[], validityDays: number) => void
}) {
  const [lines, setLines] = useState<PrescriptionLine[]>([{ drugName: '', spec: '', doseText: '', frequencyText: '' }])
  const [validityDays, setValidityDays] = useState(7)

  const handleAddLine = useCallback(() => {
    setLines((prev) => [...prev, { drugName: '', spec: '', doseText: '', frequencyText: '' }])
  }, [])

  const handleRemoveLine = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleLineChange = useCallback((index: number, field: keyof PrescriptionLine, value: string) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }, [])

  const valid = lines.some((l) => l.drugName.trim().length > 0)

  return (
    <PageLayout title="手动录入处方">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" onClick={onBack}>← 返回处方列表</Button>
      </div>

      {/* 有效期 */}
      <div className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <label className="flex items-center gap-3 text-body text-[var(--color-text-primary)]">
          <span>有效期天数</span>
          <input
            type="number"
            min={1}
            max={365}
            className="w-20 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
            value={validityDays}
            onChange={(e) => setValidityDays(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <span className="text-caption text-[var(--color-text-secondary)]">天后过期</span>
        </label>
      </div>

      {/* 药品明细 */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-card-title text-[var(--color-text-primary)]">处方明细</h3>
          <Button variant="ghost" onClick={handleAddLine}>
            + 添加药品
          </Button>
        </div>

        {lines.map((line, index) => (
          <div key={index} className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-[var(--color-text-secondary)]">药品 {index + 1}</span>
              {lines.length > 1 && (
                <button type="button" className="text-caption text-[var(--color-error)] hover:underline" onClick={() => handleRemoveLine(index)}>
                  删除
                </button>
              )}
            </div>
            <input
              className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
              placeholder="药品名称"
              value={line.drugName}
              onChange={(e) => handleLineChange(index, 'drugName', e.target.value)}
            />
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
                placeholder="规格（如 10mg×14片）"
                value={line.spec}
                onChange={(e) => handleLineChange(index, 'spec', e.target.value)}
              />
              <input
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
                placeholder="用量（如 每次1片）"
                value={line.doseText}
                onChange={(e) => handleLineChange(index, 'doseText', e.target.value)}
              />
            </div>
            <input
              className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
              placeholder="频次（如 每日2次）"
              value={line.frequencyText}
              onChange={(e) => handleLineChange(index, 'frequencyText', e.target.value)}
            />
          </div>
        ))}
      </div>

      <Button variant="primary" disabled={!valid} onClick={() => valid && onSubmit(lines, validityDays)}>
        确认录入
      </Button>
    </PageLayout>
  )
}

/** 购药确认弹窗（P-03） */
function PurchaseConfirmModal({
  lines,
  quantities,
  onQuantityChange,
  onConfirm,
  onCancel,
}: {
  lines: { drugName: string; spec: string; doseText: string; frequencyText: string }[]
  quantities: number[]
  onQuantityChange: (index: number, value: number) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="mx-4 w-full max-w-sm rounded-card bg-[var(--color-card)] p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="购药确认"
      >
        <h3 className="text-card-title text-[var(--color-text-primary)]">确认购药数量</h3>
        <ul className="mt-3 space-y-3">
          {lines.map((line, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
              <div>
                <p className="text-body font-medium text-[var(--color-text-primary)]">{line.drugName}</p>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  {line.spec && `${line.spec} · `}
                  {line.doseText} · {line.frequencyText}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-caption text-[var(--color-text-secondary)]">数量</label>
                <div className="flex items-center gap-0 rounded-lg border border-[var(--color-border)] bg-white overflow-hidden">
                  <button
                    type="button"
                    className="w-10 h-9 flex items-center justify-center text-[20px] text-[var(--color-text-secondary)] active:bg-[var(--color-primary-light)]"
                    onClick={() => onQuantityChange(i, Math.max(1, quantities[i] - 1))}
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-body font-medium text-[var(--color-text-primary)]">
                    {quantities[i]}
                  </span>
                  <button
                    type="button"
                    className="w-10 h-9 flex items-center justify-center text-[20px] text-[var(--color-text-secondary)] active:bg-[var(--color-primary-light)]"
                    onClick={() => onQuantityChange(i, quantities[i] + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            取消
          </Button>
          <Button variant="primary" onClick={onConfirm} className="flex-1">
            确认购药
          </Button>
        </div>
      </div>
    </div>
  )
}

/** 处方列表卡片 */
function RxCard({
  rx,
  rxExpiringDays,
  onSelect,
}: {
  rx: Pick<Prescription, 'id' | 'source' | 'issuedAt' | 'validUntil' | 'lines' | 'usedForPlan'> & { lines: { drugName: string }[] }
  rxExpiringDays: number
  onSelect: () => void
}) {
  const expired = isRxExpired(rx)
  const R = rxRemainingDays(rx)
  const expiring = !expired && R <= rxExpiringDays

  const drugName = rx.lines.length > 0 ? rx.lines[0].drugName : '未知药品'

  return (
    <li className={`min-h-[72px] rounded-card border ${expired ? 'border-[var(--color-error)] opacity-60' : expiring ? 'border-[var(--color-warn)]' : 'border-[var(--color-border)]'} bg-[var(--color-card)]`}>
      <button
        type="button"
        className="flex w-full flex-col gap-1 px-4 py-3 text-left"
        onClick={onSelect}
      >
        <div className="flex items-center justify-between">
          <span className="text-card-title font-semibold text-[var(--color-text-primary)]">
            {drugName}
          </span>
          <div className="flex gap-2">
            {rx.usedForPlan && (
              <span className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-caption text-[var(--color-primary)]">
                已用于方案
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-caption ${expired ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]' : expiring ? 'bg-[var(--color-warn-bg)] text-[var(--color-warn)]' : 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'}`}>
              {rxSourceLabel(rx.source as any)}
            </span>
          </div>
        </div>
        <div className="flex gap-4 text-caption text-[var(--color-text-secondary)]">
          <span>开具：{new Date(rx.issuedAt).toLocaleDateString('zh-CN')}</span>
          <span>有效期至：{new Date(rx.validUntil).toLocaleDateString('zh-CN')}</span>
        </div>
        {expired && (
          <span className="text-caption text-[var(--color-error)]">已过期</span>
        )}
        {expiring && !expired && (
          <span className="text-caption text-[var(--color-warn)]">剩余 {R} 天过期</span>
        )}
      </button>
    </li>
  )
}

/** 处方详情页 */
function RxDetail({
  rx,
  onBack,
  onPurchase,
  onSyncPlan,
}: {
  rx: Pick<Prescription, 'id' | 'source' | 'issuedAt' | 'validUntil' | 'lines' | 'usedForPlan' | 'consultationId'>
  onBack: () => void
  onPurchase: () => void
  onSyncPlan: () => void
}) {
  const expired = isRxExpired(rx)

  return (
    <PageLayout title="处方详情">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" onClick={onBack}>
          ← 返回处方列表
        </Button>
      </div>

      {/* 处方头 */}
      <div className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-card-title text-[var(--color-text-primary)]">电子处方</p>
          <span className={`rounded-full px-2 py-0.5 text-caption ${expired ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]' : 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'}`}>
            {rxSourceLabel(rx.source as any)}
          </span>
        </div>
        <div className="mt-2 flex gap-4 text-caption text-[var(--color-text-secondary)]">
          <span>开具：{new Date(rx.issuedAt).toLocaleDateString('zh-CN')}</span>
          <span>有效期至：{new Date(rx.validUntil).toLocaleDateString('zh-CN')}</span>
        </div>
        {expired && (
          <p className="mt-2 text-caption text-[var(--color-error)]">此处方已过期，无法购药或同步方案。</p>
        )}
        {rx.usedForPlan && (
          <p className="mt-2 text-caption text-[var(--color-primary)]">已用于更新用药方案</p>
        )}
      </div>

      {/* 处方明细 */}
      <div className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <h3 className="text-card-title text-[var(--color-text-primary)]">处方明细</h3>
        <ul className="mt-3 space-y-2">
          {rx.lines.map((line, i) => (
            <li key={i} className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2">
              <p className="text-body font-medium text-[var(--color-text-primary)]">{line.drugName}</p>
              {line.spec && (
                <p className="text-caption text-[var(--color-text-secondary)]">规格：{line.spec}</p>
              )}
              <p className="text-caption text-[var(--color-text-secondary)]">
                {line.doseText} · {line.frequencyText}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-3">
        <Button variant="primary" disabled={expired} onClick={onPurchase}>
          确认购药
        </Button>
        <Button variant="secondary" disabled={expired || rx.usedForPlan} onClick={onSyncPlan}>
          用本处方更新用药方案
        </Button>
      </div>
    </PageLayout>
  )
}
