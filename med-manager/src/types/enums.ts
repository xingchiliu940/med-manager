/** 处方来源（与 CLAUDE / PRD 对齐） */
export const PrescriptionSource = {
  ConsultImage: 'consult_image',
  ConsultRenewal: 'consult_renewal',
  Import: 'import',
  Manual: 'manual',
} as const
export type PrescriptionSource = (typeof PrescriptionSource)[keyof typeof PrescriptionSource]

/** 问诊订单状态（Q-06 演示闭环） */
export const ConsultationStatus = {
  Pending: 'pending',
  Booked: 'booked',
  AwaitingVisit: 'awaiting_visit',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const
export type ConsultationStatus = (typeof ConsultationStatus)[keyof typeof ConsultationStatus]

/** 问诊模式 */
export const ConsultationMode = {
  Image: 'image',
  Renewal: 'renewal',
} as const
export type ConsultationMode = (typeof ConsultationMode)[keyof typeof ConsultationMode]

/** 库存批次来源 */
export const StockBatchSource = {
  Manual: 'manual',
  PrescriptionImport: 'prescription_import',
  PurchaseConfirmed: 'purchase_confirmed',
} as const
export type StockBatchSource = (typeof StockBatchSource)[keyof typeof StockBatchSource]

/** 应服实例状态 */
export const DoseRecordStatus = {
  Due: 'due',
  Taken: 'taken',
  Missed: 'missed',
  Makeup: 'makeup',
} as const
export type DoseRecordStatus = (typeof DoseRecordStatus)[keyof typeof DoseRecordStatus]

/** 用药频次 MVP */
export const FrequencyType = {
  DailyTimes: 'daily_times',
} as const
export type FrequencyType = (typeof FrequencyType)[keyof typeof FrequencyType]

/** 提醒类型（ReminderFeedItem） */
export type ReminderType =
  | 'dose'
  | 'stock_low'
  | 'rx_expiring'
  | 'rx_expired'
  | 'renewal'
  | 'follow_up'
  | 'consult_booked'
