import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ScanLine, TrendingDown, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'ホーム', emoji: '📊' },
  { to: '/products', icon: Package, label: '商品', emoji: '📦' },
  { to: '/ocr', icon: ScanLine, label: 'OCR', emoji: '🔍' },
]

export default function Layout({ children, session }) {
  const location = useLocation()

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
          <div style={{
            width: 32, height: 32, background: 'var(--accent)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingDown size={18} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>PriceRadar</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>仕入価格トラッカー</div>
          </div>
        </div>

        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 6, marginBottom: 2,
                textDecoration: 'none', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,158,11,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: 'var(--accent)', flexShrink: 0,
            }}>{initial}</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </p>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
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
        {/* ユーザー情報（スマホ）*/}
        <div style={{
          position: 'absolute', top: -36, right: 12,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
        </div>

        <div style={{ display: 'flex' }}>
          {navItems.map(({ to, label, emoji }) => {
            const isActive = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to)
            return (
              <NavLink key={to} to={to} end={to === '/'}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 3, padding: '8px 0 4px',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
                <span style={{ fontSize: 10, color: isActive ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isActive ? 600 : 400 }}>
                  {label}
                </span>
              </NavLink>
            )
          })}
          {/* ログアウトボタン */}
          <button onClick={handleLogout} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, padding: '8px 0 4px',
            background: 'none', border: 'none', cursor: 'pointer',
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>👤</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>設定</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
