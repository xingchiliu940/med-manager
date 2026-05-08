/** 药品合并键规范化（完整管道） */

import type { DrugMaster } from '../types'

/** 单位别名映射：键为规范化后的标准单位，值为可接受的别名列表 */
export const UNIT_ALIASES: Record<string, string[]> = {
  mg: ['mg', '毫克'],
  g: ['g', '克'],
  ml: ['ml', '毫升'],
  '片': ['片', '片剂'],
  '粒': ['粒', '胶囊'],
  '袋': ['袋'],
}

/** Unicode NFC 规范化 */
function unicodeNfc(s: string): string {
  return s.normalize('NFC')
}

/** 全角转半角 */
function fullWidthToHalf(s: string): string {
  return s.replace(/[！-～]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0),
  )
}

/** 空白折叠：连续空白/制表符/换行 → 单个空格 */
function collapseWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

/** 单位映射：将中文单位替换为标准单位 */
function mapUnits(s: string): string {
  let result = s
  for (const [standard, aliases] of Object.entries(UNIT_ALIASES)) {
    for (const alias of aliases) {
      if (alias === standard) continue
      result = result.replace(new RegExp(alias, 'gi'), standard)
    }
  }
  return result
}

/**
 * 合并键规范化管道
 * Unicode NFC → 全角转半角 → 空白折叠 → 英文小写 → 单位映射
 */
export function normalizeMergeKey(name: string, spec: string): string {
  const n = normalizeOne(name)
  const s = normalizeOne(spec)
  return `${n}|${s}`
}

function normalizeOne(s: string): string {
  return mapUnits(
    collapseWhitespace(
      fullWidthToHalf(
        unicodeNfc(s),
      ).toLowerCase(),
    ),
  )
}

/** 兼容性别名：旧代码调用 */
export function buildMergeKeyPreview(name: string, spec: string): string {
  return normalizeMergeKey(name, spec)
}

/** 单位展示归一（不做医学等价推断，仅折叠空白与小写） */
export function normalizeUnitLabel(u: string): string {
  return collapseWhitespace(u.toLowerCase())
}

/** MVP：剂量单位与库存单位须归一后完全一致方可保存/扣减 */
export function doseUnitMatchesStock(doseUnit: string, stockUnit: string): boolean {
  return normalizeUnitLabel(doseUnit) === normalizeUnitLabel(stockUnit)
}

/** 查找同合并键主数据（保存时碰撞检测） */
export function findDrugByMergeKey(masters: DrugMaster[], mergeKey: string): DrugMaster | undefined {
  return masters.find((d) => d.mergeKey === mergeKey)
}
