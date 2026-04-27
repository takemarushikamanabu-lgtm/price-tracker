/**
 * OCR処理 — Claude APIを使って納品書から商品情報を抽出
 */

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const OCR_SYSTEM_PROMPT = `あなたは日本の納品書・請求書・仕入れ伝票のOCR専門家です。
画像から商品情報を抽出し、必ずJSON形式のみで返してください。
前置きや説明文は一切不要です。JSONのみを返してください。

抽出ルール:
- 商品名は正確に転記する
- 単価・価格は数値のみ（カンマや円記号を除去）
- 数量が不明な場合は null
- 日付は YYYY-MM-DD 形式（不明な場合は今日の日付）
- 仕入先は伝票上の会社名・店名（不明な場合は null）

返却フォーマット:
{
  "supplier": "仕入先名 or null",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "商品名",
      "price": 数値,
      "quantity": 数値 or null,
      "unit": "単位（個・本・袋等）or null"
    }
  ]
}`

/**
 * 画像ファイルをBase64に変換
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 画像・PDFから納品書データを抽出
 * @param {File} file - 画像またはPDFファイル
 * @returns {Promise<{supplier, date, items}>}
 */
export async function extractFromDeliveryNote(file) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Claude APIキーが設定されていません。.envファイルのVITE_ANTHROPIC_API_KEYを確認してください。')
  }

  const base64Data = await fileToBase64(file)
  const mediaType = file.type === 'application/pdf' ? 'application/pdf' : file.type

  // PDFはdocument type、画像はimage typeで送信
  const contentBlock = file.type === 'application/pdf'
    ? {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64Data }
      }
    : {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64Data }
      }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      system: OCR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            {
              type: 'text',
              text: 'この納品書から商品情報を抽出してください。JSONのみで返してください。'
            }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Claude API エラー: ${err.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const text = data.content.map(c => c.text || '').join('')

  // JSON抽出（```json ... ``` のラッパーがあっても対応）
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('OCR結果からJSONを抽出できませんでした。')
  }

  const result = JSON.parse(jsonMatch[0])
  return result
}
