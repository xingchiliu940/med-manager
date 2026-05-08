/** Q-02：演示医生静态数据 */

export interface Doctor {
  id: string
  name: string
  title: string
  specialty: string
  departmentId: string
  /** 可预约时段，MVP 用简化文案 */
  availableSlots?: string[]
}

export const DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: '王敏',
    title: '主任医师',
    specialty: '高血压、心力衰竭长期管理',
    departmentId: 'cardio',
    availableSlots: ['工作日 09:00-12:00', '周三 14:00-17:00'],
  },
  {
    id: 'doc-2',
    name: '李然',
    title: '副主任医师',
    specialty: '糖尿病用药与生活方式指导',
    departmentId: 'endo',
    availableSlots: ['周一、四 09:00-11:30', '周五 14:00-16:00'],
  },
  {
    id: 'doc-3',
    name: '赵建国',
    title: '主治医师',
    specialty: '常见慢病综合管理、用药指导',
    departmentId: 'internal',
    availableSlots: ['工作日 08:30-11:30'],
  },
  {
    id: 'doc-4',
    name: '陈晓燕',
    title: '副主任医师',
    specialty: '原发性/继发性高血压鉴别、个体化用药',
    departmentId: 'hp',
    availableSlots: ['周二 09:00-12:00', '周四 14:00-17:00'],
  },
  {
    id: 'doc-5',
    name: '孙伟',
    title: '主任医师',
    specialty: '冠心病合并高血压的联合用药',
    departmentId: 'cardio',
    availableSlots: ['周一、三 09:00-11:00'],
  },
]
