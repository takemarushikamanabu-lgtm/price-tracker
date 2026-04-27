import { createClient } from '@supabase/supabase-js'
 
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
 
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
 
// 現在のユーザーIDを取得
async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id
}
 
// ===== Products =====
 
export async function getProducts() {
  const { data, error } = await supabase
    .from('product_price_summary')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}
 
export async function getProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
 
export async function createProduct(product) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('products')
    .insert({ ...product, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}
 
export async function updateProduct(id, updates) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
 
export async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
  if (error) throw error
}
 
// ===== Price Records =====
 
export async function getPriceRecords(productId) {
  const { data, error } = await supabase
    .from('price_records')
    .select('*')
    .eq('product_id', productId)
    .order('recorded_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
 
export async function createPriceRecord(record) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('price_records')
    .insert({ ...record, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}
 
export async function deletePriceRecord(id) {
  const { error } = await supabase
    .from('price_records')
    .delete()
    .eq('id', id)
  if (error) throw error
}
 
export async function bulkCreatePriceRecords(records) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('price_records')
    .insert(records.map(r => ({ ...r, user_id: userId })))
    .select()
  if (error) throw error
  return data
}
 
export async function getRecentRecords(limit = 20) {
  const { data, error } = await supabase
    .from('price_records')
    .select(`*, products(name, code, unit)`)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
 
export async function getCategories() {
  const { data, error } = await supabase
    .from('products')
    .select('category')
  if (error) throw error
  const cats = [...new Set(data.map(d => d.category).filter(Boolean))]
  return cats
}
 
