// 画面の組み立て。状態（どのタブ・どのチャンピオンを選んでいるか）から HTML 文字列を作る純粋な関数だけを置く。
// DOM 操作やイベントは main.js 側。こうしておくとブラウザなしでテストできる。
import { formatRating, ratingStars, damageType, baseName, GLOSSARY, SOURCE_LABEL } from './catalog.js';
import { iconUrl, ICON_SOURCE } from './icons.js';

export const TABS = [
  ['duo', '相方さがし'],
  ['tank', 'タンクサポート'],
  ['words', '用語'],
];

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderApp(catalog, state) {
  const detailOpen = (state.tab === 'duo' && state.adc) || (state.tab === 'tank' && state.tank);
  return `
    <header class="top">
      <h1 class="brand">ボットレーン相方ガイド</h1>
      <nav class="tabs" role="tablist" aria-label="表示の切り替え">
        ${TABS.map(([id, label]) => `
          <button role="tab" class="tab" data-tab="${id}" aria-selected="${state.tab === id}">${label}</button>`).join('')}
      </nav>
    </header>
    ${state.notice ? `<p class="notice">${esc(state.notice)}</p>` : ''}
    <main class="body ${detailOpen ? 'has-detail' : ''}" data-tab="${state.tab}">
      ${state.tab === 'duo' ? renderDuo(catalog, state) : ''}
      ${state.tab === 'tank' ? renderTanks(catalog, state) : ''}
      ${state.tab === 'words' ? renderWords() : ''}
    </main>
    <footer class="foot">相性・評価は ${esc(SOURCE_LABEL)} の見解です。最新パッチの勝率ランキングではありません。</footer>`;
}

// ---- 相方さがし ----

function renderDuo(catalog, state) {
  // 検索欄と結果を分けて描く。文字を打つたびに入力欄ごと作り直すと、
  // 日本語入力の変換途中の文字が確定されて「あｓｓｙ」のように崩れるため（main.js 参照）。
  return `
    <section class="list" aria-label="ADC・APCの一覧">
      <label class="search">
        <span class="search-label">チャンピオン名で絞り込み</span>
        <input type="search" data-role="search" value="${esc(state.query)}" placeholder="例：ルシアン、ヴァルス" autocomplete="off">
      </label>
      <div data-role="results">${renderDuoResults(catalog, state)}</div>
    </section>
    <section class="detail" aria-live="polite">${state.adc ? renderAdc(catalog, catalog.byName.get(state.adc)) : renderDuoIntro()}</section>`;
}

export function renderDuoResults(catalog, state) {
  const hits = new Set(catalog.search(state.query).map((c) => c.name));
  const groups = catalog.categories
    .map((g) => ({ ...g, items: g.items.filter((c) => hits.has(c.name)) }))
    .filter((g) => g.items.length);
  return `
      <p class="count">${hits.size} / ${catalog.champions.length} 件</p>
      ${groups.length ? groups.map((g) => `
        <div class="group">
          <h2 class="group-name">${esc(g.name)}</h2>
          <ul>${g.items.map((c) => `
            <li><button class="pick adc ${state.adc === c.name ? 'is-on' : ''}" data-adc="${esc(c.name)}" aria-current="${state.adc === c.name}">
              ${avatar(c.name)}<span class="pick-name">${esc(c.name)}</span>${dmgTag(c)}</button></li>`).join('')}
          </ul>
        </div>`).join('') : `<p class="empty">「${esc(state.query)}」に当てはまる名前は資料にありません。表記を変えて試してください。</p>`}`;
}

// アイコン画像。画像がないときは名前の頭文字を丸の中に表示する。
export function avatar(name, size = 'sm') {
  const url = iconUrl(name);
  if (url) return `<img class="ava ava-${size}" src="${esc(url)}" alt="" width="${size === 'lg' ? 64 : 28}" height="${size === 'lg' ? 64 : 28}" loading="lazy" decoding="async">`;
  return `<span class="ava ava-${size} ava-none" aria-hidden="true">${esc(baseName(name).slice(0, 1))}</span>`;
}

function dmgTag(item) {
  const type = damageType(item);
  return `<span class="dmg dmg-${type.toLowerCase()}" title="${type === 'AD' ? '物理ダメージ中心' : '魔法ダメージ中心'}">${type}</span>`;
}

function renderDuoIntro() {
  return `
    <div class="intro">
      <div class="lane" aria-hidden="true"><span class="slot gold">ADC</span><span class="bond"></span><span class="slot aqua">サポート</span></div>
      <p class="intro-lead">自分（または相方）が使うADCを選ぶと、相性の良いサポートとその理由が出ます。</p>
      <p class="intro-sub">ボットレーンは2人で戦う場所です。ADCがダメージを出し、サポートが守ったり敵を止めたりします。</p>
    </div>`;
}

export function renderAdc(catalog, item) {
  const supports = item.supports;
  return `
    <button class="back" data-back="adc">一覧に戻る</button>
    <div class="pair">
      <div class="pair-adc">
        ${avatar(item.name, 'lg')}
        <p class="role gold">${damageType(item) === 'AP' ? 'APC' : 'ADC'}</p>
        <h2 class="name">${esc(item.name)}</h2>
        <p class="meta">${dmgTag(item)} ${damageType(item) === 'AD' ? '物理ダメージ中心' : '魔法ダメージ中心'}</p>
        <p class="meta">${esc(item.category)}${item.variant ? `／${esc(item.variant)}ビルド` : ''}</p>
      </div>
      <div class="pair-bond" aria-hidden="true"></div>
      <div class="pair-sup">
        <p class="role aqua">おすすめサポート</p>
        ${supports.length ? `<ul class="chips">${supports.map((s) => supportChip(catalog, s)).join('')}</ul>`
          : '<p class="none">個別の名前は資料にありません。下の「向いているタイプ」を参考にしてください。</p>'}
        <p class="hint">資料の掲載順で、順位ではありません。名前がないサポートが「相性が悪い」という意味でもありません。</p>
      </div>
    </div>
    ${item.support_groups.length ? `
      <h3 class="h">向いているタイプ・条件</h3>
      <p class="tags">${item.support_groups.map((g) => `<span class="tag">${esc(g)}</span>`).join('')}</p>` : ''}
    <h3 class="h">相性の理由</h3>
    <p class="reason">${esc(item.reason)}</p>
    ${item.review_notes.length ? `
      <h3 class="h">資料の補足</h3>
      <ul class="notes">${item.review_notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <p class="source">出典：${esc(SOURCE_LABEL)}
      ${item.evidence_url ? `<button class="link" data-link="${esc(item.evidence_url)}">元動画の該当箇所を開く</button>` : ''}</p>`;
}

function supportChip(catalog, name) {
  const tank = catalog.tanks[name];
  if (!tank) return `<li><span class="chip">${avatar(name)}<span class="chip-text">${esc(name)}</span></span></li>`;
  return `<li><button class="chip is-tank" data-goto-tank="${esc(name)}" title="タンクサポートの詳細を見る">
    ${avatar(name)}<span class="chip-text">${esc(name)}<span class="chip-sub">難易度 ${esc(formatRating(tank.difficulty))}</span></span></button></li>`;
}

// ---- タンクサポート ----

function renderTanks(catalog, state) {
  return `
    <section class="list" aria-label="タンクサポートの一覧">
      <p class="list-lead">体が硬く、前に出て敵を止めるタイプのサポート${catalog.tankNames.length}体です。星が少ないほど扱いやすい目安です。</p>
      <ul>${catalog.tankNames.map((name) => {
        const t = catalog.tanks[name];
        return `<li><button class="pick tank ${state.tank === name ? 'is-on' : ''}" data-tank="${esc(name)}" aria-current="${state.tank === name}">
          ${avatar(name)}<span class="pick-name">${esc(name)}</span>${stars(t.difficulty, '難易度')}</button></li>`;
      }).join('')}</ul>
    </section>
    <section class="detail" aria-live="polite">${state.tank ? renderTank(catalog, state.tank) : `
      <div class="intro"><p class="intro-lead">左の一覧からサポートを選ぶと、難易度・得意なこと・注意点が出ます。</p></div>`}</section>`;
}

export function renderTank(catalog, name) {
  const t = catalog.tanks[name];
  const fans = catalog.adcsRecommending(name);
  const extra = [['耐久力', 'durability'], ['仕掛ける力', 'engage'], ['守る力', 'peel']].filter(([, k]) => t[k] != null);
  return `
    <button class="back" data-back="tank">一覧に戻る</button>
    ${avatar(name, 'lg')}
    <p class="role aqua">タンクサポート</p>
    <h2 class="name">${esc(name)}</h2>
    <div class="rating">
      ${stars(t.difficulty, '難易度')}
      <p><strong>難易度 ${esc(formatRating(t.difficulty))}</strong>　${esc(t.level)}</p>
    </div>
    ${extra.map(([label, k]) => `<p class="extra">${label}：${esc(formatRating(t[k]))}</p>`).join('')}
    <h3 class="h">得意なこと</h3>
    <p class="reason">${esc(t.features)}</p>
    <h3 class="h">弱点・注意点</h3>
    <p class="reason">${esc(t.cautions)}</p>
    ${t.review_notes.length ? `<h3 class="h">資料の補足</h3><ul class="notes">${t.review_notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <h3 class="h">このサポートを名前で挙げているADC</h3>
    ${fans.length ? `<ul class="chips">${fans.map((a) => `<li><button class="chip is-adc" data-goto-adc="${esc(a)}">${avatar(a)}<span class="chip-text">${esc(a)}</span>${dmgTag(catalog.byName.get(a))}</button></li>`).join('')}</ul>`
      : '<p class="none">資料に個別の記載はありません（相性が悪いという意味ではありません）。</p>'}
    <p class="source">出典：${esc(SOURCE_LABEL)}</p>`;
}

function stars(rating, label) {
  const cells = ratingStars(rating)
    .map((s) => `<span class="star ${s}"></span>`)
    .join('');
  return `<span class="stars" role="img" aria-label="${label} ${esc(formatRating(rating))}">${cells}</span>`;
}

// ---- 用語 ----

function renderWords() {
  return `
    <section class="words">
      <p class="list-lead">このガイドに出てくる言葉の意味です。</p>
      <dl>${GLOSSARY.map(([term, desc]) => `<div class="word"><dt>${esc(term)}</dt><dd>${esc(desc)}</dd></div>`).join('')}</dl>
      <h2 class="h">星の読み方</h2>
      <p class="reason">難易度は星5つで表し、少ないほど扱いやすい目安です。
        ${stars({ min: 3, max: 4 }, '例')} のように薄い星があるものは「3〜4」のように資料で幅を持たせた評価です。</p>
      <h2 class="h">AD・AP の表示について</h2>
      <p class="reason">ADC/APCの一覧にある AD・AP は、資料で名前に「(APC)」と付いているものを AP、それ以外を AD としています。サポートには付けていません。</p>
      <p class="credit">チャンピオンのアイコン画像：${esc(ICON_SOURCE)}。このガイドは Riot Games が承認・後援したものではなく、Riot Games の公式見解を表すものでもありません。League of Legends は Riot Games, Inc. の商標です。</p>
    </section>`;
}
