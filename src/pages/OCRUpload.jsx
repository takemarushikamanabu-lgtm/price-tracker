import { useState, useRef } from 'react'
import { ScanLine, Upload, CheckCircle, AlertCircle, Loader, X, Plus, Link2 } from 'lucide-react'
import { extractFromDeliveryNote } from '../lib/ocr'
import { getProducts, createProduct, bulkCreatePriceRecords } from '../lib/supabase'
import { today } from '../lib/utils'

function btnStyle(variant) {
  const base = { padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s', fontFamily: 'inherit' }
  if (variant === 'primary') return { ...base, background: 'var(--accent)', color: '#000' }
  if (variant === 'ghost') return { ...base, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
  if (variant === 'green') return { ...base, background: 'rgba(16,185,129,0.15)', color: 'var(--green)', border: '1px solid rgba(16,185,129,0.3)' }
  return base
}

// Step 1: Upload
function UploadStep({ onResult, onError }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const inputRef = useRef()

  const process = async (file) => {
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      onError('JPG / PNG / WebP / PDF のみ対応しています')
      return
    }
    setLoading(true)
    setStatus('Claude APIで解析中...')
    try {
      const result = await extractFromDeliveryNote(file)
      onResult(result, file.name)
    } catch (e) {
      onError(e.message)
    } finally {
      setLoading(false)
      setStatus('')
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    process(file)
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: '52px 20px',
          textAlign: 'center',
          cursor: loading ? 'default' : 'pointer',
          background: dragging ? 'rgba(245,158,11,0.05)' : 'var(--bg-surface)',
          transition: 'all 0.2s',
        }}
      >
        <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => process(e.target.files[0])} />
        {loading ? (
          <div>
            <Loader size={36} color="var(--accent)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>{status}</p>
          </div>
        ) : (
          <div>
            <Upload size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, margin: '0 0 6px' }}>
              納品書をドロップ、またはクリックして選択
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
              JPG / PNG / WebP / PDF 対応
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Step 2: Review & match
function ReviewStep({ result, fileName, onSave, onBack }) {
  const [items, setItems] = useState(
    (result.items || []).map((item, i) => ({
      ...item,
      id: i,
      price_type: 'regular',
      recorded_date: result.date || today(),
      supplier: result.supplier || '',
      notes: '',
      productId: '',       // linked product id
      productName: '',     // linked product name
      newProductName: item.name,  // used when creating new product
      action: 'new',       // 'new' | 'link' | 'skip'
    }))
  )
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Load products for linking
  useState(() => {
    getProducts().then(p => setProducts(p || [])).catch(() => {})
  }, [])

  const update = (id, key, val) => setItems(prev => prev.map(item => item.id === id ? { ...item, [key]: val } : item))

  const handleSave = async () => {
    const toProcess = items.filter(i => i.action !== 'skip')
    if (toProcess.length === 0) { setError('少なくとも1件は登録してください'); return }
    setSaving(true)
    setError('')
    try {
      const records = []
      for (const item of toProcess) {
        let productId = item.productId
        // Create new product if needed
        if (item.action === 'new') {
          const newProduct = await createProduct({ name: item.newProductName || item.name, unit: item.unit || '個' })
          productId = newProduct.id
        }
        if (!productId) continue
        records.push({
          product_id: productId,
          price: Number(item.price),
          price_type: item.price_type,
          supplier: item.supplier || null,
          recorded_date: item.recorded_date,
          notes: item.notes || null,
          source: 'ocr',
        })
      }
      await bulkCreatePriceRecords(records)
      setSaved(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (saved) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <CheckCircle size={48} color="var(--green)" style={{ margin: '0 auto 16px' }} />
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>登録完了！</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>{items.filter(i => i.action !== 'skip').length}件の価格データを保存しました</p>
      <button onClick={onBack} style={btnStyle('primary')}>続けて入力する</button>
    </div>
  )

  return (
    <div>
      {/* Meta info */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, display: 'flex', gap: 20 }}>
        <span><span style={{ color: 'var(--text-muted)' }}>ファイル: </span>{fileName}</span>
        {result.supplier && <span><span style={{ color: 'var(--text-muted)' }}>仕入先: </span>{result.supplier}</span>}
        {result.date && <span><span style={{ color: 'var(--text-muted)' }}>日付: </span>{result.date}</span>}
      </div>

      {/* Items */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
          抽出された {items.length} 件の商品を確認・修正してください
        </p>
        {items.map((item) => (
          <div key={item.id} style={{
            background: item.action === 'skip' ? 'var(--bg-surface)' : 'var(--bg-surface)',
            border: `1px solid ${item.action === 'skip' ? 'var(--border)' : 'var(--border-light)'}`,
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 10,
            opacity: item.action === 'skip' ? 0.4 : 1,
          }}>
            {/* Action tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[
                { key: 'new', label: '新規商品として登録', icon: Plus },
                { key: 'link', label: '既存商品に紐付け', icon: Link2 },
                { key: 'skip', label: 'スキップ', icon: X },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => update(item.id, 'action', key)}
                  style={{
                    ...btnStyle('ghost'),
                    padding: '5px 10px',
                    fontSize: 11,
                    color: item.action === key ? 'var(--accent)' : 'var(--text-muted)',
                    borderColor: item.action === key ? 'var(--accent)' : 'transparent',
                    background: item.action === key ? 'rgba(245,158,11,0.1)' : 'var(--bg-elevated)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Icon size={11} /> {label}
                </button>
              ))}
            </div>

            {item.action !== 'skip' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10 }}>
                {/* Product name / link */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {item.action === 'link' ? '既存商品を選択' : '商品名'}
                  </label>
                  {item.action === 'link' ? (
                    <select
                      value={item.productId}
                      onChange={e => update(item.id, 'productId', e.target.value)}
                      style={{ width: '100%', fontSize: 12 }}
                    >
                      <option value="">-- 選択 --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={item.newProductName}
                      onChange={e => update(item.id, 'newProductName', e.target.value)}
                      style={{ width: '100%', fontSize: 12 }}
                    />
                  )}
                </div>
                {/* Price */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>単価</label>
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => update(item.id, 'price', e.target.value)}
                    style={{ width: '100%', fontSize: 12 }}
                  />
                </div>
                {/* Price type */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>タイプ</label>
                  <select
                    value={item.price_type}
                    onChange={e => update(item.id, 'price_type', e.target.value)}
                    style={{ width: '100%', fontSize: 12 }}
                  >
                    <option value="regular">通常</option>
                    <option value="campaign">キャンペーン</option>
                  </select>
                </div>
                {/* Date */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>仕入日</label>
                  <input
                    type="date"
                    value={item.recorded_date}
                    onChange={e => update(item.id, 'recorded_date', e.target.value)}
                    style={{ width: '100%', fontSize: 12 }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onBack} style={btnStyle('ghost')}>← やり直す</button>
        <button onClick={handleSave} disabled={saving} style={{ ...btnStyle('green'), display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={14} />
          {saving ? '保存中...' : `${items.filter(i => i.action !== 'skip').length}件を登録する`}
        </button>
      </div>
    </div>
  )
}

export default function OCRUpload() {
  const [step, setStep] = useState('upload') // 'upload' | 'review'
  const [ocrResult, setOcrResult] = useState(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  const handleResult = (result, name) => {
    setOcrResult(result)
    setFileName(name)
    setStep('review')
    setError('')
  }

  const reset = () => {
    setStep('upload')
    setOcrResult(null)
    setFileName('')
    setError('')
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ScanLine size={20} color="var(--accent)" /> OCR入力
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          納品書・請求書の画像をアップロードして自動入力
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        {['画像アップロード', 'データ確認・登録'].map((label, i) => {
          const current = step === 'upload' ? 0 : 1
          const active = i === current
          const done = i < current
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--bg-elevated)',
                border: `2px solid ${done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: done || active ? '#000' : 'var(--text-muted)',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
              {i < 1 && <span style={{ color: 'var(--border)', margin: '0 4px' }}>—</span>}
            </div>
          )
        })}
      </div>

      {/* Main card */}
      <div style={{ maxWidth: 740 }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--red)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>エラー:</strong> {error}
              <br />
              <button onClick={() => setError('')} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>閉じる</button>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <UploadStep onResult={handleResult} onError={setError} />
        )}
        {step === 'review' && ocrResult && (
          <ReviewStep result={ocrResult} fileName={fileName} onSave={() => {}} onBack={reset} />
        )}
      </div>

      {/* Tips */}
      {step === 'upload' && (
        <div style={{ marginTop: 28, maxWidth: 740, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, margin: '0 0 8px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>📋 認識精度を上げるコツ</h3>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <li>明るい場所で撮影し、文字がはっきり見えるようにする</li>
            <li>傾きなく、正面から撮影する</li>
            <li>PDFで保存できる場合はPDFの方が精度が高い</li>
            <li>抽出結果は必ず確認・修正してから登録してください</li>
          </ul>
        </div>
      )}
    </div>
  )
}
