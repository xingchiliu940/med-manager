/** Q-01：慢病科室静态配置（构建时打包） */

export interface Department {
  id: string
  name: string
  description?: string
}

export const DEPARTMENTS: Department[] = [
  { id: 'internal', name: '内科', description: '常见慢病综合管理' },
  { id: 'cardio', name: '心血管', description: '高血压、冠心病等' },
  { id: 'endo', name: '内分泌', description: '糖尿病、甲状腺等' },
  { id: 'hp', name: '高血压专病', description: '血压管理与随访' },
]
