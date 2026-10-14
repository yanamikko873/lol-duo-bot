"""Load the user-provided master; never fill missing evaluations from old data."""
import json
from pathlib import Path

SOURCE_DATE = '2026-10-14'
SOURCE_LABEL = 'ユーザー提供の修正版テキスト（2026-10-14）'
DATA = Path(__file__).parent / 'data' / 'master.json'


def load_catalog(path=DATA):
    data = json.loads(path.read_text(encoding='utf-8-sig'))
    if data.get('schema_version') != 2:
        raise ValueError('未対応のデータ形式です')
    champions, tanks = data['champions'], data['tanks']
    names = [item['name'] for item in champions]
    if not names or len(names) != len(set(names)):
        raise ValueError('ADCデータが空、または名前が重複しています')
    for item in champions:
        if not item['reason'] or not isinstance(item['supports'], list):
            raise ValueError(f'ADCデータ不正: {item["name"]}')
        if not item['supports'] and not item['support_groups']:
            raise ValueError(f'相方情報がありません: {item["name"]}')
    for name, tank in tanks.items():
        if not tank['difficulty']:
            raise ValueError(f'難易度がありません: {name}')
        for key in ('difficulty', 'durability', 'engage', 'peel'):
            rating = tank[key]
            if rating is None:
                continue
            low, high = rating['min'], rating['max']
            if type(low) is not int or type(high) is not int or not 1 <= low <= high <= 5:
                raise ValueError(f'評価範囲不正: {name} {key}')
    return champions, tanks


def format_rating(rating):
    if rating is None:
        return '記載なし'
    low, high = rating['min'], rating['max']
    value = str(low) if low == high else f'{low}–{high}'
    note = f'（{rating["note"]}）' if rating.get('note') else ''
    return f'{value}/5{note}'


def pages(items, size=25):
    return [items[i:i + size] for i in range(0, len(items), size)]
