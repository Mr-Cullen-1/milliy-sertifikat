// SVG -> PNG (Chrome headless): node docs/brandbook/render.cjs [fayl-qismi]
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Chrome/Edge topilmadi');
const dir = path.join(__dirname, 'assets');
const only = process.argv[2];

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.svg') && (!only || x.includes(only)))) {
  const svg = fs.readFileSync(path.join(dir, f), 'utf8');
  const w = Number(/width="(\d+)"/.exec(svg)[1]);
  const h = Number(/height="(\d+)"/.exec(svg)[1]);
  const out = path.join(dir, f.replace('.svg', '.png'));
  const url = 'file:///' + path.join(dir, f).split(path.sep).join('/');
  const r = spawnSync(
    chrome,
    ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--window-size=${w},${h}`, '--force-device-scale-factor=1', '--virtual-time-budget=4000', `--screenshot=${out}`, url],
    { encoding: 'utf8' },
  );
  console.log(f, fs.existsSync(out) ? 'ok' : 'XATO ' + String(r.stderr).slice(0, 200));
}
