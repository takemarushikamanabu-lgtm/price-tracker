import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ChevronRight, Pencil, Trash2, MoreVertical } from 'lucide-react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../lib/supabase'
import { formatPrice, formatDate } from '../lib/utils'
import Modal from '../components/Modal'
import { LowestPriceBadge } from '../components/PriceBadge'

function btnStyle(variant) {
  const base = { padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s', fontFamily: 'inherit' }
  if (variant === 'primary') return { ...base, background: 'var(--accent)', color: '#000' }
  if (variant === 'ghost') return { ...base, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
  return base
}

function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', code: '', category: '', unit: '個', notes: '' })
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const submit = async () => {
    if (!form.name.trim()) { setErr('商品名を入力してください'); return }
    setSaving(true)
    try { await onSave(form); onClose() } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }
  return (
    <div>
      {[['商品名 *', 'name', 'text', '例: 国産鶏もも肉'], ['カテゴリ', 'category', 'text', '例: 食材, 飲料']].map(([label, key, type, ph]) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</label>
          <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph} style={{ width: '100%' }} />
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>商品コード</label>
          <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="例: A-001" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>単位</label>
          <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="個, kg, 本..." style={{ width: '100%' }} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>メモ</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical' }} />
      </div>
      {err && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnStyle('ghost')}>キャンセル</button>
        <button onClick={submit} disabled={saving} style={btnStyle('primary')}>{saving ? '保存中...' : '保存'}</button>
      </div>
    </div>
  )
}

// スマホ用 操作メニュー
function MobileActionMenu({ product, onEdit, onDelete, onClose }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}
    >
      <div style={{ width: '100%', background: 'var(--bg-surface)', borderRadius: '16px 16px 0 0', border: '1px solid var(--border)', padding: '16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-primary)' }}>{product.name}</p>
        <button
          onClick={() => { onEdit(); onClose() }}
          style={{ width: '100%', padding: '13px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Pencil size={16} /> 編集
        </button>
        <button
          onClick={() => { onDelete(); onClose() }}
          style={{ width: '100%', padding: '13px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Trash2 size={16} /> 削除
        </button>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: '13px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [menuTarget, setMenuTarget] = useState(null)

  const load = () => {
    setLoading(true)
    getProducts().then(data => setProducts(data || [])).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(search.toLowerCase())
  )

  const addProd = async f => { await createProduct(f); load() }
  const editProd = async f => { await updateProduct(editTarget.id, f); load() }
  const delProd = async id => {
    if (!confirm('この商品と全ての価格データを削除しますか？')) return
    await deleteProduct(id); load()
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 2px' }}>商品一覧</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{products.length}件登録</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ ...btnStyle('primary'), display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px' }}>
          <Plus size={14} /> 追加
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="商品名・コード・カテゴリで検索" style={{ width: '100%', paddingLeft: 30 }} />
      </div>

      {/* PC テーブル */}
      <div className="pc-table" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['商品名', 'カテゴリ', '最新価格', '最安値', '最終更新', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>読み込み中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>{search ? '該当なし' : '商品を追加してください'}</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '11px 14px' }}>
                  <Link to={`/products/${p.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.name}
                    {p.latest_price != null && p.latest_price <= p.lowest_price && <LowestPriceBadge />}
                  </Link>
                  {p.code && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.code}</span>}
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{p.category || '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'IBM Plex Mono', fontWeight: 600, color: 'var(--accent)' }}>{p.latest_price != null ? formatPrice(p.latest_price) : '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'IBM Plex Mono', color: 'var(--green)' }}>{p.lowest_price != null ? formatPrice(p.lowest_price) : '—'}</td>
                <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(p.latest_date)}</td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditTarget(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Pencil size={13} /></button>
                    <button onClick={() => delProd(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, opacity: 0.6 }}><Trash2 size={13} /></button>
                    <Link to={`/products/${p.id}`}><ChevronRight size={14} color="var(--text-muted)" /></Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* スマホ カード */}
      <div className="mobile-cards">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>読み込み中...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>{search ? '該当なし' : '「追加」から商品を登録してください'}</p>
        ) : filtered.map(p => (
          <div key={p.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
            {/* カードヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <Link to={`/products/${p.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.name}
                  {p.latest_price != null && p.latest_price <= p.lowest_price && <LowestPriceBadge />}
                </div>
                {p.category && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.category}</div>}
              </Link>
              {/* 3点メニュー */}
              <button
                onClick={() => setMenuTarget(p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 6, flexShrink: 0 }}
              >
                <MoreVertical size={18} />
              </button>
            </div>

            {/* 価格情報 */}
            <Link to={`/products/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>最新価格</div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'IBM Plex Mono', color: 'var(--accent)' }}>{p.latest_price != null ? formatPrice(p.latest_price) : '—'}</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>最安値</div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'IBM Plex Mono', color: 'var(--green)' }}>{p.lowest_price != null ? formatPrice(p.lowest_price) : '—'}</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>更新日</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatDate(p.latest_date)}</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* モーダル類 */}
      {showCreate && (
        <Modal title="商品を追加" onClose={() => setShowCreate(false)}>
          <ProductForm onSave={addProd} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
      {editTarget && (
        <Modal title="商品を編集" onClose={() => setEditTarget(null)}>
          <ProductForm initial={editTarget} onSave={editProd} onClose={() => setEditTarget(null)} />
        </Modal>
      )}
      {/* スマホ 操作メニュー */}
      {menuTarget && (
        <MobileActionMenu
          product={menuTarget}
          onEdit={() => setEditTarget(menuTarget)}
          onDelete={() => delProd(menuTarget.id)}
          onClose={() => setMenuTarget(null)}
        />
      )}
    </div>
  )
}
