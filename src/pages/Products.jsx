import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../lib/supabase'
import { formatPrice, formatDate } from '../lib/utils'
import Modal from '../components/Modal'
import { LowestPriceBadge } from '../components/PriceBadge'

function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial || { name: '', code: '', category: '', unit: '個', notes: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('商品名を入力してください'); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
    </div>
  )

  return (
    <div>
      {field('商品名 *', 'name', 'text', '例: 国産鶏もも肉')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {field('商品コード', 'code', 'text', '例: A-001')}
        {field('単位', 'unit', 'text', '例: kg, 個, 箱')}
      </div>
      {field('カテゴリ', 'category', 'text', '例: 食材, 飲料')}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>メモ</label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 12, margin: '0 0 12px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnStyle('ghost')}>キャンセル</button>
        <button onClick={handleSubmit} disabled={saving} style={btnStyle('primary')}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}

function btnStyle(variant) {
  const base = {
    padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', border: 'none', transition: 'all 0.15s', fontFamily: 'inherit',
  }
  if (variant === 'primary') return { ...base, background: 'var(--accent)', color: '#000' }
  if (variant === 'ghost') return { ...base, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
  if (variant === 'danger') return { ...base, background: 'rgba(239,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }
  return base
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const load = () => {
    setLoading(true)
    getProducts()
      .then(data => setProducts(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id) => {
    if (!confirm('この商品と全ての価格データを削除しますか？')) return
    await deleteProduct(id)
    load()
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px' }}>商品一覧</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{products.length}件登録</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ ...btnStyle('primary'), display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> 商品追加
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="商品名・コード・カテゴリで検索"
          style={{ width: '100%', paddingLeft: 34 }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['商品名', 'カテゴリ', '最新価格', '最安値', '最終更新', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.3px' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '24px 14px', color: 'var(--text-muted)', textAlign: 'center' }}>読み込み中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px 14px', color: 'var(--text-muted)', textAlign: 'center' }}>
                {search ? '該当する商品がありません' : '商品を追加してください'}
              </td></tr>
            ) : filtered.map(p => (
              <tr
                key={p.id}
                style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '11px 14px' }}>
                  <Link to={`/products/${p.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.name}
                    {p.latest_price != null && p.latest_price <= p.lowest_price && <LowestPriceBadge />}
                  </Link>
                  {p.code && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.code}</span>}
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{p.category || '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'IBM Plex Mono', fontWeight: 600, color: 'var(--accent)' }}>
                  {p.latest_price != null ? formatPrice(p.latest_price) : '—'}
                </td>
                <td style={{ padding: '11px 14px', fontFamily: 'IBM Plex Mono', color: 'var(--green)' }}>
                  {p.lowest_price != null ? formatPrice(p.lowest_price) : '—'}
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                  {formatDate(p.latest_date)}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setEditTarget(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4 }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, borderRadius: 4, opacity: 0.6 }}
                    >
                      <Trash2 size={13} />
                    </button>
                    <Link to={`/products/${p.id}`}>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showCreate && (
        <Modal title="商品を追加" onClose={() => setShowCreate(false)}>
          <ProductForm
            onSave={async (form) => { await createProduct(form); load() }}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      )}
      {editTarget && (
        <Modal title="商品を編集" onClose={() => setEditTarget(null)}>
          <ProductForm
            initial={editTarget}
            onSave={async (form) => { await updateProduct(editTarget.id, form); load() }}
            onClose={() => setEditTarget(null)}
          />
        </Modal>
      )}
    </div>
  )
}
