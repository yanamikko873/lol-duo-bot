# LoL初心者向け ADC / サポート相性ガイド（Discord Activity）

Discordの中で開く小さなWebアプリ（**Activity**）です。ボイスチャンネルやテキストチャンネルのアプリ起動ボタン（App Launcher）から開くと、ADCを選ぶだけでおすすめのサポートと理由が表示されます。PC版LoLが対象で、ADC/APC 27項目（ヴァルスは2ビルド）とタンク系サポート14体を収録しています。

- **Activity** … Discordの画面の中に埋め込まれて動くWebページ。チャットBotが「文字で返事をする受付係」なら、Activityは「みんなの前に広げる小さな冊子」です。
- 開いた人がそれぞれ自由に操作する方式です（他の人の画面とは連動しません）。
- 以前の `/duo` などのスラッシュコマンドBotは `legacy-bot/` に退避しました（保守対象外）。

## 画面

| タブ | できること |
| --- | --- |
| 相方さがし | 27項目を役割ごとに一覧（アイコンと AD/AP の表示つき）。名前で絞り込み（ひらがな・「カイサ」なども可）。選ぶと相方候補・向いているタイプ・理由・補足を表示 |
| タンクサポート | 14体を難易度の星つきで一覧。得意なこと・注意点・そのサポートを名前で挙げているADCを表示 |
| 用語 | CC・ピール・エンゲージなどの初心者向け用語と星の読み方 |

**AD** は物理ダメージ中心、**AP** は魔法ダメージ中心という意味です。資料で名前に「(APC)」と付いた4体（ジグス・スウェイン・セラフィーン・ベイガー）を AP、それ以外を AD と表示します。サポートには付けていません。

アイコン画像は Riot Games 公式の画像配信（**Data Dragon**）から取得します。`npm run deploy` の最初に `scripts/fetch-icons.mjs` が自動で実行され、まだない画像だけを `activity/src/assets/champions/` に保存します。取得できなかった画像は名前の頭文字で表示されます。日本語名と画像IDの対応表は `data/champion_ids.json` にあります（ゲーム仕様の事実で、相性資料とは別ファイル）。

相方候補のうちタンクサポートは押すと詳細へ移動できます。逆にタンク詳細からADCへも移動できます。動画で確認した4項目（サミーラ・ザヤ・シヴィア・ベイガー）は「元動画の該当箇所を開く」から外部ブラウザでYouTubeを開けます。

表示ルールは旧Botと同じです。おすすめは提供資料の見解で、勝率ランキングではありません。資料にない評価・候補は補いません。「エンチャンター」などのタイプ名を個別チャンピオンへ展開しません。名前がないことは相性が悪いことを意味しません。難易度の3〜4のような幅は、薄い星で表します。

## リポジトリ

GitHub：https://github.com/yanamikko873/lol-duo-bot （公開）

このフォルダがそのままリポジトリのクローンです。別のPCで作業するときは `git clone https://github.com/yanamikko873/lol-duo-bot.git` で取得し、`activity/.env`（Client ID）を作ってから `activity/tools/2-deploy.cmd` を実行します。アイコン画像と `.env` はリポジトリに含めていません（画像は公開時に自動取得されます）。

## フォルダ構成

```
lol-duo-bot/
├── data/master.json      相性データの本体（唯一の読込元）
├── data/champion_ids.json  日本語名 → 画像ID（Riot Data Dragon 16.20.1）
├── activity/             Discord Activity 本体
│   ├── index.html
│   ├── src/catalog.js    データの読込・検査（旧 catalog.py と同じ規則）
│   ├── src/view.js       画面の組み立て
│   ├── src/main.js       起動と操作の処理
│   ├── src/discord.js    Discord との接続
│   ├── src/icons.js      名前 → アイコン画像
│   ├── src/style.css
│   ├── src/assets/champions/  アイコン画像（自動取得）
│   ├── scripts/fetch-icons.mjs  アイコン取得
│   ├── tools/2-deploy.cmd       ダブルクリックで準備→テスト→公開
│   ├── tests/            自動テスト（Vitest）
│   ├── vite.config.js    開発用サーバーとビルドの設定（Vite）
│   ├── wrangler.jsonc    Cloudflare への公開設定
│   └── .env.example      Client ID の記入例
├── legacy-bot/           旧スラッシュコマンドBot（退避・保守対象外）
├── docs/                 作業記録（Obsidian 未同期分）
├── MASTER.md / DATA_REVIEW.md / VIDEO_REVIEW.md  データの確認用資料
└── TEST_RESULTS.md
```

用語：**Vite**（ヴィート）はWebページを開発中に手元で表示し、公開用に1つにまとめる道具。**Vitest** はその仲間のテスト道具。**Cloudflare Workers** はWebページを世界中に配信してくれるサービスで、今回は無料枠で足ります。

## 仕組み（ざっくり）

```
Discord ──(iframe＝ページ内の小窓)──▶ Discordの中継サーバー ──▶ Cloudflare に置いた activity の画面
```

Discordは外部のページを直接は開かず、自分の中継サーバー経由で読み込みます。そのため Developer Portal の **URL Mappings**（「この住所のページを中継してね」という登録）が必要です。

今回は「各自で見るだけ」なので、ユーザーのログイン（OAuth）は使いません。Discordとは「準備できた」の合図（`ready()`）をやり取りするだけです。そのため **Client Secret（秘密の合言葉）もBotトークンも不要**で、サーバー側のプログラムもありません。必要なのは公開して問題ない **Client ID** だけです。

## 1. Discord 側の準備

1. Discordの「ユーザー設定 → 詳細設定」で **開発者モード** をオンにします（開発中のActivityを起動するのに必要）。
2. [Discord Developer Portal](https://discord.com/developers/applications) で New Application を作成します。旧Botのアプリを使い回しても、新しく作っても構いません。
3. **Installation** で Installation Contexts の「Guild Install」と「User Install」を両方オンにします。
4. **OAuth2** の Redirects に `https://127.0.0.1` を入れて保存します（Activityでは実際には使われない必須項目の仮の値）。同じ画面の **Client ID** を控えます。
5. **先に Activities → URL Mappings を登録します。** PREFIX `/` の TARGET に、下の「2. 手元で試す」で作る一時URL、または「3. 公開する」で得たURLを入れます（`https://` は付けない）。そのため、このステップの前に 2 か 3 を済ませてURLを手に入れておきます。
6. その後で **Activities → Settings** の `Enable Activities` をオンにします。自動で「Launch」というコマンドが作られ、これがActivityの起動ボタンになります。

> **順番に注意：** URL Mappings が空のまま `Enable Activities` をオンにすると、Developer Portal の画面が「Unexpected Application Error! / Failed to execute 'removeChild'」で落ちることがあります（2026-10-14 に実際に発生）。落ちた場合は再読み込みし、URL Mappings を先に登録してからオンにしてください。

開発中のActivityを起動できるのは、アプリの持ち主（または開発チームのメンバー）だけです。友人にも試してもらう場合は [Developer Team](https://discord.com/developers/teams) を作ってアプリの持ち主に設定してください。

## 2. 手元で試す（Windows PowerShell）

[Node.js](https://nodejs.org/) 22.12 以上が必要です（`node -v` で確認）。

```powershell
cd activity
npm install
Copy-Item .env.example .env
notepad .env          # VITE_DISCORD_CLIENT_ID= の後ろに Client ID を貼って保存
npm test              # 自動テスト（Discord不要）
npm run dev           # http://localhost:5173 で起動
```

ブラウザで http://localhost:5173 を開くと「ブラウザ確認モード」で画面を確認できます。

Discordの中で試すには、別のPowerShellで [cloudflared](https://github.com/cloudflare/cloudflared/releases) を使って一時的な公開URLを作ります。

```powershell
cloudflared tunnel --url http://localhost:5173
```

表示された `https://xxxx.trycloudflare.com` の `xxxx.trycloudflare.com` 部分を、URL Mappings の PREFIX `/` の TARGET に登録します（まだなら、ここで「1. Discord 側の準備」の手順6 `Enable Activities` をオンにします）。その後、テストサーバーのチャンネルで App Launcher（ロケットのアイコン）からアプリ名を探して起動します。このURLは cloudflared を起動し直すたびに変わるので、そのたびに登録し直してください。

## 3. 公開する（Cloudflare）

[Cloudflare](https://dash.cloudflare.com/sign-up) のアカウント（無料）を作っておきます。

```powershell
cd activity
npx wrangler login    # ブラウザが開くので Cloudflare にログインして許可
npm run deploy        # ビルドして公開
```

最後に `https://lol-duo-activity.<あなたのサブドメイン>.workers.dev` が表示されます。URL Mappings の PREFIX `/` の TARGET を `lol-duo-activity.<あなたのサブドメイン>.workers.dev` に変更すれば、PCを付けっぱなしにしなくても使えます。

`.env` の Client ID はビルド時に画面へ埋め込まれます（公開してよい値です）。データを更新したら `npm run deploy` を再実行してください。

## データの更新

`data/master.json` を編集し、`activity` で `npm test` を実行してから `npm run deploy` します。JSONの意味は旧版と同じです（`supports` は明示された個別名、`support_groups` はタイプや条件、`reason` は理由、`review_notes` は補足、タンクの `difficulty` は `min` と `max` の1〜5整数）。未記載の評価値は `null` のままにしてください。`MASTER.md` は自動同期されないので、合わせて手で更新します。

## 動作確認チェックリスト（Discord上）

自動テストは Discord に接続しません。実際のDiscordでは次を確認してください（結果は `TEST_RESULTS.md` に記録）。

1. App Launcher からActivityが開き、上部に「ブラウザ確認モード」の表示が出ない。
2. 相方さがしでルシアンを選び、ナミ / ミリオ / ブラウムと理由が出る。
3. 「ヴァルス」で絞り込むと2ビルドが出る。サミーラはレル・ノーチラス・アリスター。
4. サミーラの「元動画の該当箇所を開く」で、外部リンクの確認が出てYouTubeが開く。
5. タンクサポートでノーチラスが1/5、ラカンとガリオが3〜4/5と表示される。
6. スマホのDiscordでも開き、一覧と詳細を「一覧に戻る」で行き来できる（スマホで出ない場合は Activities → Settings の Supported Platforms を確認）。

## 権利表記

このガイドは Riot Games が承認・後援したものではなく、Riot Games やゲームの制作・運営に関わる人の公式見解を表すものでもありません。League of Legends およびチャンピオンの画像は Riot Games, Inc. の商標または登録商標です（Riot Games の「Legal Jibber Jabber」ポリシーに基づくファン制作物）。
