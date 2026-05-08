import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../../components/layout/PageLayout'
import { DOCTORS } from '../../constants/doctors'
import { DEPARTMENTS } from '../../constants/departments'

export function ConsultModePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const deptId = searchParams.get('dept') ?? ''
  const doctorId = searchParams.get('doctor') ?? ''

  const department = DEPARTMENTS.find((d) => d.id === deptId)
  const doctor = DOCTORS.find((d) => d.id === doctorId)

  if (!department || !doctor) {
    return (
      <PageLayout title="问诊模式">
        <p className="text-body text-[var(--color-text-secondary)]">参数缺失，请重新选择。</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="选择问诊模式">
      <div className="mb-6 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <p className="text-card-title text-[var(--color-text-primary)]">
          {doctor.name} · {doctor.title}
        </p>
        <p className="mt-1 text-caption text-[var(--color-text-secondary)]">
          {department.name} · {doctor.specialty}
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className="flex w-full min-h-[72px] flex-col gap-1 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-left hover:bg-[var(--color-primary-light)]"
          aria-label="图文问诊"
          onClick={() =>
            navigate(`/consult?view=form&mode=image&dept=${deptId}&doctor=${doctorId}`)
          }
        >
          <span className="text-card-title font-semibold text-[var(--color-text-primary)]">
            📝 图文问诊
          </span>
          <p className="text-caption text-[var(--color-text-secondary)]">
            描述症状与病史，医生在线回复并开具处方
          </p>
        </button>

        <button
          type="button"
          className="flex w-full min-h-[72px] flex-col gap-1 rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-left hover:bg-[var(--color-primary-light)]"
          aria-label="复诊续方问诊"
          onClick={() =>
            navigate(`/consult?view=form&mode=renewal&dept=${deptId}&doctor=${doctorId}`)
          }
        >
          <span className="text-card-title font-semibold text-[var(--color-text-primary)]">
            🔄 复诊续方问诊
          </span>
          <p className="text-caption text-[var(--color-text-secondary)]">
            基于历史处方快速续方，适合用药稳定的复诊患者
          </p>
        </button>
      </div>
    </PageLayout>
  )
}
