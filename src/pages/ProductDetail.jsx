import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, TrendingDown } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend
} from 'recharts'
import { getProduct, getPriceRecords, createPriceRecord, deletePriceRecord } from '../lib/supabase'
import { formatPrice, formatDate, formatDateShort, calcPriceChange, today } from '../lib/utils'
import { PriceChangeBadge, PriceTypeBadge, LowestPriceBadge } from '../components/PriceBadge'
import Modal from '../components/Modal'

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
          <input type="text" value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="業者名" style={{ width: '100%' }} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>メモ</label>
        <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="備考など" style={{ width: '100%' }} />
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 12, margin: '0 0 12px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnStyle('ghost')}>キャンセル</button>
        <button onClick={handleSubmit} disabled={saving} style={btnStyle('primary')}>{saving ? '保存中...' : '登録'}</button>
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

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

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

  // Chart data — chronological
  const chartData = [...records]
    .sort((a, b) => a.recorded_date.localeCompare(b.recorded_date))
    .map(r => ({
      date: formatDateShort(r.recorded_date),
      fullDate: r.recorded_date,
      通常: r.price_type === 'regular' ? r.price : undefined,
      キャンペーン: r.price_type === 'campaign' ? r.price : undefined,
    }))

  const handleDelete = async (recId) => {
    if (!confirm('この価格データを削除しますか？')) return
    await deletePriceRecord(recId)
    load()
  }

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '最新価格', value: latestRecord ? formatPrice(latestRecord.price) : '—', color: 'var(--accent)' },
          { label: '過去最安値', value: lowestPrice != null ? formatPrice(lowestPrice) : '—', color: 'var(--green)' },
          { label: '前回比', value: change ? `${change.pct > 0 ? '+' : ''}${change.pct.toFixed(1)}%` : '—', color: change?.direction === 'up' ? 'var(--red)' : change?.direction === 'down' ? 'var(--green)' : 'var(--text-muted)' },
          { label: '記録数', value: `${records.length}件`, color: 'var(--text-primary)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 6px', letterSpacing: '0.3px' }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 600, margin: 0, fontFamily: 'IBM Plex Mono', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingDown size={14} color="var(--accent)" /> 価格推移
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `¥${v.toLocaleString()}`} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              {lowestPrice && (
                <ReferenceLine y={lowestPrice} stroke="var(--green)" strokeDasharray="4 4" label={{ value: '最安値', fill: 'var(--green)', fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="通常" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} connectNulls />
              <Line type="monotone" dataKey="キャンペーン" stroke="var(--blue)" strokeWidth={2} dot={{ fill: 'var(--blue)', r: 3 }} connectNulls strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Price history table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>価格履歴</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['仕入日', '単価', 'タイプ', '前回比', '仕入先', 'メモ', ''].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.3px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>価格データがありません。「価格を追加」から登録してください。</td></tr>
            ) : records.map((r, i) => {
              const prev = records[i + 1]
              const isLowest = r.price === lowestPrice
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: isLowest ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{formatDate(r.recorded_date)}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'IBM Plex Mono', fontWeight: 600, color: isLowest ? 'var(--green)' : 'var(--accent)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {formatPrice(r.price)}
                      {isLowest && <LowestPriceBadge />}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}><PriceTypeBadge type={r.price_type} /></td>
                  <td style={{ padding: '10px 14px' }}><PriceChangeBadge current={r.price} previous={prev?.price} /></td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{r.supplier || '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{r.notes || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', opacity: 0.5, padding: 4, borderRadius: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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
