import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../../components/layout/PageLayout'
import { DEPARTMENTS } from '../../constants/departments'
import { DoctorListPage } from './DoctorListPage'
import { ConsultModePage } from './ConsultModePage'
import { ConsultFormPage } from './ConsultFormPage'
import { ConsultBookingPage } from './ConsultBookingPage'
import { ConsultCompletePage } from './ConsultCompletePage'

/** 在线问诊入口：根据 view 参数路由到不同子页面 */
export function ConsultPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') ?? 'list'

  if (view === 'doctor') {
    return <DoctorListPage departmentId={searchParams.get('dept') ?? ''} />
  }
  if (view === 'mode') {
    return <ConsultModePage />
  }
  if (view === 'form') {
    return <ConsultFormPage />
  }
  if (view === 'booking') {
    return <ConsultBookingPage />
  }
  if (view === 'complete') {
    return <ConsultCompletePage />
  }

  // Default: department list
  return (
    <PageLayout title="在线问诊">
      <p className="mb-4 text-body text-[var(--color-text-secondary)]">
        选择科室后将进入医生列表与问诊流程（演示数据）。
      </p>
      <ul className="space-y-2">
        {DEPARTMENTS.map((d) => (
          <li
            key={d.id}
            className="min-h-[72px] rounded-card border border-[var(--color-border)] bg-[var(--color-card)]"
          >
            <button
              type="button"
              className="flex w-full flex-col justify-center px-4 py-3 text-left hover:bg-[var(--color-primary-light)]"
              aria-label={`选择科室 ${d.name}`}
              onClick={() => navigate(`/consult?view=doctor&dept=${d.id}`)}
            >
              <span className="text-card-title text-[var(--color-text-primary)]">{d.name}</span>
              {d.description ? (
                <span className="mt-1 text-caption text-[var(--color-text-secondary)]">{d.description}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </PageLayout>
  )
}
