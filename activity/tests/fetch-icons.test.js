// アイコン取得スクリプトを、偽の配信サーバーに向けて動かす（本物の Data Dragon には接続しない）。
import { describe, it, expect } from 'vitest';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const script = path.resolve(__dirname, '../scripts/fetch-icons.mjs');

function run(env) {
  return new Promise((resolve) => {
    execFile(process.execPath, [script], { env: { ...process.env, ...env } }, (error, stdout, stderr) =>
      resolve({ code: error?.code ?? 0, stdout, stderr }));
  });
}

describe('アイコン取得スクリプト', () => {
  it('全画像を保存し、2回目は取り直さず、失敗しても止まらない', async () => {
    const seen = [];
    const server = createServer((req, res) => {
      seen.push(req.url);
      if (req.url.endsWith('/Rell.png')) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': 'image/png' });
      res.end(PNG);
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const out = await mkdtemp(path.join(tmpdir(), 'icons-'));
    try {
      const first = await run({ DDRAGON_BASE: baseUrl, ICONS_OUT: out });
      expect(first.code).toBe(0);
      expect(first.stdout).toContain('新規 52');
      expect(first.stderr).toContain('Rell');
      expect(seen[0]).toMatch(/^\/cdn\/16\.20\.1\/img\/champion\/[A-Za-z]+\.png$/);
      expect((await readdir(out)).length).toBe(52);
      seen.length = 0;
      const second = await run({ DDRAGON_BASE: baseUrl, ICONS_OUT: out });
      expect(second.stdout).toContain('既存 52');
      expect(seen).toEqual(['/cdn/16.20.1/img/champion/Rell.png']);
    } finally {
      server.close();
      await rm(out, { recursive: true, force: true });
    }
  });
});
