# wishlist-app (Cloudflare Workers 版)

Python / AWS Lambda 版 (`../src/wishlist_app`) を TypeScript / Cloudflare Workers に移植したもの。

| Python | TypeScript |
| --- | --- |
| `handler.py` (`lambda_handler`) | `src/index.ts` (HTTP 受け口 + 署名検証) / `src/handler.ts` |
| `messages.py` | `src/messages.ts` |
| `service.py` | `src/service.ts` |
| `llm/struct_text.py` | `src/llm/structText.ts` |
| `db/add_item_to_data_source.py` | `src/db/notion.ts` |
| - | `src/verify/alexaSignature.ts` (HTTPS エンドポイントに必須の署名検証) |

## 開発

```bash
npm install
npm test           # vitest
npm run typecheck
```

## デプロイ手順

1. シークレットを登録する
   ```bash
   npx wrangler secret put OPENAI_API_KEY
   npx wrangler secret put NOTION_API_KEY
   ```
2. `wrangler.jsonc` の `ALEXA_SKILL_ID` にスキルIDを設定する
3. デプロイする
   ```bash
   npm run deploy
   ```
4. Alexa Developer Console の「エンドポイント」で **HTTPS** を選択し、
   デプロイされた URL (`https://wishlist-app.<subdomain>.workers.dev`) を設定する。
   SSL 証明書の種類は「開発用のエンドポイントは、証明機関が発行したワイルドカード証明書を持つドメインのサブドメインです」を選ぶ

## 注意

- 署名検証があるため、`curl` などで直接叩いても 400 になる。動作確認は Alexa Developer Console のテストタブで行う
