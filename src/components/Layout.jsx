import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { TrendingDown, LogOut, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const navItems = [
  { to: '/', label: 'ホーム', emoji: '📊' },
  { to: '/products', label: '商品', emoji: '📦' },
  { to: '/ocr', label: 'OCR', emoji: '🔍' },
]

function SettingsSheet({ session, onClose }) {
  const email = session?.user?.email || ''
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div style={{
        width: '100%', background: 'var(--bg-surface)',
        borderRadius: '16px 16px 0 0',
        border: '1px solid var(--border)',
        padding: '20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>設定</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>ログイン中のアカウント</p>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{email}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '13px', borderRadius: 10,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: 'var(--red)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <LogOut size={16} /> ログアウト
        </button>
      </div>
    </div>
  )
}

export default function Layout({ children, session }) {
  const location = useLocation()
  const [showSettings, setShowSettings] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const email = session?.user?.email || ''
  const initial = email.charAt(0).toUpperCase()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ===== PC サイドバー ===== */}
      <aside className="sidebar" style={{
        width: 220, flexShrink: 0, background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        flexDirection: 'column', position: 'fixed', top: 0, left: 0,
        height: '100vh', zIndex: 50,
      }}>
        <div style={{
          padding: '20px 20px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown size={18} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>PriceRadar</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>仕入価格トラッカー</div>
          </div>
        </div>

        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {navItems.map(({ to, emoji, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 6, marginBottom: 2,
                textDecoration: 'none', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
              })}
            >
              <span>{emoji}</span>{label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>{initial}</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            <LogOut size={12} /> ログアウト
          </button>
        </div>
      </aside>

      {/* ===== メインコンテンツ ===== */}
      <main className="main-content" style={{ flex: 1, minHeight: '100vh', maxWidth: 'calc(100vw - 220px)' }}>
        {children}
      </main>

      {/* ===== スマホ ボトムナビ ===== */}
      <nav className="bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg-surface)', borderTop: '0.5px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'flex' }}>
          {navItems.map(({ to, label, emoji }) => {
            const isActive = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to)
            return (
              <NavLink key={to} to={to} end={to === '/'}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 4, padding: '10px 0 6px',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 26, lineHeight: 1 }}>{emoji}</span>
                <span style={{ fontSize: 11, color: isActive ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isActive ? 600 : 400 }}>
                  {label}
                </span>
              </NavLink>
            )
          })}
          <button
            onClick={() => setShowSettings(true)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4, padding: '10px 0 6px',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 26, lineHeight: 1 }}>⚙️</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>設定</span>
          </button>
        </div>
      </nav>

      {showSettings && (
        <SettingsSheet session={session} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
