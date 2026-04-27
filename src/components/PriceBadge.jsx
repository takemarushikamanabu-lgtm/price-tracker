import { TrendingUp, TrendingDown, Minus, Star } from 'lucide-react'
import { calcPriceChange } from '../lib/utils'

export function PriceChangeBadge({ current, previous }) {
  if (!previous) return null
  const change = calcPriceChange(current, previous)
  if (!change || change.direction === 'same') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-muted)' }}>
      <Minus size={11} /> 変動なし
    </span>
  )

  const isUp = change.direction === 'up'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 11,
      fontWeight: 600,
      color: isUp ? 'var(--red)' : 'var(--green)',
      background: isUp ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
      padding: '2px 7px',
      borderRadius: 99,
    }}>
      {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {isUp ? '+' : ''}{change.pct.toFixed(1)}%
    </span>
  )
}

export function LowestPriceBadge() {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 10,
      fontWeight: 700,
      color: '#000',
      background: 'var(--accent)',
      padding: '2px 7px',
      borderRadius: 99,
      letterSpacing: '0.3px',
    }}>
      <Star size={10} fill="currentColor" /> 最安値
    </span>
  )
}

export function PriceTypeBadge({ type }) {
  const iscamp = type === 'campaign'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 10,
      fontWeight: 600,
      color: iscamp ? '#F59E0B' : 'var(--text-muted)',
      background: iscamp ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
      padding: '2px 8px',
      borderRadius: 99,
      border: `1px solid ${iscamp ? 'rgba(245,158,11,0.3)' : 'transparent'}`,
    }}>
      {iscamp ? 'キャンペーン' : '通常'}
    </span>
  )
}
