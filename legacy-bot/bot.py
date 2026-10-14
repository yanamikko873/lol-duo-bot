"""Japanese beginner duo guide. Run with DISCORD_TOKEN set externally."""
import logging
import os

import discord
from discord import app_commands

from catalog import SOURCE_DATE, SOURCE_LABEL, load_catalog, format_rating, pages

CHAMPIONS, TANKS = load_catalog()
BY_NAME = {item['name']: item for item in CHAMPIONS}
LOG = logging.getLogger('lol-duo')
GLOSSARY = (
    'CC：スタンなど相手の行動を妨げる効果\n'
    'ピール：味方を敵から守ること\n'
    'エンゲージ：戦闘を仕掛けること\n'
    'AA：通常攻撃／AS：攻撃速度／DPS：継続的な火力\n'
    'ポーク：遠くから少しずつ削ること\n'
    'オールイン：スキルをまとめて使って倒しに行くこと\n'
    'レイトキャリー：試合後半に強くなる役割\n'
    'APC：主に魔法ダメージを出すボットレーンのキャリー\n'
    'エンチャンター：回復・シールド・強化で味方を支援する役割'
)


def base_embed(title, description):
    embed = discord.Embed(title=title, description=description, color=0x38B2AC)
    embed.set_footer(text=f'資料提供日 {SOURCE_DATE} | 相性・評価は提供資料の見解')
    return embed


def champion_embed(name):
    item = BY_NAME[name]
    embed = base_embed(name, item['category'] + (f'｜{item["variant"]}' if item['variant'] else ''))
    embed.add_field(name='おすすめサポート（資料掲載順・順位ではありません）',
                    value=' / '.join(item['supports']) or '個別名の記載なし（下のタイプを参照）', inline=False)
    if item['support_groups']:
        embed.add_field(name='候補のタイプ・条件（資料の記述）',
                        value=' / '.join(item['support_groups']), inline=False)
    embed.add_field(name='相性の理由・注意点（提供テキスト）',
                    value=item['reason'], inline=False)
    if item['review_notes']:
        embed.add_field(name='資料の補足・要確認', value='\n'.join(item['review_notes']), inline=False)
    for support in item['supports']:
        if support in TANKS:
            tank = TANKS[support]
            embed.add_field(name=support,
                            value=f'難易度：{format_rating(tank["difficulty"])}（{tank["level"]}）',
                            inline=False)
    embed.add_field(name='読み方', value='難易度は星の数（1〜5）です。3〜4などの幅も保持しています。\n'
                    '「全般」「自由」は分類表現です。個別の相性スコアは資料にありません。\n'
                    '最新パッチの勝率ランキングではありません。\n'
                    '用語は /duo-help、タンク詳細は /support で確認できます。', inline=False)
    source = SOURCE_LABEL
    if item.get('evidence_url'):
        source += f'\n[元動画の確認箇所]({item["evidence_url"]})'
    embed.add_field(name='出典', value=source, inline=False)
    return embed


def tank_embed(name):
    tank = TANKS[name]
    embed = base_embed(name, '提供資料のタンクサポート評価')
    embed.add_field(name='難易度', value=f'{format_rating(tank["difficulty"])}（{tank["level"]}）')
    for label, key in (('耐久力', 'durability'), ('仕掛ける力', 'engage'), ('守る力', 'peel')):
        if tank[key] is not None:
            embed.add_field(name=label, value=format_rating(tank[key]))
    embed.add_field(name='特徴（提供資料）', value=tank['features'], inline=False)
    embed.add_field(name='弱点・注意点（提供資料）', value=tank['cautions'], inline=False)
    if tank['review_notes']:
        embed.add_field(name='資料の補足・要確認', value='\n'.join(tank['review_notes']), inline=False)
    matches = [item['name'] for item in CHAMPIONS if name in item['supports']]
    embed.add_field(name='このサポートを明示的におすすめしているADC/APC',
                    value=' / '.join(matches) or '資料に個別の記載はありません（相性が悪いという意味ではありません）。',
                    inline=False)
    embed.add_field(name='出典', value=SOURCE_LABEL, inline=False)
    return embed


async def report_error(interaction):
    message = '処理に失敗しました。もう一度コマンドを実行してください。'
    if interaction.response.is_done():
        await interaction.followup.send(message, ephemeral=True)
    else:
        await interaction.response.send_message(message, ephemeral=True)


class Picker(discord.ui.View):
    def __init__(self, owner_id, names, render):
        super().__init__(timeout=180)
        self.owner_id = owner_id
        self.groups = pages(names)
        self.page = 0
        self.render = render
        self.message = None
        self.rebuild()

    def rebuild(self):
        self.clear_items()
        select = discord.ui.Select(placeholder=f'チャンピオンを選択 ({self.page + 1}/{len(self.groups)})',
                                   options=[discord.SelectOption(label=name, value=name)
                                            for name in self.groups[self.page]])
        select.callback = self.choose
        self.add_item(select)
        previous = discord.ui.Button(label='前へ', disabled=self.page == 0, row=1)
        following = discord.ui.Button(label='次へ', disabled=self.page == len(self.groups) - 1, row=1)
        previous.callback = self.previous
        following.callback = self.following
        self.add_item(previous)
        self.add_item(following)

    async def interaction_check(self, interaction):
        if interaction.user.id != self.owner_id:
            await interaction.response.send_message('自分の /duo または /support を開いてください。', ephemeral=True)
            return False
        return True

    async def choose(self, interaction):
        name = interaction.data['values'][0]
        await interaction.response.edit_message(embed=self.render(name), view=self)

    async def previous(self, interaction):
        self.page = max(0, self.page - 1)
        self.rebuild()
        await interaction.response.edit_message(view=self)

    async def following(self, interaction):
        self.page = min(len(self.groups) - 1, self.page + 1)
        self.rebuild()
        await interaction.response.edit_message(view=self)

    async def on_timeout(self):
        for child in self.children:
            child.disabled = True
        if self.message:
            try:
                await self.message.edit(content='選択の有効期限が切れました。コマンドを再実行してください。', view=self)
            except discord.HTTPException:
                LOG.info('期限切れUIを更新できませんでした。')

    async def on_error(self, interaction, error, item):
        LOG.error('選択UIエラー: %s', type(error).__name__)
        await report_error(interaction)


class DuoClient(discord.Client):
    def __init__(self):
        super().__init__(intents=discord.Intents.none(), allowed_mentions=discord.AllowedMentions.none())
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        guild_id = os.getenv('DISCORD_GUILD_ID', '').strip()
        if guild_id:
            if not guild_id.isdecimal() or int(guild_id) <= 0:
                raise ValueError('DISCORD_GUILD_IDにはサーバーIDの数字を指定してください。')
            guild = discord.Object(id=int(guild_id))
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
        else:
            await self.tree.sync()
        LOG.info('スラッシュコマンドを登録しました。')


client = DuoClient()


@client.tree.command(name='duo', description='ADC/APCを選んでおすすめサポートと理由を確認')
@app_commands.describe(champion='省略すると選択メニューを表示')
async def duo(interaction: discord.Interaction, champion: str | None = None):
    if champion and champion not in BY_NAME:
        await interaction.response.send_message('資料にない名前です。候補から選ぶか、/duo のみで一覧を開いてください。', ephemeral=True)
        return
    view = Picker(interaction.user.id, list(BY_NAME), champion_embed)
    embed = champion_embed(champion) if champion else base_embed('ADCとサポートの相性ガイド',
            '下のメニューから選択してください。次へボタンで残りの候補を表示します。\n操作は3分間有効です。')
    await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
    view.message = await interaction.original_response()


@duo.autocomplete('champion')
async def autocomplete(interaction: discord.Interaction, current: str):
    return [app_commands.Choice(name=name, value=name) for name in BY_NAME
            if current.casefold() in name.casefold()][:25]


@client.tree.command(name='support', description='資料のタンク系サポート14体の評価を確認')
async def support(interaction: discord.Interaction):
    view = Picker(interaction.user.id, list(TANKS), tank_embed)
    await interaction.response.send_message(embed=base_embed('タンク系サポート一覧',
            '難易度・耐久力・仕掛け・守りを比較できます。操作は3分間有効です。'), view=view, ephemeral=True)
    view.message = await interaction.original_response()


@client.tree.command(name='duo-help', description='使い方と初心者向けの用語説明')
async def help_command(interaction: discord.Interaction):
    await interaction.response.send_message(embed=base_embed('使い方・用語',
            '/duo：相方選び\n/support：タンクの評価\n\n' + GLOSSARY), ephemeral=True)


@client.tree.error
async def command_error(interaction: discord.Interaction, error: app_commands.AppCommandError):
    LOG.error('コマンドエラー: %s', type(error).__name__)
    await report_error(interaction)


if __name__ == '__main__':
    token = os.getenv('DISCORD_TOKEN', '').strip()
    if not token:
        raise SystemExit('DISCORD_TOKENを環境変数に設定してください。README.mdを参照。')
    client.run(token)
