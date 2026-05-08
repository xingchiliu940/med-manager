import type { ConsultationOrder, Prescription, ConsultationMode, ConsultationStatus } from '../types'
import { PrescriptionSource } from '../types'
import { newId } from '../utils/id'

export function createConsultationOrder(
  mode: ConsultationMode,
  departmentId: string,
  doctorId: string,
  bookedAt?: string,
): ConsultationOrder {
  return {
    id: newId(),
    mode,
    departmentId,
    doctorId,
    bookedAt,
    status: bookedAt ? ('booked' as ConsultationStatus) : ('pending' as ConsultationStatus),
    summary: '',
    createdAt: new Date().toISOString(),
  }
}

export function completeConsultation(
  order: ConsultationOrder,
  summary: string,
  prescriptionLines: Prescription['lines'],
  validityDays = 7,
): { order: ConsultationOrder; prescription: Prescription } {
  const completedOrder: ConsultationOrder = {
    ...order,
    status: 'completed' as ConsultationStatus,
    summary,
  }

  const issuedAt = new Date()
  const validUntil = new Date(issuedAt)
  validUntil.setDate(validUntil.getDate() + validityDays)

  const prescription: Prescription = {
    id: newId(),
    source: order.mode === 'renewal' ? PrescriptionSource.ConsultRenewal : PrescriptionSource.ConsultImage,
    issuedAt: issuedAt.toISOString(),
    validUntil: validUntil.toISOString(),
    lines: prescriptionLines,
    consultationId: order.id,
  }

  return { order: completedOrder, prescription }
}
