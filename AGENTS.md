# LoL Duo Bot 作業指示

## 正本と作業範囲
- 正式な作業フォルダ：C:\Users\zyons\program\projects\lol-duo-bot
- GitHub：https://github.com/yanamikko873/lol-duo-bot（公開）。作業フォルダはそのクローン。公開リポジトリなので秘密情報を書かない。
- 開始時に親の C:\Users\zyons\program\README.md を読む。
- 起動・テスト手順はREADME.mdを参照。既存の動作する配置を尊重し、依頼のない大規模リファクタリングは行わない。
- 2026-10-14 にDiscord Activity版（activity/）へ置き換え。旧Bot（bot.py、catalog.py、tests/test_bot.py）はlegacy-bot/に退避し保守対象外。data/master.jsonは引き続き正本。template由来のsrc/、test/、空のtests/は未使用。
- 曖昧な仕様・固有名詞は確認する。秘密情報や認証ファイルを書き換えず、トークンをコード・ノート・会話に残さない。

## Obsidianへの継続記録（ユーザー指定）
- Vault：C:\Users\zyons\Documents\MyDevVault
- 作業開始時はVaultのCLAUDE.mdとProjects\lol-duo-bot\overview.mdを読む。
- 意味のある設計判断、仕様・データ変更、検証結果、障害と解決、未解決事項を作業の区切りと終了前に保存する。作業をしていない時間の自動監視・同期は行わない。
- Projects/lol-duo-bot/overview.md：現在の状態、正本の場所、次の作業、関連ノート。
- Decisions/：採用案・理由・代替案のトレードオフ。既存判断は追記のみ。過去の判断を遡って書き換えない。
- Logs/：実行内容、テスト結果、エラーの要約、修復方法。機密情報は除外。
- YAML frontmatterにcreated、tags、statusを付け、関連ノートに[[...]]リンクを張る。
- コード全文はVaultに複製しない。コードとデータの正本はプロジェクト側。
- Vaultに書けない場合はdocs/に保留ノートを保存し、未同期であることを報告する。同期済みと偽らない。

## データ品質と検証
- Botの唯一の読込元はdata/master.json。MASTER.mdは確認用で自動同期ではない。
- 元資料の相性評価とゲーム仕様の事実を区別する。未記載の点数や候補を旧版から補完しない。
- 動画で確認した項目にはevidence_urlを付ける。現在の動画検証はサミーラ・ザヤ・シヴィア・ベイガーの4項目だけ。
- データ変更時は activity で npm test を実行して表示・逆引き・検索を確認し、MASTER.mdと資料説明も更新する。
- 実サーバー未接続のテストを実接続済みと表現しない。
- 完了報告は変更点・理由・ユーザーが確認すべき点を簡潔に示す。
