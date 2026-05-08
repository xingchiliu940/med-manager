import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../../components/layout/PageLayout'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../hooks/useToast'
import { useAppStore } from '../../store'
import { DOCTORS } from '../../constants/doctors'
import { DEPARTMENTS } from '../../constants/departments'
import type { PrescriptionLine, ConsultationMode } from '../../types'
import { createConsultationOrder } from '../../services/consultationService'

function emptyLine(): PrescriptionLine {
  return { drugName: '', spec: '', doseText: '', frequencyText: '' }
}

export function ConsultFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { show: toast } = useToast()
  const setRoot = useAppStore((s) => s.setRoot)

  const mode = (searchParams.get('mode') as ConsultationMode) ?? 'image'
  const deptId = searchParams.get('dept') ?? ''
  const doctorId = searchParams.get('doctor') ?? ''

  const department = DEPARTMENTS.find((d) => d.id === deptId)
  const doctor = DOCTORS.find((d) => d.id === doctorId)

  // Form state
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [currentMeds, setCurrentMeds] = useState('')
  const [prescriptionLines, setPrescriptionLines] = useState<PrescriptionLine[]>([emptyLine()])
  const [summary, setSummary] = useState('')

  // Renewal-specific
  const prescriptions = useAppStore((s) => s.root.prescriptions)
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('')

  const handleAddLine = useCallback(() => {
    setPrescriptionLines((prev) => [...prev, emptyLine()])
  }, [])

  const handleRemoveLine = useCallback((index: number) => {
    setPrescriptionLines((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleLineChange = useCallback(
    (index: number, field: keyof PrescriptionLine, value: string) => {
      setPrescriptionLines((prev) =>
        prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
      )
    },
    [],
  )

  const handleUsePrescription = useCallback(() => {
    const rx = prescriptions.find((p) => p.id === selectedPrescriptionId)
    if (!rx) {
      toast('请选择一个处方')
      return
    }
    setPrescriptionLines(rx.lines.map((l) => ({ ...l })))
    toast('已导入处方明细')
  }, [prescriptions, selectedPrescriptionId, toast])

  const valid = useMemo(() => {
    if (mode === 'image') {
      return chiefComplaint.trim().length > 0 && prescriptionLines.some((l) => l.drugName.trim().length > 0)
    }
    return prescriptionLines.some((l) => l.drugName.trim().length > 0)
  }, [mode, chiefComplaint, prescriptionLines])

  const handleSubmit = useCallback(() => {
    if (!doctor || !department) return

    // 创建问诊订单并暂存，跳转到确认页
    const order = createConsultationOrder(mode, deptId, doctorId)
    setRoot((prev) => ({
      ...prev,
      consultations: [...prev.consultations, order],
    }))

    // 通过 URL query 传递表单数据
    const params = new URLSearchParams({
      view: 'booking',
      consultation: order.id,
      dept: deptId,
      doctor: doctorId,
      complaint: chiefComplaint,
      symptoms,
      history: medicalHistory,
      currentMeds,
      lines: encodeURIComponent(JSON.stringify(prescriptionLines.filter((l) => l.drugName.trim().length > 0))),
    })
    navigate(`/consult?${params.toString()}`)
  }, [doctor, department, mode, deptId, doctorId, chiefComplaint, symptoms, medicalHistory, currentMeds, prescriptionLines, setRoot, navigate])

  if (!department || !doctor) {
    return (
      <PageLayout title="问诊表单">
        <p className="text-body text-[var(--color-text-secondary)]">参数缺失，请重新选择。</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout title={mode === 'renewal' ? '复诊续方' : '图文问诊'}>
      {/* Doctor info */}
      <div className="mb-4 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <p className="text-card-title text-[var(--color-text-primary)]">
          {doctor.name} · {doctor.title}
        </p>
        <p className="text-caption text-[var(--color-text-secondary)]">
          {department.name}
        </p>
      </div>

      {/* 图文问诊: symptom fields */}
      {mode === 'image' && (
        <div className="mb-4 space-y-3">
          <h3 className="text-card-title text-[var(--color-text-primary)]">症状描述</h3>
          <label className="block">
            <span className="text-body text-[var(--color-text-primary)]">主诉 <span className="text-[var(--color-error)]">*</span></span>
            <textarea
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
              rows={2}
              placeholder="例如：头晕一周，伴轻度耳鸣"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-body text-[var(--color-text-primary)]">当前症状</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
              rows={3}
              placeholder="详细描述不适症状、持续时间等"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-body text-[var(--color-text-primary)]">既往病史</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
              rows={2}
              placeholder="高血压、糖尿病等慢性病史"
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-body text-[var(--color-text-primary)]">当前用药</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
              rows={2}
              placeholder="正在服用的药品名称和剂量"
              value={currentMeds}
              onChange={(e) => setCurrentMeds(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-body text-[var(--color-text-primary)]">问诊摘要</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
              rows={2}
              placeholder="需要向医生说明的关键信息（将显示在处方摘要中）"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
        </div>
      )}

      {/* 续方问诊: 选择历史处方 */}
      {mode === 'renewal' && (
        <div className="mb-4 space-y-3">
          <h3 className="text-card-title text-[var(--color-text-primary)]">选择续方处方</h3>
          {prescriptions.length === 0 ? (
            <p className="text-body text-[var(--color-text-secondary)]">
              暂无历史处方，请先通过图文问诊获取处方。
            </p>
          ) : (
            <>
              <select
                className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-body text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                value={selectedPrescriptionId}
                onChange={(e) => setSelectedPrescriptionId(e.target.value)}
              >
                <option value="">-- 请选择历史处方 --</option>
                {prescriptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {new Date(p.issuedAt).toLocaleDateString()} · {p.lines.map((l) => l.drugName).join('、')}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={handleUsePrescription} disabled={!selectedPrescriptionId}>
                导入处方明细
              </Button>
            </>
          )}
        </div>
      )}

      {/* Prescription lines editor */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-card-title text-[var(--color-text-primary)]">处方明细</h3>
          <Button variant="ghost" onClick={handleAddLine}>
            + 添加药品
          </Button>
        </div>

        {prescriptionLines.map((line, index) => (
          <div
            key={index}
            className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-caption text-[var(--color-text-secondary)]">药品 {index + 1}</span>
              {prescriptionLines.length > 1 && (
                <button
                  type="button"
                  className="text-caption text-[var(--color-error)] hover:underline"
                  onClick={() => handleRemoveLine(index)}
                >
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

      {/* Submit */}
      <Button variant="primary" disabled={!valid} onClick={handleSubmit}>
        完成问诊，生成处方
      </Button>
    </PageLayout>
  )
}
