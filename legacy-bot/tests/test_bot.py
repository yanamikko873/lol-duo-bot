import tempfile
import json
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import bot
from catalog import DATA, load_catalog, format_rating


def interaction(user_id=42):
    return SimpleNamespace(user=SimpleNamespace(id=user_id),
                           response=SimpleNamespace(send_message=AsyncMock(), edit_message=AsyncMock(),
                                                    is_done=Mock(return_value=False)),
                           original_response=AsyncMock(), followup=SimpleNamespace(send=AsyncMock()))


class CatalogTests(unittest.TestCase):
    def test_latest_source_counts_and_ranges(self):
        champions, tanks = load_catalog()
        self.assertEqual(len(champions), 27)
        self.assertEqual(len(tanks), 14)
        self.assertEqual(format_rating(tanks['ノーチラス']['difficulty']), '1/5')
        self.assertEqual(format_rating(tanks['ラカン']['difficulty']), '3–4/5')
        self.assertEqual(format_rating(tanks['ガリオ']['difficulty']), '3–4/5')
        self.assertIsNone(tanks['レル']['engage'])
        self.assertIsNone(tanks['レオナ']['durability'])

    def test_corrections_preserve_recommendations_and_variants(self):
        champions, _ = load_catalog()
        names = [c['name'] for c in champions]
        self.assertIn('シヴィア', names)
        self.assertNotIn('ユナラ', names)
        self.assertNotIn('オレリオン・ソル(APC)', names)
        self.assertIn('ベイガー(APC)', names)
        self.assertIn('ドレイヴン', names)
        self.assertNotIn('シヴァーナ/シヴィア', names)
        self.assertIn('ヴァルス(AS)', names)
        self.assertIn('ヴァルス(脅威)', names)
        self.assertNotIn('ユミ', str(champions))
        self.assertNotIn('ニコ', str(champions))

    def test_invalid_rating_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'bad.json'
            data = json.loads(DATA.read_text(encoding='utf-8'))
            data['tanks']['ノーチラス']['difficulty']['min'] = 6
            path.write_text(json.dumps(data), encoding='utf-8')
            with self.assertRaises(ValueError):
                load_catalog(path)

    def test_latest_recommendations_do_not_inherit_old_names(self):
        self.assertEqual(bot.BY_NAME['サミーラ']['supports'], ['レル', 'ノーチラス', 'アリスター'])
        self.assertTrue(bot.BY_NAME['サミーラ']['evidence_url'].endswith('t=339s'))
        self.assertIn('元動画の確認箇所', bot.champion_embed('サミーラ').fields[-1].value)
        self.assertEqual(bot.BY_NAME['カイ＝サ']['supports'], ['ノーチラス', 'アムム', 'アリスター'])
        self.assertEqual(bot.BY_NAME['アフェリオス']['supports'], [])
        self.assertIn('ニーコ', bot.BY_NAME['カリスタ']['supports'])
        self.assertEqual(bot.BY_NAME['ジンクス']['supports'], ['ルル', 'ミリオ', 'スレッシュ'])
        self.assertEqual(bot.BY_NAME['トゥイッチ']['supports'], ['ユーミ', 'ミリオ', 'ラカン'])

    def test_cleaned_text_and_unspecified_ratings(self):
        self.assertNotIn('YouTube', DATA.read_text(encoding='utf-8'))
        self.assertNotIn('他 1 件', DATA.read_text(encoding='utf-8'))
        self.assertNotIn('米', bot.BY_NAME['ジンクス']['supports'])
        self.assertEqual(format_rating(None), '記載なし')
        self.assertTrue(all(t['engage'] is None and t['peel'] is None for t in bot.TANKS.values()))

    def test_all_embeds_fit_discord_limits(self):
        for name, render in [(n, bot.champion_embed) for n in bot.BY_NAME] + [(n, bot.tank_embed) for n in bot.TANKS]:
            embed = render(name)
            self.assertLessEqual(len(embed), 6000)
            self.assertLessEqual(len(embed.fields), 25)
            for field in embed.fields:
                self.assertLessEqual(len(field.value), 1024)
                self.assertLessEqual(len(field.name), 256)

    def test_reverse_lookup_does_not_expand_general_categories(self):
        embed = bot.tank_embed('ガリオ')
        self.assertIn('個別の記載はありません', embed.fields[-2].value)


class InteractionTests(unittest.IsolatedAsyncioTestCase):
    async def test_page_navigation_reaches_every_champion(self):
        names = list(bot.BY_NAME) + [f'追加候補{i}' for i in range(6)]
        view = bot.Picker(42, names, bot.champion_embed)
        seen = [o.value for o in view.children[0].options]
        self.assertEqual(len(seen), 25)
        await view.following(interaction())
        seen += [o.value for o in view.children[0].options]
        self.assertEqual(seen, names)
        self.assertTrue(view.children[2].disabled)
        await view.previous(interaction())
        self.assertTrue(view.children[1].disabled)
        view.stop()

    async def test_latest_list_spans_two_pages(self):
        view = bot.Picker(42, list(bot.BY_NAME), bot.champion_embed)
        self.assertEqual(len(view.children[0].options), 25)
        self.assertTrue(view.children[1].disabled)
        self.assertFalse(view.children[2].disabled)
        await view.following(interaction())
        self.assertEqual(len(view.children[0].options), 2)
        self.assertTrue(view.children[2].disabled)
        view.stop()

    async def test_selection_updates_reason(self):
        view = bot.Picker(42, list(bot.BY_NAME), bot.champion_embed)
        request = interaction()
        request.data = {'values': ['ルシアン']}
        await view.choose(request)
        embed = request.response.edit_message.call_args.kwargs['embed']
        self.assertEqual(embed.title, 'ルシアン')
        self.assertIn('ナミ', embed.fields[0].value)
        view.stop()

    async def test_unauthorized_user(self):
        view = bot.Picker(42, list(bot.BY_NAME), bot.champion_embed)
        self.assertFalse(await view.interaction_check(interaction(7)))
        self.assertTrue(await view.interaction_check(interaction(42)))
        view.stop()

    async def test_timeout_disables_controls(self):
        view = bot.Picker(42, list(bot.BY_NAME), bot.champion_embed)
        view.message = SimpleNamespace(edit=AsyncMock())
        await view.on_timeout()
        self.assertTrue(all(c.disabled for c in view.children))
        view.message.edit.assert_awaited_once()
        view.stop()

    async def test_invalid_name_and_autocomplete(self):
        request = interaction()
        await bot.duo.callback(request, 'unknown')
        self.assertIn('資料にない', request.response.send_message.call_args.args[0])
        options = await bot.autocomplete(request, 'ヴァルス')
        self.assertEqual(len(options), 2)
        self.assertLessEqual(len(await bot.autocomplete(request, '')), 25)

    async def test_guild_sync_and_global_sync(self):
        client = bot.DuoClient()
        with patch.object(client.tree, 'sync', new_callable=AsyncMock) as sync:
            with patch.dict('os.environ', {'DISCORD_GUILD_ID': '123'}):
                await client.setup_hook()
                self.assertEqual(sync.call_args.kwargs['guild'].id, 123)
            with patch.dict('os.environ', {'DISCORD_GUILD_ID': ''}):
                await client.setup_hook()
                self.assertEqual(sync.call_args.kwargs, {})
            with patch.dict('os.environ', {'DISCORD_GUILD_ID': 'oops'}):
                with self.assertRaises(ValueError):
                    await client.setup_hook()
        await client.close()


if __name__ == '__main__':
    unittest.main()
