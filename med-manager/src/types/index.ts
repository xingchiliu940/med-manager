import type {
  ConsultationMode,
  ConsultationStatus,
  DoseRecordStatus,
  FrequencyType,
  PrescriptionSource,
  ReminderType,
  StockBatchSource,
} from './enums'

export * from './enums'

/** 用户档案（单用户本地） */
export interface UserProfile {
  displayName: string
  birthYear?: number
  chronicNote?: string
}

/** 药品主数据 */
export interface DrugMaster {
  id: string
  name: string
  spec: string
  stockUnit: string
  /** 规范化合并键（存盘可缓存） */
  mergeKey: string
  lowStockThreshold: number
}

/** 库存批次 */
export interface StockBatch {
  id: string
  drugMasterId: string
  quantity: number
  receivedAt: string
  source: StockBatchSource
  expiryDate?: string
}

/** 用药计划 */
export interface MedicationPlan {
  id: string
  drugMasterId: string
  doseAmount: number
  doseUnit: string
  frequencyType: FrequencyType
  /** 每日次数 N∈[1,6] 等，MVP 用 number */
  timesPerDay: number
  timePoints: string[]
  startDate: string
  /** 无结束日则 undefined（PRD M-01） */
  endDate?: string
  enabled: boolean
  createdAt: string
  sourcePrescriptionId?: string
}

/** 应服 / 打卡记录（懒生成落盘） */
export interface DoseRecord {
  id: string
  planId: string
  planDate: string
  slotIndex: number
  status: DoseRecordStatus
  operatedAt?: string
  makeupForDoseId?: string
  /**
   * 依从统计归属业务日：已服=计划日；补服=用户操作日（PRD 8.3 / 8.3.1）
   */
  adherenceDate?: string
}

/** 问诊订单 */
export interface ConsultationOrder {
  id: string
  mode: ConsultationMode
  departmentId: string
  doctorId: string
  bookedAt?: string
  status: ConsultationStatus
  summary: string
  createdAt: string
}

/** 处方明细行 */
export interface PrescriptionLine {
  drugName: string
  spec: string
  doseText: string
  frequencyText: string
}

/** 电子处方 */
export interface Prescription {
  id: string
  source: PrescriptionSource
  issuedAt: string
  validUntil: string
  lines: PrescriptionLine[]
  consultationId?: string
  /** 是否已用于更新用药方案（P-04） */
  usedForPlan?: boolean
}

/** 复诊 / 随访事件 */
export interface FollowUpEvent {
  id: string
  title: string
  at: string
  departmentId?: string
  doctorName?: string
  linkedConsultationId?: string
}

/** 站内提醒时间线项 */
export interface ReminderFeedItem {
  id: string
  businessKey: string
  type: ReminderType
  title: string
  body: string
  read: boolean
  createdAt: string
  triggeredAt: string
  relatedId?: string
}

/** 应用设置 */
export interface AppSettings {
  stockLowDefaultThreshold: number
  rxExpiringDays: number
  /** 浏览器通知总开关（R-02） */
  browserNotifyEnabled: boolean
  /** 勿扰：HH:mm */
  doNotDisturbStart?: string
  doNotDisturbEnd?: string
}

/** 持久化根 */
export interface AppPersistRoot {
  schemaVersion: number
  userProfile: UserProfile
  drugMasters: DrugMaster[]
  stockBatches: StockBatch[]
  medicationPlans: MedicationPlan[]
  doseRecords: DoseRecord[]
  consultations: ConsultationOrder[]
  prescriptions: Prescription[]
  followUps: FollowUpEvent[]
  reminders: ReminderFeedItem[]
  settings: AppSettings
  meta: {
    disclaimerAcceptedAt?: string
    lastLargeTimeJumpHintAt?: string
    demoDataLoadedAt?: string
  }
}

/** 默认导出占位，避免仅类型文件被误判为空模块 */
export const SCHEMA_VERSION_INITIAL = 1 as const
