import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../../components/layout/PageLayout'
import { Button } from '../../components/ui/Button'
import { useAppStore } from '../../store'

export function ConsultCompletePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const consultationId = searchParams.get('consultation') ?? ''
  const prescriptionId = searchParams.get('prescription') ?? ''

  const consultations = useAppStore((s) => s.root.consultations)
  const prescriptions = useAppStore((s) => s.root.prescriptions)

  const consultation = consultations.find((c) => c.id === consultationId)
  const prescription = prescriptions.find((p) => p.id === prescriptionId)

  if (!consultation || !prescription) {
    return (
      <PageLayout title="问诊完成">
        <p className="text-body text-[var(--color-text-secondary)]">未找到相关记录。</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="问诊完成">
      {/* Success banner */}
      <div className="mb-4 rounded-card border border-[var(--color-success)] bg-[var(--color-success-light)] px-4 py-4 text-center">
        <p className="text-card-title text-[var(--color-success)]">问诊已完成</p>
        <p className="mt-1 text-caption text-[var(--color-text-secondary)]">
          处方已生成，可前往「复诊处方」查看或购药
        </p>
      </div>

      {/* Consultation summary */}
      <div className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <h3 className="text-card-title text-[var(--color-text-primary)]">问诊摘要</h3>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          {consultation.summary || '无'}
        </p>
        <p className="mt-2 text-caption text-[var(--color-text-secondary)]">
          时间：{new Date(consultation.createdAt).toLocaleString('zh-CN')}
        </p>
      </div>

      {/* Prescription detail */}
      <div className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <h3 className="text-card-title text-[var(--color-text-primary)]">处方明细</h3>
        <p className="mt-1 text-caption text-[var(--color-text-secondary)]">
          开具时间：{new Date(prescription.issuedAt).toLocaleDateString('zh-CN')}
        </p>
        <p className="text-caption text-[var(--color-warn)]">
          有效期至：{new Date(prescription.validUntil).toLocaleDateString('zh-CN')}
        </p>

        <ul className="mt-3 space-y-2">
          {prescription.lines.map((line, i) => (
            <li
              key={i}
              className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2"
            >
              <p className="text-body font-medium text-[var(--color-text-primary)]">
                {line.drugName}
              </p>
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

      {/* Action buttons */}
      <div className="space-y-3">
        <Button
          variant="primary"
          onClick={() => navigate(`/plan`)}
        >
          加入用药计划
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate('/rx')}
        >
          查看处方详情
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
        >
          返回首页
        </Button>
      </div>
    </PageLayout>
  )
}
