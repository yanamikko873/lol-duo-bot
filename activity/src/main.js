// 起動とイベント処理。状態を1か所（state）に持ち、変わるたびに画面を描き直す。
import './style.css';
import { createCatalog } from './catalog.js';
import { renderApp, renderDuoResults } from './view.js';
import { connectDiscord, openLink } from './discord.js';

const root = document.querySelector('#app');
const state = { tab: 'duo', adc: null, tank: null, query: '', notice: '' };
let catalog;

function render() {
  root.innerHTML = renderApp(catalog, state);
}

function scrollDetailTop() {
  root.querySelector('.detail')?.scrollTo?.({ top: 0 });
  if (window.matchMedia('(max-width: 720px)').matches) window.scrollTo({ top: 0 });
}

root.addEventListener('click', (event) => {
  const el = event.target.closest('button');
  if (!el) return;
  const d = el.dataset;
  if (d.tab) Object.assign(state, { tab: d.tab });
  else if (d.adc) Object.assign(state, { adc: d.adc });
  else if (d.tank) Object.assign(state, { tank: d.tank });
  else if (d.gotoTank) Object.assign(state, { tab: 'tank', tank: d.gotoTank });
  else if (d.gotoAdc) Object.assign(state, { tab: 'duo', adc: d.gotoAdc, query: '' });
  else if (d.back) state[d.back] = null;
  else if (d.link) return void openLink(d.link);
  else return;
  render();
  if (d.adc || d.tank || d.gotoTank || d.gotoAdc) scrollDetailTop();
});

// 検索：入力欄そのものは作り直さず、結果の一覧だけを差し替える。
// 入力欄を作り直すと、日本語入力（IME）の変換途中の文字が強制的に確定され、
// 「あっしゅ」と打つつもりが「あｓｓｙう」のように崩れてしまうため。
root.addEventListener('input', (event) => {
  if (event.target.dataset.role !== 'search') return;
  state.query = event.target.value;
  const results = root.querySelector('[data-role="results"]');
  if (results) results.innerHTML = renderDuoResults(catalog, state);
});

// 矢印キーでタブを移動（キーボード操作向け）
root.addEventListener('keydown', (event) => {
  const tab = event.target.closest('[role="tab"]');
  if (!tab || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const next = tabs[(tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  state.tab = next.dataset.tab;
  render();
  root.querySelector(`[data-tab="${state.tab}"][role="tab"]`).focus();
});

async function start() {
  try {
    catalog = createCatalog();
  } catch (error) {
    root.innerHTML = `<p class="fatal">相性データを読み込めませんでした：${error.message}</p>`;
    return;
  }
  render();
  try {
    const { mode } = await connectDiscord();
    if (mode === 'browser') {
      state.notice = 'ブラウザ確認モードで表示中です（Discordの外で開いています）。';
      render();
    }
  } catch (error) {
    state.notice = `Discordとの接続に失敗しました。表示はそのまま使えます。（${error.message}）`;
    render();
  }
}

start();
