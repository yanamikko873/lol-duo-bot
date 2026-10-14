import { defineConfig } from 'vite';

export default defineConfig({
  // ../data/master.json を読むため、1つ上のフォルダへのアクセスを許可する
  server: {
    fs: { allow: ['..'] },
    // cloudflared の一時URL（*.trycloudflare.com）経由で Discord から開けるようにする
    allowedHosts: ['.trycloudflare.com'],
    // Discord 経由でも自動再読込が届くように 443 番を使う
    hmr: { clientPort: 443 },
  },
  test: { include: ['tests/**/*.test.js'] },
});
