// Discord との接続。今回は「各自で見る」方式なので、ログイン（OAuth）は行わず
// ready() で Discord 側との準備完了を待つだけにしている。秘密情報（Client Secret）は不要。
import { DiscordSDK } from '@discord/embedded-app-sdk';

let sdk = null;

// Discord の中で開かれたときだけ URL に frame_id が付く。付いていなければブラウザ確認モード。
export function isInsideDiscord(search = window.location.search) {
  return new URLSearchParams(search).has('frame_id');
}

export async function connectDiscord() {
  if (!isInsideDiscord()) return { mode: 'browser' };
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  if (!clientId) throw new Error('VITE_DISCORD_CLIENT_ID が設定されていません（activity/.env を確認）');
  sdk = new DiscordSDK(clientId);
  await sdk.ready();
  return { mode: 'discord' };
}

// Discord 内では通常のリンクが開けないため、SDK 経由で外部ブラウザに開いてもらう。
export async function openLink(url) {
  if (sdk) {
    try {
      await sdk.commands.openExternalLink({ url });
      return;
    } catch {
      // ユーザーが確認ダイアログを閉じた場合など。何もしない。
      return;
    }
  }
  window.open(url, '_blank', 'noopener');
}
