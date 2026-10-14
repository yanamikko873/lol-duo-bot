// 旧 tests/test_bot.py のデータ検証を移植し、Activity の画面表示の確認を加えたもの。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import master from '../../data/master.json';
import { createCatalog, validateCatalog, formatRating, ratingStars, damageType, baseName } from '../src/catalog.js';
import { renderApp, renderAdc, renderTank, renderDuoResults, avatar } from '../src/view.js';
import { championId } from '../src/icons.js';
import ids from '../../data/champion_ids.json';
import { isInsideDiscord } from '../src/discord.js';

const catalog = createCatalog();
const clone = () => structuredClone(master);
const rawText = readFileSync(new URL('../../data/master.json', import.meta.url), 'utf8');

describe('相性データ', () => {
  it('ADC/APC 27項目・タンク14体を読み込み、評価幅を保つ', () => {
    expect(catalog.champions).toHaveLength(27);
    expect(catalog.tankNames).toHaveLength(14);
    expect(formatRating(catalog.tanks['ノーチラス'].difficulty)).toBe('1/5');
    expect(formatRating(catalog.tanks['ラカン'].difficulty)).toBe('3〜4/5');
    expect(formatRating(catalog.tanks['ガリオ'].difficulty)).toBe('3〜4/5');
    expect(catalog.tanks['レル'].engage).toBeNull();
    expect(catalog.tanks['レオナ'].durability).toBeNull();
  });

  it('修正済みの名前・ビルド分割を保つ', () => {
    const names = catalog.champions.map((c) => c.name);
    for (const n of ['シヴィア', 'ベイガー(APC)', 'ドレイヴン', 'ヴァルス(AS)', 'ヴァルス(脅威)']) expect(names).toContain(n);
    for (const n of ['ユナラ', 'オレリオン・ソル(APC)', 'シヴァーナ/シヴィア']) expect(names).not.toContain(n);
    const all = JSON.stringify(catalog.champions);
    expect(all).not.toContain('ユミ"');
    expect(all).not.toContain('ニコ"');
  });

  it('不正な評価範囲・重複名・相方なしを拒否する', () => {
    const bad = clone();
    bad.tanks['ノーチラス'].difficulty.min = 6;
    expect(() => validateCatalog(bad)).toThrow('評価範囲不正');
    const dup = clone();
    dup.champions.push(dup.champions[0]);
    expect(() => validateCatalog(dup)).toThrow('重複');
    const empty = clone();
    Object.assign(empty.champions[0], { supports: [], support_groups: [] });
    expect(() => validateCatalog(empty)).toThrow('相方情報');
    expect(() => validateCatalog({ ...clone(), schema_version: 1 })).toThrow('未対応');
  });

  it('最新の推奨を旧データで上書きしていない', () => {
    const by = catalog.byName;
    expect(by.get('サミーラ').supports).toEqual(['レル', 'ノーチラス', 'アリスター']);
    expect(by.get('サミーラ').evidence_url.endsWith('t=339s')).toBe(true);
    expect(by.get('カイ＝サ').supports).toEqual(['ノーチラス', 'アムム', 'アリスター']);
    expect(by.get('アフェリオス').supports).toEqual([]);
    expect(by.get('カリスタ').supports).toContain('ニーコ');
    expect(by.get('ジンクス').supports).toEqual(['ルル', 'ミリオ', 'スレッシュ']);
    expect(by.get('トゥイッチ').supports).toEqual(['ユーミ', 'ミリオ', 'ラカン']);
  });

  it('ノイズを含まず、未記載の評価は「記載なし」のまま', () => {
    expect(rawText).not.toContain('YouTube');
    expect(rawText).not.toContain('他 1 件');
    expect(formatRating(null)).toBe('記載なし');
    expect(Object.values(catalog.tanks).every((t) => t.engage === null && t.peel === null)).toBe(true);
  });

  it('星の表示は確定・幅・なしを区別する', () => {
    expect(ratingStars({ min: 3, max: 4 })).toEqual(['full', 'full', 'full', 'range', 'empty']);
    expect(ratingStars({ min: 1, max: 1 })).toEqual(['full', 'empty', 'empty', 'empty', 'empty']);
  });

  it('逆引きはタイプ名（エンチャンター等）から個別名へ展開しない', () => {
    expect(catalog.adcsRecommending('ガリオ')).toEqual([]);
    expect(catalog.adcsRecommending('ノーチラス')).toEqual(expect.arrayContaining(['サミーラ', 'カイ＝サ']));
  });

  it('名前検索は表記揺れを吸収し、ヴァルスは2ビルドとも出る', () => {
    expect(catalog.search('ヴァルス').map((c) => c.name)).toEqual(['ヴァルス(脅威)', 'ヴァルス(AS)']);
    expect(catalog.search('るしあん').map((c) => c.name)).toEqual(['ルシアン']);
    expect(catalog.search('カイサ').map((c) => c.name)).toEqual(['カイ＝サ']);
    expect(catalog.search('')).toHaveLength(27);
    expect(catalog.search('存在しない')).toHaveLength(0);
  });
});

describe('画面', () => {
  const base = { tab: 'duo', adc: null, tank: null, query: '', notice: '' };

  it('一覧に27項目すべてが出る（ページ送りなし）', () => {
    const html = renderApp(catalog, base);
    expect(html.match(/data-adc="/g)).toHaveLength(27);
  });

  it('ルシアンを選ぶとナミ / ミリオ / ブラウムと理由が出る', () => {
    const html = renderAdc(catalog, catalog.byName.get('ルシアン'));
    for (const n of ['ナミ', 'ミリオ', 'ブラウム']) expect(html).toContain(n);
    expect(html).toContain(catalog.byName.get('ルシアン').reason);
  });

  it('タンクの候補は詳細へ移動でき、難易度が添えられる', () => {
    const html = renderAdc(catalog, catalog.byName.get('サミーラ'));
    expect(html).toContain('data-goto-tank="ノーチラス"');
    expect(html).toContain('難易度 1/5');
    expect(html).toContain('元動画の該当箇所を開く');
  });

  it('個別名のないADCは名前の代わりに案内を出す', () => {
    const html = renderAdc(catalog, catalog.byName.get('アフェリオス'));
    expect(html).toContain('個別の名前は資料にありません');
  });

  it('タンク詳細：ラカンは耐久2点の注記を出し、記載のない項目は出さない', () => {
    const html = renderTank(catalog, 'ラカン');
    expect(html).toContain('耐久力：2/5（本文の2点評価）');
    expect(html).not.toContain('仕掛ける力');
    expect(html).toContain('3〜4/5');
  });

  it('全41件の詳細が例外なく描画できる', () => {
    for (const c of catalog.champions) expect(() => renderAdc(catalog, c)).not.toThrow();
    for (const t of catalog.tankNames) expect(() => renderTank(catalog, t)).not.toThrow();
  });

  it('検索で0件のときは次の行動を案内する', () => {
    const html = renderApp(catalog, { ...base, query: 'zzz' });
    expect(html).toContain('当てはまる名前は資料にありません');
  });

  it('データ中の記号はHTMLとして解釈されない', () => {
    const data = clone();
    data.champions[0].reason = '<img src=x onerror=alert(1)>';
    const html = renderAdc(createCatalog(data), createCatalog(data).champions[0]);
    expect(html).not.toContain('<img');
  });
});

describe('Discord 判定', () => {
  it('frame_id があるときだけ Discord 内と判断する', () => {
    expect(isInsideDiscord('?frame_id=abc&instance_id=1')).toBe(true);
    expect(isInsideDiscord('')).toBe(false);
  });
});

describe('改善（2026-10-14）', () => {
  const base = { tab: 'duo', adc: null, tank: null, query: '', notice: '' };

  it('検索結果の差し替え部分には入力欄を含めない（日本語入力が崩れないように）', () => {
    expect(renderApp(catalog, base)).toContain('data-role="results"');
    const results = renderDuoResults(catalog, { ...base, query: 'あっしゅ' });
    expect(results).not.toContain('<input');
    expect(results).toContain('data-adc="アッシュ"');
  });

  it('AD/AP：資料で APC 分類のものは AP、それ以外は AD', () => {
    const ap = catalog.champions.filter((c) => damageType(c) === 'AP').map((c) => c.name);
    expect(ap).toEqual(['ジグス(APC)', 'スウェイン(APC)', 'セラフィーン(APC)', 'ベイガー(APC)']);
    expect(damageType(catalog.byName.get('ヴァルス(脅威)'))).toBe('AD');
    expect(renderDuoResults(catalog, base).match(/class="dmg dmg-/g)).toHaveLength(27);
  });

  it('括弧書きを外した名前でアイコンIDを引ける（全53体）', () => {
    expect(baseName('ヴァルス(AS)')).toBe('ヴァルス');
    expect(baseName('ベイガー(APC)')).toBe('ベイガー');
    expect(championId('ヴァルス(脅威)')).toBe('Varus');
    expect(championId('カイ＝サ')).toBe('Kaisa');
    const names = new Set(catalog.tankNames);
    for (const c of catalog.champions) { names.add(baseName(c.name)); c.supports.forEach((s) => names.add(s)); }
    for (const n of names) expect(ids.ids[n], n).toMatch(/^[A-Za-z]+$/);
  });

  it('画像がないときは頭文字を表示し、壊れた画像を出さない', () => {
    const html = avatar('存在しない名前');
    expect(html).toContain('ava-none');
    expect(html).not.toContain('<img');
  });
});

