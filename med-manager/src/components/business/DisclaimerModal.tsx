import { Button } from '../ui/Button'
import { useAppStore } from '../../store'

/** 首访免责声明：未接受前阻断主流程 */
export function DisclaimerModal() {
  const hydrated = useAppStore((s) => s.hydrated)
  const accepted = useAppStore((s) => s.root.meta.disclaimerAcceptedAt)
  const setRoot = useAppStore((s) => s.setRoot)

  if (!hydrated || accepted) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div className="max-h-[88vh] w-full max-w-app overflow-y-auto rounded-card border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-xl">
        <h2 id="disclaimer-title" className="text-card-title text-[var(--color-text-primary)]">
          免责声明与模拟数据说明
        </h2>
        <div className="mt-3 space-y-3 text-body text-[var(--color-text-secondary)]">
          <p>
            本应用为慢病用药与问诊流程的演示原型，界面与流程仅供学习与产品评审，不构成医疗建议、诊断或处方意见。
          </p>
          <p>
            用药调整、复诊与购药请以线下执业医师指导及合规渠道为准。本地数据保存在您的浏览器中，清除站点数据或更换设备将导致记录丢失。
          </p>
        </div>
        <div className="mt-5">
          <Button
            className="w-full"
            onClick={() =>
              setRoot((prev) => ({
                ...prev,
                meta: { ...prev.meta, disclaimerAcceptedAt: new Date().toISOString() },
              }))
            }
          >
            我已阅读并知晓
          </Button>
        </div>
      </div>
    </div>
  )
}
