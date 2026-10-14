---
created: 2026-10-14
tags: [lol-duo-bot, decision, log]
status: 同期済み
---

# Obsidian 未同期ノート：Discord Activity 化

> 2026-10-14 に Vault へ転記済み：Decisions/2026-10-14_lol-duo-bot-activity化.md、Logs/2026-10-14_lol-duo-bot-activity実装.md、Projects/lol-duo-bot/overview.md。以降の記録は Vault 側で行う。

Vault（MyDevVault）へのアクセスがこの作業では許可されなかったため、AGENTS.md の規定どおり docs/ に保留ノートとして保存。Vault の Decisions/ と Logs/、[[overview]] へ転記が必要。

## 判断（Decisions 用）

**採用：** スラッシュコマンドBotを Discord Activity（Discord内で開くWebアプリ）に置き換え。各自が自由に閲覧する方式。公開先は Cloudflare Workers の静的配信。

**理由：** ユーザーが Tarkov ShareMap のような Discord 内アプリとして使いたいと希望。

**決めたこと**
- 旧Botは削除せず legacy-bot/ に退避（保守対象外）。
- 全員の画面を同期する方式は採らず、各自閲覧にした（作る量が少なく、同期サーバーが不要）。
- OAuth（ユーザーログイン）を使わず `ready()` のみ。Client Secret・Botトークン・サーバー側処理が不要になり、秘密情報を扱わない。
- データの正本は引き続き data/master.json。Activity はビルド時に読み込む。検査規則は catalog.py を catalog.js に移植。
- 外部フォント・外部画像は使わない（Discord の通信制限＝CSP を避けるため）。

**代替案とトレードオフ**
- 全員同期（ShareMap型）：通話中に説明しやすいが、リアルタイム通信の仕組み（Durable Objects 等）が必要。必要になったら追加検討。
- AWS で公開：慣れた環境だが S3/CloudFront 等の構成要素が増える。
- Bot と併存：コマンドでも引けるが二重保守になる。

## ログ（Logs 用）

- activity/ を新設（Vite 8.3.4、@discord/embedded-app-sdk 2.5.0、Vitest 5.0.4、Wrangler 4.151.0）。
- 画面：相方さがし（27項目・役割別一覧・名前検索）、タンクサポート（14体・星で難易度）、用語。狭い画面では一覧⇔詳細の切替。
- 表示方針の変更：評価幅の表記を「3–4/5」から「3〜4/5」に変更。25件ごとのページ送り（Discordメニューの制限由来）は廃止し、全件を一覧表示。
- テスト：17件成功、ビルド成功、PC幅・スマホ幅の画面撮影で崩れなし。
- 未実施：Discord内での起動確認、Cloudflare への公開。

## 次の作業

1. Developer Portal で Activities を有効化し、cloudflared で Discord 内表示を確認。
2. `npm run deploy` で公開し、URL Mappings を workers.dev に切替。
3. 本ノートを Vault に転記し、status を同期済みに変更。
