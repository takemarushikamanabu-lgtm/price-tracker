import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import OCRUpload from './pages/OCRUpload'
import Login from './pages/Login'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ローディング中
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', color: 'var(--text-muted)', fontSize: 14 }}>
        読み込み中...
      </div>
    )
  }

  // 未ログイン
  if (!session) {
    return <Login />
  }

  // ログイン済み
  return (
    <Layout session={session}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/ocr" element={<OCRUpload />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}
