import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, TrendingDown, ArrowRight } from 'lucide-react'
import { getProducts, getRecentRecords } from '../lib/supabase'
import { formatPrice, formatDate } from '../lib/utils'
import { PriceTypeBadge } from '../components/PriceBadge'

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProducts(), getRecentRecords(10)])
      .then(([p, r]) => { setProducts(p || []); setRecent(r || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalProducts = products.length
  const withRecords = products.filter(p => p.latest_price != null).length
  const totalRec = products.reduce((s, p) => s + (p.record_count || 0), 0)

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>読み込み中...</div>

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 2px' }}>ダッシュボード</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>仕入価格の全体状況</p>
      </div>

      {/* 統計カード — スマホで2列 */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: '登録商品数', value: totalProducts, sub: `記録あり: ${withRecords}件`, icon: Package, color: 'var(--text-primary)' },
          { label: '最近の入力', value: recent.length, sub: '直近の記録', icon: Clock, color: 'var(--blue)' },
          { label: '価格記録総数', value: totalRec, sub: '累計', icon: TrendingDown, color: 'var(--accent)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 6px' }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 600, margin: 0, fontFamily: 'IBM Plex Mono', color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* 最近の入力 */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500, fontSize: 13 }}>最近の入力</span>
          <Link to="/products" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            全件 <ArrowRight size={11} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p style={{ padding: '16px 14px', color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>まだデータがありません</p>
        ) : recent.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.products?.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(r.recorded_date)}{r.supplier ? ` / ${r.supplier}` : ''}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, fontFamily: 'IBM Plex Mono', color: 'var(--accent)' }}>{formatPrice(r.price)}</p>
              <div style={{ marginTop: 2 }}><PriceTypeBadge type={r.price_type} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* 商品一覧（価格順） */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 500, fontSize: 13 }}>商品一覧（最新価格順）</span>
        </div>
        {[...products].filter(p => p.latest_price != null).sort((a, b) => a.latest_price - b.latest_price).slice(0, 6).map(p => (
          <Link key={p.id} to={`/products/${p.id}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderBottom: '1px solid var(--border)',
            textDecoration: 'none', gap: 12,
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
              {p.category && <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{p.category}</p>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)' }}>{formatPrice(p.latest_price)}</p>
              {p.lowest_price != null && <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--green)' }}>最安: {formatPrice(p.lowest_price)}</p>}
            </div>
          </Link>
        ))}
        {products.filter(p => p.latest_price != null).length === 0 && (
          <p style={{ padding: '16px 14px', color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>商品を登録してください</p>
        )}
      </div>
    </div>
  )
}
