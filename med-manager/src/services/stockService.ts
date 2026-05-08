/**
 * 库存汇总与 FIFO 扣减（PRD 8.1 / 8.2）
 */

import type { AppPersistRoot, StockBatch } from '../types'

export function getStockTotal(root: AppPersistRoot, drugMasterId: string): number {
  return root.stockBatches
    .filter((b) => b.drugMasterId === drugMasterId)
    .reduce((s, b) => s + b.quantity, 0)
}

/** 按入库时间升序扣减；不足则失败且 root 不变 */
export function deductStockFifo(
  root: AppPersistRoot,
  drugMasterId: string,
  amount: number,
): { ok: true; root: AppPersistRoot } | { ok: false; root: AppPersistRoot } {
  if (amount <= 0) return { ok: true, root }

  const others = root.stockBatches.filter((b) => b.drugMasterId !== drugMasterId)
  const mine = root.stockBatches
    .filter((b) => b.drugMasterId === drugMasterId)
    .slice()
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))

  let remaining = amount
  const updated: StockBatch[] = mine.map((b) => {
    if (remaining <= 0) return b
    const take = Math.min(b.quantity, remaining)
    remaining -= take
    return { ...b, quantity: b.quantity - take }
  })

  if (remaining > 0) return { ok: false, root }
  return { ok: true, root: { ...root, stockBatches: [...others, ...updated] } }
}
