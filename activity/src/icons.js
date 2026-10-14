// チャンピオン名 → アイコン画像のURL。画像は scripts/fetch-icons.mjs が src/assets/champions/ に保存したもの。
// ビルド時に存在する画像だけが組み込まれる。ない場合は null を返し、画面側で頭文字を表示する。
import table from '../../data/champion_ids.json';
import { baseName } from './catalog.js';

const files = import.meta.glob('./assets/champions/*.png', { eager: true, query: '?url', import: 'default' });
const urlById = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop().replace(/\.png$/, ''), url]),
);

export const ICON_SOURCE = `Riot Games Data Dragon ${table.source.version}`;

export function championId(name) {
  return table.ids[baseName(name)] ?? null;
}

export function iconUrl(name) {
  const id = championId(name);
  return id ? (urlById[id] ?? null) : null;
}
