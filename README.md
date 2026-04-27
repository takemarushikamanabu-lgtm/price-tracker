# PriceRadar — 仕入価格トラッカー

納品書OCRと価格履歴管理に特化したWebアプリです。

## 機能

- **OCR自動入力** — 納品書の画像・PDFからClaude AIが商品名・単価・日付を抽出
- **価格履歴** — 通常価格 / キャンペーン価格を区別して記録
- **価格変動アラート** — 前回比の上昇・下落を自動表示
- **最安値トラッキング** — 商品ごとの過去最安値を自動管理
- **グラフ表示** — 価格推移を折れ線グラフで可視化
- **マルチデバイス同期** — Supabaseにより複数PCでリアルタイム共有

---

## セットアップ手順

### 1. リポジトリをクローン

```bash
git clone https://github.com/あなたのユーザー名/price-tracker.git
cd price-tracker
npm install
```

### 2. Supabaseの準備

1. [supabase.com](https://supabase.com) でアカウント作成 → 新規プロジェクト作成
2. **SQL Editor** を開き、`supabase/schema.sql` の内容を貼り付けて実行
3. **Project Settings > API** から以下をコピー:
   - `Project URL`
   - `anon public` キー

### 3. Claude APIキーの準備

1. [console.anthropic.com](https://console.anthropic.com) でAPIキーを発行
2. 無料クレジットで十分使えます（OCR 1回 ≈ $0.01〜$0.05）

### 4. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集:

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### 5. ローカル起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

---

## Vercelへのデプロイ（無料）

複数PCから使うにはVercelへデプロイします。

```bash
npm install -g vercel
vercel
```

デプロイ時にVercelの環境変数設定画面で `.env` の3つの値を入力してください。

その後は `vercel --prod` でデプロイ更新できます。

---

## 使い方

### OCR入力フロー

1. **OCR入力** ページを開く
2. 納品書の写真またはPDFをドロップ
3. Claude AIが自動で商品名・単価・日付を抽出
4. 内容を確認・修正し、「新規商品として登録」または「既存商品に紐付け」を選択
5. 「登録する」をクリック

### 価格アラートの見方

| 表示 | 意味 |
|------|------|
| 🟡 **最安値** バッジ | 過去最安値と同額以下 |
| 🟢 前回比 -X% | 前回より安くなった |
| 🔴 前回比 +X% | 前回より高くなった |

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | React 18 + Vite |
| スタイリング | Tailwind CSS |
| データベース | Supabase (PostgreSQL) |
| OCR | Claude API (claude-opus-4-6) |
| グラフ | Recharts |
| ホスティング | Vercel |

すべて**無料枠内**で運用可能です。

---

## ディレクトリ構成

```
price-tracker/
├── src/
│   ├── components/    # 共通コンポーネント
│   ├── pages/         # 画面
│   │   ├── Dashboard.jsx
│   │   ├── Products.jsx
│   │   ├── ProductDetail.jsx
│   │   └── OCRUpload.jsx
│   ├── lib/
│   │   ├── supabase.js  # DB操作
│   │   ├── ocr.js       # Claude OCR
│   │   └── utils.js     # ユーティリティ
│   └── App.jsx
├── supabase/
│   └── schema.sql       # DBスキーマ
├── .env.example
└── vercel.json
```
