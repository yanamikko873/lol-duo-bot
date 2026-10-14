// チャンピオンのアイコン画像を Riot 公式の Data Dragon から取得し、src/assets/champions/ に保存する。
// すでにある画像は取り直さない。通信に失敗しても公開は止めず、画像のないチャンピオンは頭文字で表示される。
// 使い方：node scripts/fetch-icons.mjs   （npm run deploy の最初に自動で実行される）
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const table = JSON.parse(await readFile(new URL('../data/champion_ids.json', root), 'utf8'));
const version = table.source.version;
const base = process.env.DDRAGON_BASE ?? 'https://ddragon.leagueoflegends.com';
// ICONS_OUT はテスト用（本番の保存先を汚さないため）。
const outDir = process.env.ICONS_OUT
  ? pathToFileURL(path.join(process.env.ICONS_OUT, path.sep))
  : new URL('src/assets/champions/', root);
await mkdir(outDir, { recursive: true });

const ids = [...new Set(Object.values(table.ids))];
let fetched = 0;
let kept = 0;
const failed = [];

for (const id of ids) {
  const file = new URL(`${id}.png`, outDir);
  try {
    await access(file);
    kept += 1;
    continue;
  } catch {
    // まだない → 取得する
  }
  try {
    const res = await fetch(`${base}/cdn/${version}/img/champion/${id}.png`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.subarray(0, 4).toString('hex') !== '89504e47') throw new Error('PNG ではない応答');
    await writeFile(file, bytes);
    fetched += 1;
  } catch (error) {
    failed.push(`${id}（${error.message}）`);
  }
}

console.log(`アイコン：新規 ${fetched} / 既存 ${kept} / 失敗 ${failed.length}（全 ${ids.length}）`);
if (failed.length) console.warn(`取得できなかった画像は頭文字で表示されます：${failed.join(', ')}`);
