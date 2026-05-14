import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../../components/layout/PageLayout'
import { DOCTORS } from '../../constants/doctors'
import { DEPARTMENTS } from '../../constants/departments'
import { Button } from '../../components/ui/Button'

interface DoctorListPageProps {
  departmentId: string
}

export function DoctorListPage({ departmentId }: DoctorListPageProps) {
  const navigate = useNavigate()
  const department = useMemo(
    () => DEPARTMENTS.find((d) => d.id === departmentId),
    [departmentId],
  )

  const doctors = useMemo(
    () => DOCTORS.filter((d) => d.departmentId === departmentId),
    [departmentId],
  )

  const handleSelectDoctor = (doctorId: string) => {
    navigate(`/consult?view=chat&dept=${departmentId}&doctor=${doctorId}`)
  }

  const handleBack = () => {
    navigate('/consult')
  }

  return (
    <PageLayout title={department?.name ?? '医生列表'}>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" onClick={handleBack}>
          ← 返回科室列表
        </Button>
      </div>

      {doctors.length === 0 ? (
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-8 text-center">
          <p className="text-body text-[var(--color-text-secondary)]">
            该科室暂无可预约医生，请更换科室或稍后再试。
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {doctors.map((doc) => (
            <li key={doc.id} className="min-h-[72px] rounded-card border border-[var(--color-border)] bg-[var(--color-card)]">
              <button
                type="button"
                className="flex w-full flex-col gap-1 px-4 py-3 text-left"
                aria-label={`选择医生 ${doc.name}，${doc.title}，擅长${doc.specialty}`}
                onClick={() => handleSelectDoctor(doc.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-card-title font-semibold text-[var(--color-text-primary)]">
                    {doc.name}
                  </span>
                  <span className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-caption text-[var(--color-primary)]">
                    {doc.title}
                  </span>
                </div>
                <p className="text-body text-[var(--color-text-secondary)]">{doc.specialty}</p>
                {doc.availableSlots && doc.availableSlots.length > 0 && (
                  <p className="mt-1 text-caption text-[var(--color-text-secondary)]">
                    可预约：{doc.availableSlots.join('；')}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  )
}
