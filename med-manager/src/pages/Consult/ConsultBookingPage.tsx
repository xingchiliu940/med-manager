import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../../components/layout/PageLayout'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../hooks/useToast'
import { useAppStore } from '../../store'
import { DOCTORS } from '../../constants/doctors'
import { DEPARTMENTS } from '../../constants/departments'
import { confirmConsultation } from '../../services/consultBookingService'
import { createFollowUpFromConsultation } from '../../services/followUpService'

export function ConsultBookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { show: toast } = useToast()
  const setRoot = useAppStore((s) => s.setRoot)

  const consultationId = searchParams.get('consultation') ?? ''
  const deptId = searchParams.get('dept') ?? ''
  const doctorId = searchParams.get('doctor') ?? ''

  const department = DEPARTMENTS.find((d) => d.id === deptId)
  const doctor = DOCTORS.find((d) => d.id === doctorId)

  // 从 URL params 中获取表单摘要
  const chiefComplaint = searchParams.get('complaint') ?? ''
  const symptoms = searchParams.get('symptoms') ?? ''
  const medicalHistory = searchParams.get('history') ?? ''
  const currentMeds = searchParams.get('currentMeds') ?? ''

  // 处方明细（通过 URL query 传递，JSON 编码）
  const [prescriptionLines] = useState(() => {
    const raw = searchParams.get('lines')
    if (!raw) return []
    try { return JSON.parse(decodeURIComponent(raw)) } catch { return [] }
  })

  const handleConfirm = useCallback(() => {
    if (!doctor || !doctorId) return
    const result = confirmConsultation(
      useAppStore.getState().root,
      consultationId,
      chiefComplaint,
      prescriptionLines,
    )
    if (result.ok) {
      const followUp = createFollowUpFromConsultation(
        result.root.consultations.find((c) => c.id === consultationId)?.id ?? consultationId,
        deptId,
        doctor.name,
      )
      setRoot((prev) => ({
        ...prev,
        consultations: result.root.consultations,
        prescriptions: result.root.prescriptions,
        followUps: [...prev.followUps, followUp],
      }))
      toast('问诊完成，处方已生成')
      navigate(`/consult?view=complete&consultation=${consultationId}&prescription=${result.root.prescriptions[result.root.prescriptions.length - 1].id}`)
    } else {
      toast(result.message)
    }
  }, [doctor, doctorId, consultationId, chiefComplaint, prescriptionLines, deptId, setRoot, toast, navigate])

  if (!doctor || !department) {
    return (
      <PageLayout title="确认就诊">
        <p className="text-body text-[var(--color-text-secondary)]">参数缺失，请重新选择。</p>
      </PageLayout>
    )
  }

  const summaryLines = [chiefComplaint, symptoms, medicalHistory, currentMeds].filter(Boolean)

  return (
    <PageLayout title="确认就诊">
      {/* 医生信息 */}
      <div className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <p className="text-card-title text-[var(--color-text-primary)]">
          {doctor.name} · {doctor.title}
        </p>
        <p className="text-caption text-[var(--color-text-secondary)]">
          {department.name}
        </p>
      </div>

      {/* 问诊摘要 */}
      <div className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <h3 className="text-card-title text-[var(--color-text-primary)]">问诊摘要</h3>
        {summaryLines.length > 0 ? (
          <ul className="mt-2 space-y-1 text-body text-[var(--color-text-secondary)]">
            {summaryLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-caption text-[var(--color-text-secondary)]">无摘要</p>
        )}
      </div>

      {/* 处方明细预览 */}
      <div className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <h3 className="text-card-title text-[var(--color-text-primary)]">
          待开处方（{prescriptionLines.length} 条）
        </h3>
        {prescriptionLines.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {prescriptionLines.map((line: { drugName: string; spec?: string; doseText?: string; frequencyText?: string }, i: number) => (
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
        ) : (
          <p className="mt-2 text-caption text-[var(--color-text-secondary)]">无处方明细</p>
        )}
      </div>

      <Button variant="primary" disabled={prescriptionLines.length === 0} onClick={handleConfirm}>
        确认就诊，生成处方
      </Button>
    </PageLayout>
  )
}
