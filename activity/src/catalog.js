// 相性データの読込と検査。旧 catalog.py と同じ規則を JavaScript に移したもの。
// 未記載の評価を旧データや推測で補わない（null は null のまま表示する）。
import master from '../../data/master.json';

export const SOURCE_DATE = '2026-10-14';
export const SOURCE_LABEL = 'ユーザー提供の修正版テキスト（2026-10-14）';

const RATING_KEYS = ['difficulty', 'durability', 'engage', 'peel'];

export function validateCatalog(data) {
  if (data?.schema_version !== 2) throw new Error('未対応のデータ形式です');
  const { champions, tanks } = data;
  const names = champions.map((item) => item.name);
  if (!names.length || names.length !== new Set(names).size) {
    throw new Error('ADCデータが空、または名前が重複しています');
  }
  for (const item of champions) {
    if (!item.reason || !Array.isArray(item.supports)) throw new Error(`ADCデータ不正: ${item.name}`);
    if (!item.supports.length && !item.support_groups.length) throw new Error(`相方情報がありません: ${item.name}`);
  }
  for (const [name, tank] of Object.entries(tanks)) {
    if (!tank.difficulty) throw new Error(`難易度がありません: ${name}`);
    for (const key of RATING_KEYS) {
      const rating = tank[key];
      if (rating == null) continue;
      const { min, max } = rating;
      if (!Number.isInteger(min) || !Number.isInteger(max) || !(min >= 1 && min <= max && max <= 5)) {
        throw new Error(`評価範囲不正: ${name} ${key}`);
      }
    }
  }
  return { champions, tanks, source: data.source };
}

// 「ヴァルス(AS)」→「ヴァルス」のように、ビルド名などの括弧書きを外したチャンピオン本来の名前。
export function baseName(name) {
  return String(name).replace(/[（(][^()（）]*[)）]$/, '');
}

// ボットレーンの主なダメージの種類。資料で名前に「(APC)」と付いたものは AP（魔法）、それ以外は AD（物理）。
// 分類名（例「機動力・特殊枠 ADC / APC」）は ADC と APC が混ざった枠なので判定に使わない。
export function damageType(item) {
  return /[（(]APC[)）]$/.test(item.name) ? 'AP' : 'AD';
}

export function formatRating(rating) {
  if (rating == null) return '記載なし';
  const value = rating.min === rating.max ? String(rating.min) : `${rating.min}〜${rating.max}`;
  const note = rating.note ? `（${rating.note}）` : '';
  return `${value}/5${note}`;
}

// 星5つ分の表示状態。3〜4 のような幅は「確定」「幅の範囲内」「なし」で区別する。
export function ratingStars(rating) {
  return [1, 2, 3, 4, 5].map((n) => (n <= rating.min ? 'full' : n <= rating.max ? 'range' : 'empty'));
}

export function createCatalog(data = master) {
  const { champions, tanks, source } = validateCatalog(data);
  const byName = new Map(champions.map((item) => [item.name, item]));

  const categories = [];
  for (const item of champions) {
    let group = categories.find((c) => c.name === item.category);
    if (!group) categories.push((group = { name: item.category, items: [] }));
    group.items.push(item);
  }

  return {
    champions,
    tanks,
    source,
    byName,
    categories,
    tankNames: Object.keys(tanks),
    // 名前の部分一致。かな・カナや全角半角の揺れを吸収するため NFKC + 小文字化で比較する。
    search(query) {
      const q = normalize(query);
      if (!q) return champions;
      return champions.filter((item) => normalize(item.name).includes(q));
    },
    // そのサポートを「個別名で」挙げているADCだけを返す。「エンチャンター」等のタイプからは展開しない。
    adcsRecommending(supportName) {
      return champions.filter((item) => item.supports.includes(supportName)).map((item) => item.name);
    },
  };
}

function normalize(text) {
  return (text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[\s・＝=()（）]/g, '');
}

export const GLOSSARY = [
  ['ADC', '遠くから通常攻撃でダメージを出す役。ボットレーンの主役'],
  ['AD', '物理ダメージ。武器や通常攻撃によるダメージで、「攻撃力」を上げるアイテムで伸びる。相手は「物理防御」で軽減する'],
  ['AP', '魔法ダメージ。スキルによるダメージが中心で、「魔力」を上げるアイテムで伸びる。相手は「魔法防御」で軽減する'],
  ['サポート', 'ADCを守ったり、敵の動きを止めたりして助ける役'],
  ['APC', '魔法ダメージでADCの代わりを務めるボットレーンの役'],
  ['CC', 'スタンなど、相手の行動を一時的に止める・妨げる効果'],
  ['ピール', '味方に近づいた敵を引きはがして守ること'],
  ['エンゲージ', '自分から戦闘を仕掛けること'],
  ['AA / AS / DPS', 'AAは通常攻撃、ASは攻撃速度、DPSは途切れず出し続ける火力'],
  ['ポーク', '遠くから少しずつ削ること'],
  ['オールイン', 'スキルをまとめて使い、一気に倒しに行くこと'],
  ['レイトキャリー', '試合の後半に強くなり、チームを勝たせる役割'],
  ['エンチャンター', '回復・シールド・強化で味方を支えるサポート'],
  ['ワーデン', '体を張って味方を守るタイプのタンクサポート'],
];
