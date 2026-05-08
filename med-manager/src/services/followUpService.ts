import type { FollowUpEvent } from '../types'
import { newId } from '../utils/id'

export function createFollowUpFromConsultation(
  consultationId: string,
  departmentId: string,
  doctorName: string,
  followUpDays = 7,
): FollowUpEvent {
  const at = new Date()
  at.setDate(at.getDate() + followUpDays)

  return {
    id: newId(),
    title: '复诊随访',
    at: at.toISOString(),
    departmentId,
    doctorName,
    linkedConsultationId: consultationId,
  }
}
