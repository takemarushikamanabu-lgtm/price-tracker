import { useState } from 'react'
import { TrendingDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return }
    setLoading(true); setError(''); setMessage('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('確認メールを送りました。メールのリンクをクリックしてください。')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, background: '#F59E0B', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <TrendingDown size={24} color="#000" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>PriceRadar</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>仕入価格トラッカー</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          {/* Tab */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, marginBottom: 20 }}>
            {[['login', 'ログイン'], ['signup', '新規登録']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); setMessage('') }} style={{
                flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--bg-surface)' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: mode === m ? 500 : 400, fontSize: 13, fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>{l}</button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>メールアドレス</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com" style={{ width: '100%' }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>パスワード</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="8文字以上" style={{ width: '100%' }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: 12, margin: '0 0 12px' }}>{error}</p>}
          {message && <p style={{ color: 'var(--green)', fontSize: 12, margin: '0 0 12px' }}>{message}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '10px', background: '#F59E0B', color: '#000',
              border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14,
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
          アカウントごとにデータが分かれて管理されます
        </p>
      </div>
    </div>
  )
}
