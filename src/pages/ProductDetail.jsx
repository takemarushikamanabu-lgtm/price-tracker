import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, TrendingDown } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
  BarChart, Bar, Cell
} from 'recharts'
import { getProduct, getPriceRecords, createPriceRecord, deletePriceRecord } from '../lib/supabase'
import { formatPrice, formatDate, formatDateShort, calcPriceChange, today } from '../lib/utils'
import { PriceChangeBadge, PriceTypeBadge, LowestPriceBadge } from '../components/PriceBadge'
import Modal from '../components/Modal'
 
const SUPPLIER_COLORS = [
  '#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6',
  '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]
 
function btnStyle(variant) {
  const base = { padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s', fontFamily: 'inherit' }
  if (variant === 'primary') return { ...base, background: 'var(--accent)', color: '#000' }
  if (variant === 'ghost') return { ...base, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
  return base
}
 
function AddRecordForm({ productId, onSave, onClose }) {
  const [form, setForm] = useState({ price: '', price_type: 'regular', supplier: '', recorded_date: today(), notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
 
  const handleSubmit = async () => {
    if (!form.price || isNaN(Number(form.price))) { setError('単価を正しく入力してください'); return }
    setSaving(true)
    try {
      await onSave({ ...form, product_id: productId, price: Number(form.price) })
      onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }
 
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>単価 *</label>
          <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>価格タイプ</label>
          <select value={form.price_type} onChange={e => set('price_type', e.target.value)} style={{ width: '100%' }}>
            <option value="regular">通常価格</option>
            <option value="campaign">キャンペーン価格</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>仕入日</label>
          <input type="date" value={form.recorded_date} onChange={e => set('recorded_date', e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>仕入先</label>
          <input type="text" value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="例: A食品卸" style={{ width: '100%' }} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>メモ</label>
        <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="備考など" style={{ width: '100%' }} />
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 12, margin: '0 0 12px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnStyle('ghost')}>キャンセル</button>
        <button onClick={handleSubmit} disabled={saving} style={btnStyle('primary')}>{saving ? '登録中...' : '登録'}</button>
      </div>
    </div>
  )
}
 
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ margin: '0 0 6px', color: 'var(--text-muted)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontFamily: 'IBM Plex Mono', fontWeight: 600 }}>
          {p.name}: {formatPrice(p.value)}
        </p>
      ))}
    </div>
  )
}
 
// 仕入先ごとの最新価格を集計
function buildSupplierSummary(records) {
  const map = {}
  records.forEach(r => {
    const s = r.supplier || '（仕入先未設定）'
    if (!map[s]) map[s] = []
    map[s].push(r)
  })
  return Object.entries(map).map(([supplier, recs]) => {
    const sorted = [...recs].sort((a, b) => b.recorded_date.localeCompare(a.recorded_date))
    const latest = sorted[0]
    const lowest = Math.min(...recs.map(r => r.price))
    const prev = sorted[1]
    const change = prev ? calcPriceChange(latest.price, prev.price) : null
    return { supplier, latestPrice: latest.price, latestDate: latest.recorded_date, lowestPrice: lowest, change, count: recs.length }
  }).sort((a, b) => a.latestPrice - b.latestPrice)
}
 
export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'supplier' | 'history'
 
  const load = () => {
    Promise.all([getProduct(id), getPriceRecords(id)])
      .then(([p, r]) => { setProduct(p); setRecords(r || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }
 
  useEffect(load, [id])
 
  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>読み込み中...</div>
  if (!product) return <div style={{ color: 'var(--red)' }}>商品が見つかりません</div>
 
  const lowestPrice = records.length ? Math.min(...records.map(r => r.price)) : null
  const latestRecord = records[0] || null
  const prevRecord = records[1] || null
  const change = latestRecord && prevRecord ? calcPriceChange(latestRecord.price, prevRecord.price) : null
 
  // 仕入先リスト（ユニーク）
  const suppliers = [...new Set(records.map(r => r.supplier).filter(Boolean))]
  const supplierColorMap = {}
  suppliers.forEach((s, i) => { supplierColorMap[s] = SUPPLIER_COLORS[i % SUPPLIER_COLORS.length] })
 
  // 仕入先別サマリー
  const supplierSummary = buildSupplierSummary(records)
  const bestSupplier = supplierSummary[0]
 
  // グラフデータ — 仕入先ごとに色分け
  const chartData = [...records]
    .sort((a, b) => a.recorded_date.localeCompare(b.recorded_date))
    .map(r => {
      const entry = { date: formatDateShort(r.recorded_date) }
      entry[r.supplier || '未設定'] = r.price
      return entry
    })
 
  // 仕入先比較バーチャートデータ
  const barData = supplierSummary.map(s => ({ name: s.supplier, price: s.latestPrice }))
 
  const handleDelete = async (recId) => {
    if (!confirm('この価格データを削除しますか？')) return
    await deletePriceRecord(recId)
    load()
  }
 
  const tabStyle = (tab) => ({
    padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
    cursor: 'pointer', border: 'none', background: activeTab === tab ? 'rgba(245,158,11,0.12)' : 'transparent',
    color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: 'inherit',
    transition: 'all 0.15s',
  })
 
  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none', marginBottom: 12 }}>
          <ArrowLeft size={13} /> 商品一覧に戻る
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {product.name}
              {latestRecord && lowestPrice && latestRecord.price <= lowestPrice && <LowestPriceBadge />}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {[product.code, product.category, product.unit && `単位: ${product.unit}`].filter(Boolean).join('  /  ')}
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ ...btnStyle('primary'), display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> 価格を追加
          </button>
        </div>
      </div>
 
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: '最新価格', value: latestRecord ? formatPrice(latestRecord.price) : '—', color: 'var(--accent)' },
          { label: '過去最安値', value: lowestPrice != null ? formatPrice(lowestPrice) : '—', color: 'var(--green)' },
          { label: '前回比', value: change ? `${change.pct > 0 ? '+' : ''}${change.pct.toFixed(1)}%` : '—', color: change?.direction === 'up' ? 'var(--red)' : change?.direction === 'down' ? 'var(--green)' : 'var(--text-muted)' },
          { label: '仕入先数', value: `${suppliers.length}社`, color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 6px', letterSpacing: '0.3px' }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 600, margin: 0, fontFamily: 'IBM Plex Mono', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
 
      {/* 推奨仕入先バナー */}
      {bestSupplier && suppliers.length > 1 && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>今月の推奨仕入先: {bestSupplier.supplier} </span>
            <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 600, color: 'var(--green)' }}>{formatPrice(bestSupplier.latestPrice)}</span>
            {supplierSummary[1] && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                （{supplierSummary[1].supplier}より {formatPrice(supplierSummary[1].latestPrice - bestSupplier.latestPrice)} 安い）
              </span>
            )}
          </div>
        </div>
      )}
 
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        <button onClick={() => setActiveTab('overview')} style={tabStyle('overview')}>価格推移グラフ</button>
        <button onClick={() => setActiveTab('supplier')} style={tabStyle('supplier')}>仕入先比較</button>
        <button onClick={() => setActiveTab('history')} style={tabStyle('history')}>価格履歴</button>
      </div>
 
      {/* Tab: 価格推移グラフ */}
      {activeTab === 'overview' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingDown size={14} color="var(--accent)" /> 仕入先別 価格推移
          </h2>
          {records.length < 2 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>2件以上の価格データがあるとグラフが表示されます</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `¥${v.toLocaleString()}`} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {lowestPrice && <ReferenceLine y={lowestPrice} stroke="var(--green)" strokeDasharray="4 4" />}
                {suppliers.length > 0 ? suppliers.map(s => (
                  <Line key={s} type="monotone" dataKey={s} stroke={supplierColorMap[s]} strokeWidth={2} dot={{ fill: supplierColorMap[s], r: 3 }} connectNulls />
                )) : (
                  <>
                    <Line type="monotone" dataKey="通常" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="キャンペーン" stroke="var(--blue)" strokeWidth={2} dot={{ fill: 'var(--blue)', r: 3 }} connectNulls strokeDasharray="5 3" />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
 
      {/* Tab: 仕入先比較 */}
      {activeTab === 'supplier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* バーチャート */}
          {barData.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 16px' }}>最新価格 比較バー</h2>
              <ResponsiveContainer width="100%" height={Math.max(120, barData.length * 50)}>
                <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `¥${v.toLocaleString()}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip formatter={(v) => formatPrice(v)} />
                  <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={i === 0 ? 'rgba(16,185,129,0.6)' : SUPPLIER_COLORS[(i + 1) % SUPPLIER_COLORS.length] + '99'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
 
          {/* 比較テーブル */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>仕入先別 詳細比較</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['仕入先', '最新価格', '最安値', '前回比', '記録数', ''].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplierSummary.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>仕入先が登録されていません。価格追加時に仕入先を入力してください。</td></tr>
                ) : supplierSummary.map((s, i) => {
                  const isBest = i === 0 && supplierSummary.length > 1
                  return (
                    <tr key={s.supplier} style={{ borderBottom: '1px solid var(--border)', background: isBest ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: supplierColorMap[s.supplier] || 'var(--text-muted)', display: 'inline-block', flexShrink: 0 }} />
                        {s.supplier}
                        {isBest && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--green)', color: '#000', padding: '1px 6px', borderRadius: 99 }}>最安値</span>}
                      </td>
                      <td style={{ padding: '11px 14px', fontFamily: 'IBM Plex Mono', fontWeight: 600, color: isBest ? 'var(--green)' : 'var(--accent)' }}>{formatPrice(s.latestPrice)}</td>
                      <td style={{ padding: '11px 14px', fontFamily: 'IBM Plex Mono', color: 'var(--green)' }}>{formatPrice(s.lowestPrice)}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {s.change ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: s.change.direction === 'up' ? 'var(--red)' : s.change.direction === 'down' ? 'var(--green)' : 'var(--text-muted)' }}>
                            {s.change.direction === 'up' ? '↑' : s.change.direction === 'down' ? '↓' : '—'} {s.change.direction !== 'eq' ? `${Math.abs(s.change.pct).toFixed(1)}%` : '変動なし'}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-muted)' }}>{s.count}件</td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>{formatDate(s.latestDate)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
 
      {/* Tab: 価格履歴 */}
      {activeTab === 'history' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>価格履歴</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['仕入日', '単価', 'タイプ', '前回比', '仕入先', 'メモ', ''].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>価格を追加してください。</td></tr>
              ) : records.map((r, i) => {
                const prev = records[i + 1]
                const isLowest = r.price === lowestPrice
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: isLowest ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{formatDate(r.recorded_date)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 600, color: isLowest ? 'var(--green)' : 'var(--accent)' }}>{formatPrice(r.price)}</span>
                        {isLowest && <LowestPriceBadge />}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}><PriceTypeBadge type={r.price_type} /></td>
                    <td style={{ padding: '10px 14px' }}><PriceChangeBadge current={r.price} previous={prev?.price} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      {r.supplier ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: supplierColorMap[r.supplier] || 'var(--text-muted)', display: 'inline-block' }} />
                          {r.supplier}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{r.notes || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', opacity: 0.5, padding: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
 
      {showAdd && (
        <Modal title="価格を追加" onClose={() => setShowAdd(false)}>
          <AddRecordForm
            productId={id}
            onSave={async (rec) => { await createPriceRecord(rec); load() }}
            onClose={() => setShowAdd(false)}
          />
        </Modal>
      )}
    </div>
  )
}
 
