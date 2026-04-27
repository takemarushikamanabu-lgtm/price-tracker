-- ============================================
-- PriceRadar — Supabase Schema
-- Supabase SQL Editor で実行してください
-- ============================================

-- 商品マスタ
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text,
  category text,
  unit text default '個',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 価格履歴
create table if not exists price_records (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  price numeric(12, 2) not null,
  price_type text check (price_type in ('regular', 'campaign')) default 'regular',
  supplier text,
  recorded_date date not null default current_date,
  notes text,
  source text default 'manual',  -- 'manual' | 'ocr'
  created_at timestamptz default now()
);

-- インデックス
create index if not exists idx_price_records_product_id on price_records(product_id);
create index if not exists idx_price_records_recorded_date on price_records(recorded_date desc);

-- RLS（Row Level Security）— 全員アクセス可（チームで使う場合はAuth追加を推奨）
alter table products enable row level security;
alter table price_records enable row level security;

create policy "allow_all_products" on products for all using (true) with check (true);
create policy "allow_all_price_records" on price_records for all using (true) with check (true);

-- 最安値ビュー（便利なのでViewとして定義）
create or replace view product_price_summary as
select
  p.id,
  p.name,
  p.code,
  p.category,
  p.unit,
  min(pr.price) as lowest_price,
  max(pr.price) as highest_price,
  (
    select pr2.price
    from price_records pr2
    where pr2.product_id = p.id
    order by pr2.recorded_date desc, pr2.created_at desc
    limit 1
  ) as latest_price,
  (
    select pr3.recorded_date
    from price_records pr3
    where pr3.product_id = p.id
    order by pr3.recorded_date desc, pr3.created_at desc
    limit 1
  ) as latest_date,
  count(pr.id)::int as record_count
from products p
left join price_records pr on pr.product_id = p.id
group by p.id, p.name, p.code, p.category, p.unit;

-- updated_at を自動更新するトリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();
