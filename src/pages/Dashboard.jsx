import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp, Package, Clock, ArrowRight } from 'lucide-react'
import { getProducts, getRecentRecords } from '../lib/supabase'
import { formatPrice, formatDate } from '../lib/utils'
import { PriceChangeBadge, PriceTypeBadge } from '../components/PriceBadge'

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {label}
          </p>
          <p style={{ fontSize: 26, fontWeight: 600, margin: 0, color: color || 'var(--text-primary)', fontFamily: 'IBM Plex Mono' }}>
            {value}
          </p>
          {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>{sub}</p>}
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: color ? `${color}18` : 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color || 'var(--text-secondary)'} />
        </div>
      </div>
    </div>
  )
}

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

  if (loading) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>読み込み中...</div>
  )

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px' }}>ダッシュボード</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>仕入価格の全体状況</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
        <StatCard label="登録商品数" value={totalProducts} sub={`価格データあり: ${withRecords}件`} icon={Package} />
        <StatCard label="最近の入力" value={recent.length} sub="直近の記録" icon={Clock} color="var(--blue)" />
        <StatCard
          label="価格データ総数"
          value={products.reduce((s, p) => s + (p.record_count || 0), 0)}
          sub="累計記録数"
          icon={TrendingDown}
          color="var(--accent)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent records */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>最近の入力</h2>
            <Link to="/products" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              全件 <ArrowRight size={11} />
            </Link>
          </div>
          <div>
            {recent.length === 0 ? (
              <p style={{ padding: '20px 18px', color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                まだデータがありません
              </p>
            ) : recent.map((r) => (
              <div key={r.id} style={{
                padding: '10px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.products?.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatDate(r.recorded_date)} {r.supplier && `/ ${r.supplier}`}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, fontFamily: 'IBM Plex Mono', color: 'var(--accent)' }}>
                    {formatPrice(r.price)}
                  </p>
                  <div style={{ marginTop: 2 }}>
                    <PriceTypeBadge type={r.price_type} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Products needing attention */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
          }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>商品一覧（価格順）</h2>
          </div>
          <div>
            {products.length === 0 ? (
              <p style={{ padding: '20px 18px', color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                商品を登録してください
              </p>
            ) : [...products]
              .filter(p => p.latest_price != null)
              .sort((a, b) => (a.latest_price || 0) - (b.latest_price || 0))
              .slice(0, 8)
              .map((p) => (
                <Link
                  key={p.id}
                  to={`/products/${p.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 18px',
                    borderBottom: '1px solid var(--border)',
                    textDecoration: 'none',
                    gap: 12,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </p>
                    {p.category && (
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{p.category}</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)' }}>
                      {formatPrice(p.latest_price)}
                    </p>
                    {p.lowest_price != null && (
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--green)' }}>
                        最安: {formatPrice(p.lowest_price)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
