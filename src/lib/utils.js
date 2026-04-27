import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

export function formatPrice(price) {
  if (price == null) return '—'
  return `¥${Number(price).toLocaleString('ja-JP')}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, 'yyyy/MM/dd', { locale: ja })
  } catch {
    return dateStr
  }
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, 'M/d', { locale: ja })
  } catch {
    return dateStr
  }
}

export function calcPriceChange(current, previous) {
  if (!previous || previous === 0) return null
  const diff = current - previous
  const pct = (diff / previous) * 100
  return { diff, pct, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' }
}

export function getPriceStatus(current, lowestPrice, latestPrice) {
  const statuses = []

  if (lowestPrice && current <= lowestPrice) {
    statuses.push({ type: 'lowest', label: '過去最安値！', color: 'green' })
  }

  if (latestPrice) {
    const change = calcPriceChange(current, latestPrice)
    if (change) {
      if (change.direction === 'down') {
        statuses.push({
          type: 'cheaper',
          label: `前回比 ${Math.abs(change.pct).toFixed(1)}% 安`,
          color: 'green'
        })
      } else if (change.direction === 'up') {
        statuses.push({
          type: 'expensive',
          label: `前回比 ${change.pct.toFixed(1)}% 高`,
          color: 'red'
        })
      }
    }
  }

  return statuses
}

export function today() {
  return format(new Date(), 'yyyy-MM-dd')
}
