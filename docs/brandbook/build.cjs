// Brandbook reference sahifalarini (SVG) generatsiya qiladi: node docs/brandbook/build.cjs
// Keyin PNG: node docs/brandbook/render.cjs (Chrome headless). Qiymatlar app/globals.css bilan bir xil.
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'assets');
fs.mkdirSync(OUT, { recursive: true });

const C = {
  ink: '#1e1b39', 'ink-soft': '#4f4b6b', muted: '#6f6b8a', faint: '#a9a5c0', line: '#d6d2ec', 'line-strong': '#d5d1e8',
  page: '#f3f1fb', surface: '#f6f5fb', track: '#eceaf5', white: '#ffffff',
  brand: '#e8590c', 'brand-edge': '#b84306', 'brand-current': '#fa4f28', 'brand-soft': '#ffd2b8', 'brand-tint': '#fff0e6', 'brand-ink': '#b03f05',
  accent: '#4b2fd0', 'accent-soft': '#f0ecff', selected: '#6c47ff',
  success: '#2fa84f', 'success-soft': '#e6f7ea', 'success-line': '#bfe6c9', 'success-ink': '#1c6e33',
  danger: '#d92d3a', 'danger-soft': '#fde8ea', gold: '#f5a400', 'gold-edge': '#c98700', 'warn-soft': '#fff6db',
  'disabled-bg': '#eceaf4', 'disabled-edge': '#dedbeb',
};
module.exports = { C };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONT_CSS = `@font-face{font-family:'Nunito';src:url('../fonts/Nunito.ttf') format('truetype');font-weight:200 1000}@font-face{font-family:'Onest';src:url('../fonts/Onest.ttf') format('truetype');font-weight:100 900}text{font-family:'Nunito',sans-serif}.h{font-family:'Onest','Nunito',sans-serif}`;

// ---------- luminance / contrast ----------
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const A = lum(C[a] || a), B = lum(C[b] || b);
  return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
};
const darken = (hex, bg, target) => {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let k = 1; k > 0; k -= 0.005) {
    const h = '#' + rgb.map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join('');
    if (contrast(h, bg) >= target) return h;
  }
  return '#000000';
};

// ---------- primitives ----------
class Doc {
  constructor(w) { this.w = w; this.p = []; this.maxY = 0; this.defs = ''; }
  add(s, y2) { this.p.push(s); if (y2 && y2 > this.maxY) this.maxY = y2; return this; }
  rect(x, y, w, h, o = {}) {
    const { r = 0, fill = 'none', stroke, sw = 0, dash, op } = o;
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C[fill] || fill}"${stroke ? ` stroke="${C[stroke] || stroke}" stroke-width="${sw}"` : ''}${dash ? ` stroke-dasharray="${dash}"` : ''}${op != null ? ` opacity="${op}"` : ''}/>`, y + h);
    return this;
  }
  // "bosiladigan" qirrali quti: tashqi (chegara rangi) + ichki (fon), pastki qirra qalinroq
  box(x, y, w, h, o = {}) {
    const { r = 16, fill = 'white', line = 'line-strong', sw = 2, sb = 4 } = o;
    this.rect(x, y, w, h, { r, fill: line });
    this.rect(x + sw, y + sw, w - 2 * sw, h - sw - sb, { r: Math.max(0, r - sw), fill });
    return this;
  }
  text(x, y, s, o = {}) {
    const { size = 14, w = 600, fill = 'ink', anchor = 'start', h = false, op, ls } = o;
    this.add(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${w}" fill="${C[fill] || fill}" text-anchor="${anchor}"${h ? ' class="h"' : ''}${op != null ? ` opacity="${op}"` : ''}${ls ? ` letter-spacing="${ls}"` : ''}>${esc(s)}</text>`, y + 6);
    return this;
  }
  // so'zlar bo'yicha o'raydi; qaytaradi: oxirgi qator y
  para(x, y, s, o = {}) {
    const { size = 14, lh = size * 1.45, maxw = 400, w = 600, fill = 'muted' } = o;
    const perChar = size * (w >= 800 ? 0.58 : 0.54);
    const maxc = Math.floor(maxw / perChar);
    const words = String(s).split(' ');
    let line = '', yy = y;
    for (const wd of words) {
      if ((line + ' ' + wd).trim().length > maxc && line) { this.text(x, yy, line, { size, w, fill, anchor: o.anchor }); yy += lh; line = wd; } else line = (line + ' ' + wd).trim();
    }
    if (line) { this.text(x, yy, line, { size, w, fill, anchor: o.anchor }); yy += lh; }
    return yy;
  }
  tw(s, size, w = 700) { return String(s).length * size * (w >= 800 ? 0.6 : 0.55); }
  chip(x, y, s, bg, fg, o = {}) {
    const { size = 12, px = 10, h = 24, w = 700, stroke } = o;
    const width = Math.round(this.tw(s, size, w) + px * 2);
    this.rect(x, y, width, h, { r: h / 2, fill: bg, stroke, sw: stroke ? 2 : 0 });
    this.text(x + width / 2, y + h / 2 + size * 0.35, s, { size, w, fill: fg, anchor: 'middle' });
    return width;
  }
  icon(name, x, y, size, color = 'ink', sw = 2) {
    const d = ICONS[name];
    this.add(`<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${C[color] || color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d.map((p) => `<path d="${p}"/>`).join('')}</g>`, y + size);
    return this;
  }
  tile(x, y, size, bg = 'brand', edge = 'brand-edge', fg = 'white') {
    const eb = Math.max(3, Math.round(size * 0.06)), r = size * 0.29;
    this.rect(x, y, size, size, { r, fill: edge });
    this.rect(x, y, size, size - eb, { r, fill: bg });
    this.text(x + size / 2, y + (size - eb) * 0.72, 'π', { size: size * 0.6, w: 700, fill: fg, anchor: 'middle', h: true });
    return this;
  }
  button(x, y, w, label, kind = 'primary', o = {}) {
    const h = o.h || 56;
    const m = { primary: ['brand', 'brand-edge', 'white', 5], secondary: ['white', 'line-strong', 'ink', 4], disabled: ['disabled-bg', 'disabled-edge', 'faint', 4], accent: ['accent', '#35209f', 'white', 5], danger: ['danger', '#a8202b', 'white', 5] }[kind];
    this.rect(x, y, w, h, { r: 16, fill: m[1] });
    this.rect(x + (kind === 'secondary' ? 2 : 0), y + (kind === 'secondary' ? 2 : 0), w - (kind === 'secondary' ? 4 : 0), h - m[3] - (kind === 'secondary' ? 2 : 0), { r: kind === 'secondary' ? 14 : 16, fill: m[0] });
    this.text(x + w / 2, y + (h - m[3]) / 2 + 6, label, { size: 16, w: 900, fill: m[2], anchor: 'middle' });
    return this;
  }
  ring(cx, cy, r, thick, pct, color = 'brand', track = 'track') {
    const ri = r - thick / 2;
    this.add(`<circle cx="${cx}" cy="${cy}" r="${ri}" fill="none" stroke="${C[track]}" stroke-width="${thick}"/>`, cy + r);
    const circ = 2 * Math.PI * ri;
    this.add(`<circle cx="${cx}" cy="${cy}" r="${ri}" fill="none" stroke="${C[color]}" stroke-width="${thick}" stroke-linecap="round" stroke-dasharray="${(circ * pct).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`);
    return this;
  }
  head(num, title, desc) {
    this.chip(40, 44, num, 'brand-tint', 'brand-ink', { size: 14, px: 14, h: 32 });
    this.text(40 + this.tw(num, 14) + 28 + 14, 70, title, { size: 36, w: 600, h: true });
    this.para(40, 110, desc, { size: 16, maxw: 1200, fill: 'muted' });
    return 150;
  }
  // oq panel: balandligi kontentga qarab save() da hisoblanadi
  panel(x, y) { this._panel = { i: this.p.length, x, y }; this.p.push(''); return this; }
  save(name) {
    let H = this.maxY + 40;
    if (this._panel) {
      const { i, x, y } = this._panel;
      const ph = this.maxY - y + 40;
      this.p[i] = `<rect x="${x}" y="${y}" width="${this.w - 2 * x}" height="${ph}" rx="32" fill="${C.white}" stroke="${C['line-strong']}" stroke-width="2"/>`;
      H = y + ph + 40;
    }
    const body = this.p.join('\n');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${H}" viewBox="0 0 ${this.w} ${H}"><defs><style>${FONT_CSS}</style><filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#1e1b39" flood-opacity="0.18"/></filter></defs><rect width="${this.w}" height="${H}" fill="${C.page}"/>\n${body}\n</svg>\n`;
    fs.writeFileSync(path.join(OUT, name), svg);
    return H;
  }
}

const ICONS = {
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  'file-text': ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  book: ['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'],
  chart: ['M12 20V10', 'M18 20V4', 'M6 20v-4'],
  menu: ['M4 12h16', 'M4 6h16', 'M4 18h16'],
  'arrow-left': ['M12 19l-7-7 7-7', 'M19 12H5'],
  'chevron-right': ['M9 18l6-6-6-6'], 'chevron-down': ['M6 9l6 6 6-6'],
  bookmark: ['M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z'],
  check: ['M20 6L9 17l-5-5'], x: ['M18 6L6 18', 'M6 6l12 12'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  play: ['M6 3l14 9-14 9z'],
  trophy: ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2z'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
  alert: ['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  refresh: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
  flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
  calc: ['M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', 'M8 6h8', 'M8 10h.01', 'M12 10h.01', 'M16 10h.01', 'M8 14h.01', 'M12 14h.01', 'M16 14h.01', 'M8 18h.01', 'M12 18h.01', 'M16 18h.01'],
  globe: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  backspace: ['M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z', 'M18 9l-6 6', 'M12 9l6 6'],
  wifi: ['M5 12.55a11 11 0 0 1 14.08 0', 'M1.42 9a16 16 0 0 1 21.16 0', 'M8.53 16.11a6 6 0 0 1 6.95 0', 'M12 20h.01'],
  'wifi-off': ['M2 2l20 20', 'M8.5 16.5a5 5 0 0 1 7 0', 'M2 8.82a15 15 0 0 1 4.17-2.65', 'M10.66 5c4.01-.36 8.14.9 11.34 3.76', 'M16.85 11.25a10 10 0 0 1 2.22 1.68', 'M5 13a10 10 0 0 1 5.24-2.76', 'M12 20h.01'],
  lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
};
const ICON_USE = {
  home: 'Bosh sahifa tabi', 'file-text': 'Imtihon tabi, variant kartasi', book: 'Mashq tabi', chart: 'Natijalar tabi', menu: 'Yana tabi', 'arrow-left': 'Orqaga',
  'chevron-right': 'Ro\'yxat elementi', 'chevron-down': 'Ochiladigan blok', bookmark: 'Savolni belgilash/saqlash', check: 'To\'g\'ri, tanlandi', x: 'Noto\'g\'ri, yopish',
  clock: 'Taymer', bell: 'Bildirishnoma', grid: 'Savollar paneli', play: 'Davom ettirish', trophy: 'Daraja nishoni', info: 'Izoh, taxminiy ogohlantirish', alert: 'Ogohlantirish, xato',
  refresh: 'Qayta urinish', flag: 'E\'tibor talab mavzu', calc: 'DTM kalkulyatori', globe: 'Til', shield: 'Maxfiylik', backspace: 'Klaviatura o\'chirish', wifi: 'Tarmoq bor',
  'wifi-off': 'Offline holat', lock: 'Yopiq (Pro) kontent', search: 'Qidiruv',
};
module.exports.ICONS = ICONS;

// =====================================================================
// 01 Logo
// =====================================================================
{
  const d = new Doc(1440);
  let y = d.head('01', 'Logotip', 'Belgi: "π" (matematika) yumshoq to\'q sariq kvadratda. Wordmark: Onest SemiBold. Belgining pastki qirrasi tugmalar kabi qalinroq: "bosiladigan" ko\'rinish.');
  d.panel(40, y);
  const vars = [['Asosiy', 'white', 'brand', 'brand-edge', 'ink'], ['Teskari (to\'q fon)', 'ink', 'brand', 'brand-edge', 'white'], ['Monoxrom', 'white', 'ink', 'ink-soft', 'ink'], ['Aksent', 'white', 'accent', 'selected', 'ink']];
  vars.forEach(([n, bg, tb, te, tc], i) => {
    const x = 80 + i * 322;
    d.box(x, y + 40, 302, 170, { r: 24, fill: bg });
    d.tile(x + 28, y + 78, 72, tb, te);
    d.text(x + 118, y + 118, 'Milliy', { size: 24, w: 600, fill: tc, h: true });
    d.text(x + 118, y + 146, 'sertifikat', { size: 24, w: 600, fill: tc, h: true });
    d.text(x + 28, y + 190, n, { size: 13, w: 700, fill: bg === 'ink' ? 'faint' : 'muted' });
  });
  // sizes
  d.text(80, y + 270, 'O\'lchamlar', { size: 18, w: 800 });
  [[96, 'ilova belgisi 96 dp'], [48, '48 dp'], [32, '32 dp'], [24, 'minimum 24 dp']].reduce((x, [s, l]) => { d.tile(x, y + 300 + (96 - s), s); d.text(x, y + 420, l, { size: 12, w: 700, fill: 'muted' }); return x + Math.max(s, 90) + 30; }, 80);
  // clear space
  d.text(560, y + 270, 'Bo\'sh joy', { size: 18, w: 800 });
  d.rect(580, y + 290, 200, 200, { r: 8, fill: 'brand-tint', stroke: 'brand', sw: 1.5, dash: '6 5' });
  d.tile(640, y + 350, 80);
  d.text(680, y + 508, 'x = belgi balandligining 1/2', { size: 12, w: 700, fill: 'muted', anchor: 'middle' });
  d.text(610, y + 355, 'x', { size: 14, w: 800, fill: 'brand-ink', anchor: 'middle' });
  // wordmark
  d.text(860, y + 270, 'Wordmark', { size: 18, w: 800 });
  d.text(860, y + 330, 'Milliy sertifikat', { size: 40, w: 600, h: true });
  d.text(860, y + 368, 'Onest SemiBold, harf oralig\'i 0, bitta qatorda', { size: 13, w: 700, fill: 'muted' });
  d.chip(860, y + 392, 'MATEMATIKA', 'accent-soft', 'accent', { size: 13, h: 30, px: 16 });
  d.text(1000, y + 412, 'Nunito ExtraBold 13, bosh harflar', { size: 12, w: 700, fill: 'muted' });
  // don'ts
  d.rect(80, y + 520, 1240, 230, { r: 24, fill: 'danger-soft', stroke: 'danger', sw: 2 });
  d.text(110, y + 560, 'Mumkin emas', { size: 18, w: 800, fill: 'danger' });
  ['Belgi rangini o\'zgartirish (faqat 4 ta tasdiqlangan variant)', 'Cho\'zish, aylantirish, soya yoki gradient qo\'shish', 'Murakkab rasm yoki past kontrastli fon ustiga qo\'yish', '"π" o\'rniga boshqa belgi yoki mashot qo\'yish', 'Belgini 24 dp dan kichik chizish'].forEach((t, i) => d.text(110, y + 596 + i * 28, '✕   ' + t, { size: 15, w: 700, fill: 'ink-soft' }));
  // little tiles of don'ts
  d.tile(900, y + 570, 64, 'accent-soft', 'accent', 'accent'); d.add(`<line x1="896" y1="${y + 566}" x2="970" y2="${y + 640}" stroke="${C.danger}" stroke-width="4"/>`);
  d.add(`<g transform="rotate(14 1040 ${y + 600})">`); d.tile(1010, y + 568, 64); d.add('</g>');
  d.add(`<line x1="1006" y1="${y + 566}" x2="1080" y2="${y + 640}" stroke="${C.danger}" stroke-width="4"/>`);
  d.save('01-logotip.svg', y + 840);
}

// =====================================================================
// 02 Colors
// =====================================================================
const GROUPS = [
  ['Brend (to\'q sariq)', [['brand', 'Asosiy tugma, faol tab, to\'ldirilgan progress'], ['brand-edge', 'Tugmaning pastki 3D qirrasi'], ['brand-current', 'Joriy savol segmenti'], ['brand-soft', 'Yumshoq urg\'u: grafik ustun, chegara'], ['brand-tint', 'Chip va izoh foni'], ['brand-ink', 'To\'q sariq fondagi matn']]],
  ['Aksent (binafsha)', [['accent', 'Havola, chip matni, ikkilamchi urg\'u'], ['accent-soft', 'Chip va tanlangan band foni'], ['selected', 'Tanlangan element chegarasi']]],
  ['Holat', [['success', 'To\'g\'ri, juftlangan, o\'sish'], ['success-soft', 'To\'g\'ri javob foni'], ['success-line', 'Yashil karta chegarasi'], ['success-ink', 'Yashil fondagi matn'], ['danger', 'Xato, noto\'g\'ri'], ['danger-soft', 'Xato foni'], ['gold', 'Daraja nishoni, belgilangan savol'], ['gold-edge', 'Kubok pastki qirrasi'], ['warn-soft', 'Ogohlantirish, tavsiya foni']]],
  ['Neytral', [['ink', 'Asosiy matn'], ['ink-soft', 'Ikkilamchi matn'], ['muted', 'Izoh, yordamchi matn'], ['faint', 'Placeholder, o\'chirilgan matn'], ['line', 'Ajratgich chiziq'], ['line-strong', 'Karta va tugma chegarasi'], ['page', 'Ekran foni'], ['surface', 'Karta ichidagi fon'], ['track', 'Progress yo\'li, nofaol fon'], ['white', 'Karta va tugma foni'], ['disabled-bg', 'O\'chirilgan tugma foni'], ['disabled-edge', 'O\'chirilgan tugma qirrasi']]],
];
module.exports.GROUPS = GROUPS;
{
  const d = new Doc(1440);
  let y = d.head('02', 'Ranglar', 'Barcha ranglar app/globals.css dagi --color-* tokenlari bilan bir xil nom va qiymatda. Android uchun tokens/colors.xml va Color.kt fayllari berilgan.');
  const total = GROUPS.reduce((a, g) => a + 40 + Math.ceil(g[1].length / 6) * 176, 0);
  d.panel(40, y);
  let yy = y + 40;
  for (const [g, items] of GROUPS) {
    d.text(80, yy + 18, g, { size: 18, w: 800 });
    yy += 36;
    items.forEach(([n, use], i) => {
      const x = 80 + (i % 6) * 213, cy = yy + Math.floor(i / 6) * 192;
      d.box(x, cy, 200, 176, { r: 20, fill: 'white' });
      d.add(`<clipPath id="cp${n}${g.length}"><rect x="${x}" y="${cy}" width="200" height="84" rx="20"/></clipPath>`);
      d.add(`<rect x="${x}" y="${cy}" width="200" height="94" fill="${C[n]}" clip-path="url(#cp${n}${g.length})"/>`);
      if (['white', 'page', 'surface', 'track', 'line', 'brand-tint', 'accent-soft', 'success-soft', 'danger-soft', 'warn-soft', 'disabled-bg'].includes(n)) d.rect(x + 2, cy + 90, 196, 2, { fill: 'line-strong' });
      d.text(x + 14, cy + 114, n, { size: 14, w: 800 });
      d.text(x + 14, cy + 132, C[n].toUpperCase(), { size: 12, w: 700, fill: 'muted' });
      d.para(x + 14, cy + 148, use, { size: 10.5, lh: 13, maxw: 176, fill: 'faint' });
    });
    yy += Math.ceil(items.length / 6) * 192 + 4;
  }
  d.save('02-ranglar.svg', y + total + 80);
}

// =====================================================================
// 03 Contrast
// =====================================================================
const PAIRS = [['ink', 'white', 'Asosiy matn'], ['ink-soft', 'white', 'Ikkilamchi matn'], ['muted', 'white', 'Izoh matni'], ['faint', 'white', 'Placeholder'], ['white', 'brand', 'Tugma matni (Button 16 Black)'], ['brand-ink', 'brand-tint', 'To\'q sariq chip'], ['brand-ink', 'warn-soft', 'Ogohlantirish'], ['accent', 'accent-soft', 'Binafsha chip'], ['success-ink', 'success-soft', 'Yashil chip'], ['white', 'success', 'Yashil nishon'], ['danger', 'danger-soft', 'Xato matni'], ['white', 'danger', 'Xato nishoni'], ['white', 'selected', 'Tanlangan harf nishoni'], ['white', 'accent', 'Binafsha tugma']];
const level = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'faqat katta matn' : 'o\'tmaydi');
const FIX = {
  brand: darken(C.brand, '#ffffff', 4.5),
  faint: darken(C.faint, '#ffffff', 4.5),
  success: darken(C.success, '#ffffff', 4.5),
  danger: darken(C.danger, C['danger-soft'], 4.5),
};
module.exports.PAIRS = PAIRS; module.exports.FIX = FIX; module.exports.contrast = contrast; module.exports.level = level;
{
  const d = new Doc(1440);
  let y = d.head('03', 'Kontrast (WCAG 2.x)', 'AA: oddiy matn uchun 4.5:1, katta matn (24 px yoki 18.7 px qalin) uchun 3:1. Nisbatlar rang qiymatlaridan hisoblangan.');
  const rows = Math.ceil(PAIRS.length / 2);
  d.panel(40, y);
  PAIRS.forEach(([fg, bg, label], i) => {
    const x = 80 + (i % 2) * 660, cy = y + 40 + Math.floor(i / 2) * 92;
    const r = contrast(fg, bg), ok = r >= 4.5, mid = r >= 3;
    d.box(x, cy, 640, 78, { r: 18, sb: 3 });
    d.rect(x + 14, cy + 11, 64, 52, { r: 14, fill: bg, stroke: 'line-strong', sw: 1 });
    d.text(x + 46, cy + 45, 'Aa', { size: 20, w: 600, fill: fg, anchor: 'middle', h: true });
    d.text(x + 94, cy + 30, label, { size: 15, w: 800 });
    d.text(x + 94, cy + 52, `${fg} / ${bg}`, { size: 12, w: 700, fill: 'muted' });
    d.chip(x + 640 - 24 - d.tw(`${r.toFixed(2)}:1 · ${level(r)}`, 12) - 20, cy + 26, `${r.toFixed(2)}:1 · ${level(r)}`, ok ? 'success-soft' : mid ? 'warn-soft' : 'danger-soft', ok ? 'success-ink' : mid ? 'brand-ink' : 'danger');
  });
  const by = y + 40 + rows * 92 + 20;
  d.rect(80, by, 1240, 190, { r: 20, fill: 'warn-soft', stroke: 'brand-soft', sw: 2 });
  d.text(110, by + 36, 'Topilmalar va takliflar', { size: 18, w: 800, fill: 'brand-ink' });
  const lines = [
    `1) Tugmadagi oq matn #E8590C fonida ${contrast('white', 'brand').toFixed(2)}:1: faqat katta matn sifatida o'tadi, 16 px Button uchun AA emas. Variantlar: matnni 18.7 px+ Black qiling yoki tugma fonini ${FIX.brand.toUpperCase()} gacha to'qlashtiring.`,
    `2) faint (#A9A5C0) oq fonda ${contrast('faint', 'white').toFixed(2)}:1: faqat o'chirilgan holat va dekor uchun. Placeholder uchun ${FIX.faint.toUpperCase()} ishlating.`,
    `3) Oq belgi yashil nishonda ${contrast('white', 'success').toFixed(2)}:1: belgini qalin 18 px+ qiling yoki yashilni ${FIX.success.toUpperCase()} ga to'qlashtiring.`,
    `4) Xato matni danger-soft fonda ${contrast('danger', 'danger-soft').toFixed(2)}:1: matn rangini ${FIX.danger.toUpperCase()} ga to'qlashtiring.`,
  ];
  let ly = by + 64;
  lines.forEach((t) => { ly = d.para(110, ly, t, { size: 14, maxw: 1180, fill: 'ink-soft', lh: 20 }) + 4; });
  d.save('03-kontrast.svg', y + rows * 92 + 360);
}

// =====================================================================
// 04 Typography
// =====================================================================
const SCALE = [
  ['Display/Score', 'Onest', 700, 44, 52, '≈ 61', 'Ball, katta raqamlar'],
  ['Heading/H1', 'Onest', 600, 24, 30, 'Imtihonlar', 'Ekran sarlavhasi, savol raqami'],
  ['Heading/H2', 'Onest', 600, 20, 26, 'Savollar paneli', 'TopBar sarlavhasi, dialog'],
  ['Title/Section', 'Nunito', 800, 16, 22, 'Ball dinamikasi', 'Karta va bo\'lim sarlavhasi'],
  ['Body/Large', 'Nunito', 800, 16, 24, '24 va 84 sonlarining EKUKini toping.', 'Savol matni, javoblar, kiritish'],
  ['Body/Strong', 'Nunito', 800, 14, 20, 'Ism va familiya', 'Yorliq, chip, ikkilamchi sarlavha'],
  ['Body/Regular', 'Nunito', 600, 14, 20, 'Natijalaringiz shu ism bilan saqlanadi.', 'Tavsif, izoh'],
  ['Caption', 'Nunito', 700, 12, 16, '18-noyabr · 112 daq', 'Yordamchi matn, vaqt'],
  ['Button', 'Nunito', 900, 16, 20, 'Imtihonni boshlash', 'Tugma matni'],
  ['Label/Nav', 'Nunito', 800, 11, 14, 'Bosh sahifa', 'Pastki navigatsiya yorlig\'i'],
];
module.exports.SCALE = SCALE;
{
  const d = new Doc(1440);
  let y = d.head('04', 'Shriftlar', 'Ikki shrift oilasi: Onest (sarlavhalar, ball) va Nunito (interfeys, javoblar). Ikkalasi ham SIL OFL, kirill, lotin va qoraqalpoq harflarini qo\'llaydi. Android\'da o\'lchamlar sp (dp bilan bir xil raqam). Shrift fayllari fonts/ papkasida.');
  d.panel(40, y);
  [['Onest', 'Sarlavhalar, katta ball, nom', [[600, 'SemiBold', 'Heading'], [700, 'Bold', 'Display / ball']]], ['Nunito', 'Interfeys matni, tugma, javoblar', [[600, 'SemiBold', 'Body Regular'], [700, 'Bold', 'Caption'], [800, 'ExtraBold', 'Title, Body Strong'], [900, 'Black', 'Button']]]].forEach(([fam, role, ws], i) => {
    const x = 80 + i * 650;
    d.box(x, y + 40, 630, 360, { r: 24 });
    d.add(`<text x="${x + 28}" y="${y + 150}" font-size="110" font-weight="${fam === 'Onest' ? 700 : 900}" fill="${C.brand}" class="${fam === 'Onest' ? 'h' : ''}" style="${fam === 'Nunito' ? "font-family:'Nunito'" : ''}">Aa</text>`);
    d.add(`<text x="${x + 220}" y="${y + 106}" font-size="36" font-weight="${fam === 'Onest' ? 600 : 800}" fill="${C.ink}" style="font-family:'${fam}'">${fam}</text>`);
    d.text(x + 220, y + 134, role, { size: 14, w: 600, fill: 'muted' });
    ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 ≈ π ² ₁ √ ÷ × ± − / %'].forEach((t, k) => d.add(`<text x="${x + 28}" y="${y + 196 + k * 28}" font-size="18" font-weight="${fam === 'Onest' ? 500 : 700}" fill="${C['ink-soft']}" style="font-family:'${fam}'">${esc(t)}</text>`));
    ws.forEach(([w, n, use], k) => {
      d.add(`<text x="${x + 28}" y="${y + 300 + k * 26}" font-size="19" font-weight="${w}" fill="${C.ink}" style="font-family:'${fam}'">${n} · Milliy sertifikat</text>`);
      d.chip(x + 630 - 28 - d.tw(use, 12) - 20, y + 283 + k * 26, use, 'accent-soft', 'accent', { h: 22 });
    });
  });
  // language coverage
  const ly = y + 430;
  d.box(80, ly, 1240, 190, { r: 24 });
  d.text(110, ly + 38, 'Til qamrovi (4 til)', { size: 18, w: 800 });
  [['uz', 'Sonlarni tub ko\'paytuvchilarga ajratamiz. O\'zbekcha harflar: o\', g\', sh, ch.'], ['ru', 'Разложим числа на простые множители. Найдите НОК чисел.'], ['kaa', 'Sanlardı tub kóbeytiwshilerge ajıratamız. Qaraqalpaq harfleri: á ǵ ı ń ó ú.'], ['en', 'Factor the numbers into primes. Find the least common multiple.']].forEach(([l, t], k) => {
    d.chip(110, ly + 58 + k * 31, l, 'brand-tint', 'brand-ink', { size: 13, w: 800, h: 24, px: 12 });
    d.add(`<text x="${110 + 70}" y="${ly + 76 + k * 31}" font-size="16" font-weight="700" fill="${C.ink}">${esc(t)}</text>`);
  });
  // scale
  let sy = ly + 220;
  d.text(80, sy, 'Matn uslublari', { size: 18, w: 800 });
  sy += 20;
  d.rect(80, sy, 1240, 40, { r: 14, fill: 'surface' });
  [['Namuna', 100], ['Uslub', 640], ['Shrift · o\'lcham/qator', 810], ['Qayerda ishlatiladi', 1040]].forEach(([t, x]) => d.text(x, sy + 26, t, { size: 12, w: 800, fill: 'muted' }));
  sy += 40;
  SCALE.forEach(([n, fam, w, size, lh, sample, use], i) => {
    const rh = Math.max(56, lh + 28);
    if (i % 2) d.rect(80, sy, 1240, rh, { fill: 'surface', op: 0.6 });
    d.add(`<text x="100" y="${sy + rh / 2 + size * 0.35}" font-size="${size}" font-weight="${w}" fill="${C.ink}" style="font-family:'${fam}'">${esc(sample)}</text>`);
    d.text(640, sy + rh / 2 + 5, n, { size: 14, w: 800, fill: 'accent' });
    d.text(810, sy + rh / 2 + 5, `${fam} ${{ 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' }[w]} · ${size}/${lh}`, { size: 14, w: 600, fill: 'ink-soft' });
    d.text(1040, sy + rh / 2 + 5, use, { size: 13, w: 600, fill: 'muted' });
    sy += rh;
  });
  d.rect(80, sy + 24, 1240, 74, { r: 18, fill: 'accent-soft' });
  d.para(104, sy + 52, 'Matematik matn: ilovada formulalar KaTeX (Markdown + $...$) bilan chiziladi, maketlarda oddiy Unicode (x₁², π, √, ×, ÷, −). Minus uchun "−" (U+2212), kasr uchun "3/4". Foydalanuvchi javobi 64 belgigacha.', { size: 14, maxw: 1190, fill: 'ink-soft', lh: 20 });
  d.save('04-shriftlar.svg', sy + 150);
}

// =====================================================================
// 05 Layout, spacing, shape
// =====================================================================
{
  const d = new Doc(1440);
  let y = d.head('05', 'O\'lchamlar va shakl', 'Android (dp): ekran 360×800, 4 dp qadam. Touch maydoni kamida 48×48 dp.');
  d.panel(40, y);
  // anatomy
  d.text(80, y + 50, 'Ekran anatomiyasi (0.5×)', { size: 18, w: 800 });
  const bands = [['Status bar', 24, 'track'], ['Top bar', 56, 'accent-soft'], ['Kontent', 200, 'surface'], ['Imtihon bottom bar', 84, 'brand-tint'], ['Bottom nav', 80, 'brand-soft']];
  let by = y + 70; d.rect(80, by - 2, 184, bands.reduce((a, b) => a + b[1] / 2, 0) + 4, { r: 14, fill: 'line-strong' });
  bands.forEach(([n, h, c]) => { d.rect(82, by, 180, h / 2, { fill: c }); d.text(172, by + h / 4 + 4, `${n} · ${h}`, { size: 10.5, w: 700, fill: 'ink-soft', anchor: 'middle' }); by += h / 2; });
  // metrics
  const mx = 330; d.text(mx, y + 50, 'Metrikalar', { size: 18, w: 800 });
  const metrics = [['Ekran', '360 × 800 dp', 'Asosiy kadr'], ['Gorizontal chekka', '16 dp', 'Kontent chetidan'], ['Kartalar orasi', '12–16 dp', 'Vertikal ritm'], ['Karta ichki bo\'shlig\'i', '16 dp (ixcham: 12)', 'Padding'], ['Status bar', '24 dp', 'Tizim'], ['Top bar', '56 dp', 'Markazlashgan sarlavha'], ['Bottom nav', '80 dp', '5 tab, faol "tabletka" 64×32'], ['Imtihon pastki paneli', '84 dp', 'Oldingi / Savollar / Keyingi'], ['Tugma balandligi', '56 dp', 'Primary va Secondary'], ['Kiritish maydoni', '52–56 dp', 'Raqamli klaviatura tugmasi 46 dp'], ['Variant kartasi', '≥ 60 dp', 'Harf nishoni 34 dp'], ['Touch maydon', '≥ 48 dp', 'Ikonka tugmalari 44–48']];
  metrics.forEach(([a, b, c], i) => { const my = y + 70 + i * 34; if (i % 2) d.rect(mx, my, 1030 - 0, 34, { r: 8, fill: 'surface' }); d.text(mx + 14, my + 22, a, { size: 14, w: 800 }); d.text(mx + 270, my + 22, b, { size: 14, w: 800, fill: 'brand-ink' }); d.text(mx + 480, my + 22, c, { size: 13, w: 600, fill: 'muted' }); });
  // spacing
  let sy = y + 520; d.text(80, sy, 'Bo\'shliq shkalasi', { size: 18, w: 800 });
  [4, 8, 12, 16, 20, 24, 32, 48].reduce((x, v) => { d.rect(x, sy + 70 - v, v, v, { r: 3, fill: v > 24 ? 'brand-soft' : 'brand' }); d.text(x, sy + 96, `${v}`, { size: 13, w: 800 }); if (v > 24) d.text(x, sy + 114, 'taklif', { size: 10, w: 700, fill: 'muted' }); return x + Math.max(v, 36) + 34; }, 80);
  // radius
  sy += 160; d.text(80, sy, 'Burchak radiusi', { size: 18, w: 800 });
  [[10, 'Klaviatura tugmasi'], [12, 'Segment, kichik maydon'], [14, 'Ikonka tile'], [16, 'Tugma, kiritish, variant'], [20, 'Karta'], [24, 'Katta karta'], [28, 'Dialog, bottom sheet'], [999, 'Chip, pill']].forEach(([v, u], i) => {
    const x = 80 + i * 158;
    d.rect(x, sy + 20, 140, 84, { r: v === 999 ? 42 : v, fill: 'brand-tint', stroke: 'brand', sw: 2 });
    d.text(x, sy + 130, v === 999 ? '999 (pill)' : `radius/${v}`, { size: 13, w: 800 });
    d.para(x, sy + 148, u, { size: 11, maxw: 140, fill: 'muted', lh: 14 });
  });
  // border & shadow
  sy += 220; d.text(80, sy, 'Chegara: "bosiladigan" qirra', { size: 18, w: 800 });
  d.box(80, sy + 24, 160, 84, { r: 16 }); d.text(80, sy + 130, 'Karta: 2 + 4 px', { size: 13, w: 700, fill: 'muted' });
  d.button(270, sy + 24, 160, '', 'primary', { h: 84 }); d.text(270, sy + 130, 'Tugma: pastki 5 px', { size: 13, w: 700, fill: 'muted' });
  d.box(460, sy + 24, 160, 84, { r: 16, fill: 'accent-soft', line: 'selected' }); d.text(460, sy + 130, 'Tanlangan: 2 + 4 px', { size: 13, w: 700, fill: 'muted' });
  d.para(680, sy + 44, 'Chegara doim ichkarida (inside). Faqat pastki qirra qalinroq: tugma bosilganda 4–5 px pastga "cho\'kadi" (pressed holat: qirra 1 px, kontent 4 px pastga).', { size: 14, maxw: 330, fill: 'ink-soft', lh: 20 });
  d.text(1060, sy, 'Soya: Shadow/Card', { size: 18, w: 800 });
  d.rect(1040, sy + 20, 290, 150, { r: 16, fill: 'page' });
  d.add(`<g filter="url(#shadow)"><rect x="1080" y="${sy + 50}" width="210" height="90" rx="20" fill="#fff"/></g>`);
  d.rect(1080, sy + 50, 210, 90, { r: 20, stroke: 'line-strong', sw: 2 });
  d.text(1185, sy + 102, 'Karta', { size: 15, w: 800, anchor: 'middle' });
  d.para(1040, sy + 196, '0 / 8 / blur 20, spread −10, ink 18%. Faqat suzuvchi elementlar uchun.', { size: 12, maxw: 290, fill: 'muted', lh: 16 });
  d.save('05-ulchamlar-shakl.svg', y + 1280);
}

// =====================================================================
// 06 Components
// =====================================================================
{
  const d = new Doc(1440);
  let y = d.head('06', 'Komponentlar', 'Asosiy UI elementlari va ularning holatlari. Hammasi tokenlar asosida; yangi element qo\'shsangiz shu qoidalarga amal qiling.');
  d.panel(40, y);
  const c1 = 80, c2 = 520, c3 = 960, W = 400;
  const lab = (x, yy, t) => d.text(x, yy, t, { size: 15, w: 800, fill: 'accent' });
  // col 1: buttons, chips, inputs, progress
  let yy = y + 50; lab(c1, yy, 'Tugmalar'); yy += 16;
  d.button(c1, yy, W, 'Imtihonni boshlash', 'primary'); yy += 70;
  d.button(c1, yy, W, 'Yana urinish', 'secondary'); yy += 70;
  d.button(c1, yy, W, 'Topshirish', 'disabled'); d.text(c1 + W + 6, yy + 34, '', {}); yy += 70;
  d.button(c1, yy, 190, 'Oldingi', 'secondary'); d.button(c1 + 210, yy, 190, 'Keyingi', 'primary'); yy += 90;
  lab(c1, yy, 'Chiplar'); yy += 14;
  let cx = c1; [['Yangi', 'brand-tint', 'brand-ink'], ['61 ball', 'success-soft', 'success-ink'], ['Xato', 'danger-soft', 'danger'], ['B+', 'warn-soft', 'brand-ink'], ['Y-2', 'accent-soft', 'accent']].forEach(([t, b, f]) => { cx += d.chip(cx, yy, t, b, f) + 8; });
  yy += 40; cx = c1; d.chip(cx, yy, 'Hammasi', 'ink', 'white', { size: 14, h: 36, px: 16 }); cx += 100; d.chip(cx, yy, 'Yangi', 'white', 'ink-soft', { size: 14, h: 36, px: 16, stroke: 'line-strong' }); yy += 70;
  lab(c1, yy, 'Kiritish maydoni'); yy += 14;
  [['Oddiy', 'line-strong', 'Ism va familiya', 'faint'], ['Fokus', 'selected', 'Javohir Karimov', 'ink'], ['Xato', 'danger', '+998 90 12', 'ink']].forEach(([n, ln, t, tc], i) => {
    d.rect(c1, yy, W, 56, { r: 16, fill: ln }); d.rect(c1 + 2, yy + 2, W - 4, 52, { r: 14, fill: 'white' }); d.text(c1 + 16, yy + 34, t, { size: 16, w: 800, fill: tc }); d.text(c1 + W - 14, yy + 34, n, { size: 11, w: 700, fill: 'muted', anchor: 'end' });
    if (i === 2) d.text(c1, yy + 74, 'Telefon raqami to\'liq emas', { size: 12, w: 700, fill: 'danger' });
    yy += i === 2 ? 116 : 68;
  });
  lab(c1, yy, 'Progress'); yy += 14;
  d.rect(c1, yy, W, 10, { r: 5, fill: 'track' }); d.rect(c1, yy, W * 0.81, 10, { r: 5, fill: 'brand' }); yy += 30;
  for (let k = 1; k <= 45; k++) d.rect(c1 + (k - 1) * (W / 45), yy, W / 45 - 2, 6, { r: 2, fill: k < 12 ? 'brand' : k === 12 ? 'brand-current' : 'track' });
  yy += 34; d.ring(c1 + 36, yy + 36, 36, 10, 0.23, 'brand'); d.text(c1 + 36, yy + 42, '23%', { size: 14, w: 800, anchor: 'middle' }); d.ring(c1 + 120, yy + 36, 36, 10, 0.81, 'success'); d.text(c1 + 120, yy + 42, '61', { size: 18, w: 800, anchor: 'middle' });
  d.text(c1 + 170, yy + 30, 'Ring: qalinlik 14%', { size: 12, w: 700, fill: 'muted' });
  // col 2: option cards, segment, banners
  yy = y + 50; lab(c2, yy, 'Javob varianti (OptionCard)'); yy += 14;
  [['A', '16/15', 'white', 'line-strong', 'track', 'ink', 'default'], ['B', '3/5', 'accent-soft', 'selected', 'selected', 'white', 'tanlangan'], ['C', '32/15', 'success-soft', 'success', 'success', 'white', 'to\'g\'ri (mashq)'], ['D', '2', 'danger-soft', 'danger', 'danger', 'white', 'noto\'g\'ri (mashq)']].forEach(([L, t, bg, ln, bb, fg, st]) => {
    d.box(c2, yy, W, 60, { r: 16, fill: bg, line: ln }); d.add(`<circle cx="${c2 + 32}" cy="${yy + 28}" r="17" fill="${C[bb]}"/>`); d.text(c2 + 32, yy + 34, L, { size: 16, w: 800, fill: fg, anchor: 'middle' }); d.text(c2 + 60, yy + 35, t, { size: 16, w: 800 }); d.text(c2 + W - 14, yy + 34, st, { size: 11, w: 700, fill: 'muted', anchor: 'end' }); yy += 70;
  });
  lab(c2, yy + 22, 'Segment'); yy += 40;
  d.rect(c2, yy, W, 48, { r: 16, fill: 'track' }); d.box(c2 + 4, yy + 4, 194, 40, { r: 12, sb: 3 }); d.text(c2 + 101, yy + 29, 'Mavzular', { size: 14, w: 800, anchor: 'middle' }); d.text(c2 + 299, yy + 29, 'Qiyinlik', { size: 14, w: 800, fill: 'muted', anchor: 'middle' }); yy += 76;
  lab(c2, yy, 'Izoh bloklari'); yy += 14;
  [['info', 'accent-soft', 'accent', 'Natija taxminiy: rasmiy natijaga mos kelmasligi mumkin.', 'ink-soft'], ['alert', 'warn-soft', 'brand-ink', 'Vaqt serverda hisoblanadi, ilovani yopsangiz ham to\'xtamaydi.', 'ink-soft'], ['x', 'danger-soft', 'danger', 'Javob saqlanmadi. Qayta urinib ko\'ring.', 'ink-soft'], ['check', 'success-soft', 'success-ink', 'Javoblar saqlandi.', 'ink-soft']].forEach(([ic, bg, fg, t, tc]) => {
    d.rect(c2, yy, W, 56, { r: 16, fill: bg }); d.icon(ic, c2 + 14, yy + 17, 22, fg); d.para(c2 + 46, yy + 24, t, { size: 13, maxw: W - 64, fill: tc, lh: 16 }); yy += 66;
  });
  lab(c2, yy + 16, 'Top bar'); yy += 32;
  d.rect(c2, yy, W, 56, { r: 0, fill: 'white', stroke: 'line', sw: 1 }); d.icon('arrow-left', c2 + 12, yy + 16, 24); d.text(c2 + W / 2, yy + 35, 'Natija', { size: 20, w: 600, anchor: 'middle', h: true }); yy += 86;
  lab(c2, yy, 'Karta turlari'); yy += 14;
  d.box(c2, yy, 190, 70, { r: 20 }); d.text(c2 + 14, yy + 30, 'Oddiy karta', { size: 14, w: 800 }); d.text(c2 + 14, yy + 50, 'oq, 2+4 px chegara', { size: 11, w: 700, fill: 'muted' });
  d.rect(c2 + 210, yy, 190, 70, { r: 20, fill: 'brand' }); d.rect(c2 + 210, yy + 62, 190, 8, { r: 4, fill: 'brand-edge' }); d.rect(c2 + 210, yy, 190, 64, { r: 20, fill: 'brand' }); d.text(c2 + 224, yy + 30, 'Hero karta', { size: 14, w: 800, fill: 'white' }); d.text(c2 + 224, yy + 50, 'brand, 5 px qirra', { size: 11, w: 700, fill: 'white' });
  // col 3: nav, cells, keyboard, timer
  yy = y + 50; lab(c3, yy, 'Bottom nav (80 dp)'); yy += 14;
  d.rect(c3, yy, W, 80, { fill: 'white', stroke: 'line', sw: 1 });
  [['home', 'Bosh sahifa', true], ['file-text', 'Imtihon', false], ['book', 'Mashq', false], ['chart', 'Natijalar', false], ['menu', 'Yana', false]].forEach(([ic, t, on], i) => { const x = c3 + i * 80 + 40; if (on) d.rect(x - 32, yy + 12, 64, 32, { r: 16, fill: 'brand-tint' }); d.icon(ic, x - 12, yy + 16, 24, on ? 'brand' : 'muted', on ? 2.4 : 2); d.text(x, yy + 62, t, { size: 11, w: 800, fill: on ? 'brand-ink' : 'muted', anchor: 'middle' }); });
  yy += 120; lab(c3, yy, 'Savol katakchalari (panel, 34 dp)'); yy += 14;
  [['12', 'white', 'line-strong', 'ink-soft', 'javobsiz'], ['5', 'success-soft', 'success-line', 'success-ink', 'javob berilgan'], ['8', 'warn-soft', 'gold', 'brand-ink', 'belgilangan'], ['2', 'brand', 'brand-edge', 'white', 'joriy']].forEach(([n, bg, ln, fg, t], i) => { const x = c3 + i * 100; d.rect(x, yy, 34, 34, { r: 10, fill: ln }); d.rect(x + 2, yy + 2, 30, 30, { r: 8, fill: bg }); d.text(x + 17, yy + 23, n, { size: 12, w: 800, fill: fg, anchor: 'middle' }); d.text(x, yy + 54, t, { size: 10, w: 700, fill: 'muted' }); });
  yy += 90; lab(c3, yy, 'Taymer (imtihon)'); yy += 14;
  [['02:14:36', 'white', 'line-strong', 'ink', 'brand', 'oddiy'], ['09:42', 'warn-soft', 'gold', 'brand-ink', 'brand-ink', 'oxirgi 10 daq (taklif)'], ['00:48', 'danger-soft', 'danger', FIX.danger, 'danger', 'oxirgi 1 daq (taklif)']].forEach(([t, bg, ln, fg, ic, cap], i) => { const yy2 = yy + i * 58; d.rect(c3, yy2, 150, 44, { r: 22, fill: ln }); d.rect(c3 + 2, yy2 + 2, 146, 38, { r: 20, fill: bg }); d.icon('clock', c3 + 14, yy2 + 11, 20, ic, 2.4); d.text(c3 + 42, yy2 + 28, t, { size: 16, w: 800, fill: fg }); d.text(c3 + 170, yy2 + 28, cap, { size: 12, w: 700, fill: 'muted' }); });
  yy += 190; lab(c3, yy, 'Raqamli klaviatura tugmalari'); yy += 14;
  ['1', '2', '/', '−'].forEach((k, i) => { const x = c3 + i * 74; d.rect(x, yy, 66, 46, { r: 10, fill: 'line-strong' }); d.rect(x, yy, 66, 43, { r: 10, fill: 'white' }); d.text(x + 33, yy + 29, k, { size: 20, w: 800, anchor: 'middle' }); });
  d.rect(c3 + 300, yy, 66, 46, { r: 10, fill: 'brand-edge' }); d.rect(c3 + 300, yy, 66, 43, { r: 10, fill: 'brand' }); d.icon('check', c3 + 321, yy + 11, 24, 'white', 3);
  yy += 90; lab(c3, yy, 'Dialog va bottom sheet'); yy += 14;
  d.rect(c3, yy, W, 130, { r: 14, fill: 'ink', op: 0.55 }); d.rect(c3 + 50, yy + 20, 300, 90, { r: 28, fill: 'white' }); d.text(c3 + 200, yy + 72, 'Dialog: radius 28, 312 dp', { size: 13, w: 800, anchor: 'middle' });
  yy += 150; d.rect(c3, yy, W, 90, { r: 14, fill: 'ink', op: 0.55 }); d.rect(c3, yy + 36, W, 54, { r: 14, fill: 'white' }); d.rect(c3 + 180, yy + 42, 40, 4, { r: 2, fill: 'line' }); d.text(c3 + 200, yy + 74, 'Bottom sheet: tepa radius 28', { size: 13, w: 800, anchor: 'middle' });
  d.save('06-komponentlar.svg', y + 1600);
}

// =====================================================================
// 07 Icons
// =====================================================================
{
  const d = new Doc(1440);
  let y = d.head('07', 'Ikonkalar', 'Chiziqli (outline) ikonkalar, 24×24 to\'r, chiziq qalinligi 2 (faol holatda 2.4), uchlari dumaloq. Manba: Lucide uslubi. Hajm: 14, 16, 20, 24 dp; touch maydon 48 dp.');
  const names = Object.keys(ICONS), rows = Math.ceil(names.length / 6);
  d.panel(40, y);
  names.forEach((n, i) => {
    const x = 80 + (i % 6) * 213, cy = y + 40 + Math.floor(i / 6) * 150;
    d.box(x, cy, 200, 136, { r: 20 });
    d.icon(n, x + 80, cy + 22, 40, 'ink');
    d.text(x + 100, cy + 88, n, { size: 14, w: 800, anchor: 'middle' });
    d.text(x + 100, cy + 108, ICON_USE[n] || '', { size: 11, w: 700, fill: 'muted', anchor: 'middle' });
  });
  const sy = y + 40 + rows * 150 + 20;
  d.text(80, sy, 'O\'lchamlar', { size: 18, w: 800 });
  [14, 16, 20, 24, 32].reduce((x, s) => { d.icon('bell', x, sy + 24, s, 'ink'); d.text(x, sy + 80, `${s} dp`, { size: 12, w: 700, fill: 'muted' }); return x + 70; }, 80);
  d.text(560, sy, 'Ranglar', { size: 18, w: 800 });
  [['ink', 'asosiy'], ['muted', 'nofaol'], ['brand', 'faol tab'], ['accent', 'havola'], ['success', 'to\'g\'ri'], ['danger', 'xato'], ['white', 'to\'q fonda']].reduce((x, [c, l]) => { if (c === 'white') d.rect(x - 8, sy + 16, 52, 52, { r: 12, fill: 'ink' }); d.icon('check', x, sy + 24, 36, c, 2.6); d.text(x + 18, sy + 80, l, { size: 11, w: 700, fill: 'muted', anchor: 'middle' }); return x + 82; }, 560);
  d.rect(80, sy + 110, 1240, 70, { r: 18, fill: 'accent-soft' });
  d.para(104, sy + 138, 'Yangi ikonka kerak bo\'lsa shu to\'rdan chizing: 24×24, 2 px chiziq, dumaloq uchlar, ichki bo\'shliq 2 px. Kontent ikonkalarini (mashot, bezak) bu to\'plamga aralashtirmang. Rangsiz ikonka foni: faqat 12–14 radiusli tile ichida.', { size: 14, maxw: 1190, fill: 'ink-soft', lh: 20 });
  d.save('07-ikonkalar.svg', sy + 220);
}

// =====================================================================
// 08 States (answer feedback, system states)
// =====================================================================
{
  const d = new Doc(1440);
  let y = d.head('08', 'Holatlar (taklif)', 'Mashq rejimida javob tekshirilgandan keyingi ko\'rinish uch savol turi uchun, shuningdek tizim holatlari. Imtihon rejimida to\'g\'ri/noto\'g\'ri HECH QACHON ko\'rsatilmaydi: faqat tanlangan javob (binafsha) ko\'rinadi.');
  d.panel(40, y);
  const lab = (x, yy, t) => d.text(x, yy, t, { size: 15, w: 800, accent: 1, fill: 'accent' });
  // Y-1 wrong + correct reveal
  let x = 80; lab(x, y + 50, 'Y-1: noto\'g\'ri tanlandi (mashq)');
  let yy = y + 66;
  [['A', '16/15', 'success-soft', 'success', 'success', 'white', true], ['B', '3/5', 'white', 'line-strong', 'track', 'ink', false], ['C', '32/15', 'danger-soft', 'danger', 'danger', 'white', false], ['D', '2', 'white', 'line-strong', 'track', 'ink', false]].forEach(([L, t, bg, ln, bb, fg, right], i) => {
    d.box(x, yy, 400, 60, { r: 16, fill: bg, line: ln }); d.add(`<circle cx="${x + 32}" cy="${yy + 28}" r="17" fill="${C[bb]}"/>`);
    if (bg === 'success-soft') d.icon('check', x + 22, yy + 18, 20, 'white', 3); else if (bg === 'danger-soft') d.icon('x', x + 22, yy + 18, 20, 'white', 3); else d.text(x + 32, yy + 34, L, { size: 16, w: 800, fill: fg, anchor: 'middle' });
    d.text(x + 60, yy + 35, t, { size: 16, w: 800 }); if (right) d.text(x + 386, yy + 34, 'To\'g\'ri javob', { size: 11, w: 800, fill: 'success-ink', anchor: 'end' }); if (bg === 'danger-soft') d.text(x + 386, yy + 34, 'Sizning javobingiz', { size: 11, w: 800, fill: FIX.danger, anchor: 'end' });
    yy += 70;
  });
  // feedback sheet (top)
  yy += 6; d.rect(x, yy, 400, 190, { r: 24, fill: 'danger-soft', stroke: 'danger', sw: 2 });
  d.icon('x', x + 20, yy + 20, 24, 'danger', 3); d.text(x + 54, yy + 40, 'Noto\'g\'ri', { size: 20, w: 600, fill: FIX.danger, h: true });
  d.para(x + 20, yy + 72, 'Suratni suratga, maxrajni maxrajga ko\'paytiramiz: 4·4 / 5·3 = 16/15.', { size: 14, maxw: 360, fill: 'ink-soft', lh: 20 });
  d.button(x + 20, yy + 124, 360, 'Keyingi', 'danger', { h: 50 });
  // Y-2
  x = 520; lab(x, y + 50, 'Y-2: bandlar (mashq tekshiruvi)');
  yy = y + 66;
  [['1', 'Aylana uzunligi', 'F', 'success', 'ok'], ['2', 'Doira yuzi', 'C', 'danger', 'wrong'], ['3', 'Sektor yuzi', 'C', 'success', 'ok']].forEach(([n, t, a, c, st]) => {
    const soft = st === 'ok' ? 'success-soft' : 'danger-soft';
    d.box(x, yy, 400, 64, { r: 16, fill: soft, line: c }); d.add(`<circle cx="${x + 28}" cy="${yy + 29}" r="14" fill="${C[c]}"/>`); d.text(x + 28, yy + 34, n, { size: 13, w: 800, fill: 'white', anchor: 'middle' }); d.text(x + 54, yy + 35, t, { size: 15, w: 800 });
    d.rect(x + 340, yy + 12, 40, 36, { r: 12, fill: c }); d.text(x + 360, yy + 36, a, { size: 15, w: 800, fill: 'white', anchor: 'middle' });
    if (st === 'wrong') { d.text(x + 54, yy + 54, 'To\'g\'ri juft: D (81π)', { size: 11, w: 800, fill: 'success-ink' }); }
    yy += 74;
  });
  d.rect(x, yy + 6, 400, 100, { r: 20, fill: 'warn-soft' }); d.icon('info', x + 16, yy + 22, 20, 'brand-ink'); d.para(x + 48, yy + 36, 'Bitta band xato: Y-2 da ball faqat barcha bandlar to\'g\'ri bo\'lsagina beriladi (qisman ball yo\'q).', { size: 13, maxw: 336, fill: 'ink-soft', lh: 18 });
  // O
  x = 960; lab(x, y + 50, 'O: ochiq javob (mashq tekshiruvi)');
  yy = y + 66;
  [['a', '−5/3', 'success', 'success-soft', 'check', 'To\'g\'ri'], ['b', '325/35', 'danger', 'danger-soft', 'x', 'Noto\'g\'ri']].forEach(([p, v, c, bg, ic, t]) => {
    d.add(`<circle cx="${x + 12}" cy="${yy + 12}" r="12" fill="${C['accent-soft']}"/>`); d.text(x + 12, yy + 17, p, { size: 13, w: 800, fill: 'accent', anchor: 'middle' }); d.text(x + 34, yy + 17, p === 'a' ? 'Katta ildizni toping.' : 'x₁² + x₂² ni toping.', { size: 14, w: 800 });
    d.rect(x, yy + 28, 400, 56, { r: 16, fill: c }); d.rect(x + 2, yy + 30, 396, 48, { r: 14, fill: bg }); d.text(x + 16, yy + 62, v, { size: 20, w: 600, h: true }); d.icon(ic, x + 360, yy + 44, 24, c, 3);
    if (p === 'b') { d.text(x, yy + 106, 'To\'g\'ri javob: 325/36', { size: 14, w: 800, fill: 'success-ink' }); d.text(x, yy + 126, 'Qabul qilinadigan shakllar: 325/36, 9.0277…', { size: 11, w: 700, fill: 'muted' }); }
    yy += p === 'a' ? 100 : 146;
  });
  d.text(x, yy + 10, 'Javob raqam sifatida solishtiriladi: 3/4 = 0.75 = 0,75.', { size: 12, w: 700, fill: 'muted' });
  // system states
  const sy = y + 650;
  d.text(80, sy, 'Tizim holatlari', { size: 20, w: 800 });
  const card = (x, t, fn) => { d.box(x, sy + 24, 296, 330, { r: 24 }); d.text(x + 20, sy + 56, t, { size: 13, w: 800, fill: 'muted' }); fn(x + 20, sy + 70); };
  card(80, 'BO\'SH (natijalar yo\'q)', (x, yy) => { d.rect(x + 88, yy + 20, 80, 80, { r: 40, fill: 'brand-tint' }); d.icon('chart', x + 112, yy + 44, 32, 'brand'); d.text(x + 128, yy + 140, 'Hali natija yo\'q', { size: 18, w: 600, anchor: 'middle', h: true }); d.para(x + 128, yy + 166, 'Birinchi variantni yeching, natijangiz shu yerda chiqadi.', { size: 13, maxw: 230, anchor: 'middle', lh: 18 }); d.button(x + 8, yy + 214, 240, 'Variantlarga o\'tish', 'primary', { h: 48 }); });
  card(396, 'XATO (tarmoq)', (x, yy) => { d.rect(x + 88, yy + 20, 80, 80, { r: 40, fill: 'danger-soft' }); d.icon('wifi-off', x + 112, yy + 44, 32, 'danger'); d.text(x + 128, yy + 140, 'Ulanish yo\'q', { size: 18, w: 600, anchor: 'middle', h: true }); d.para(x + 128, yy + 166, 'Javoblaringiz telefonda saqlandi, internet qaytganda yuboriladi.', { size: 13, maxw: 230, anchor: 'middle', lh: 18 }); d.button(x + 8, yy + 214, 240, 'Qayta urinish', 'secondary', { h: 48 }); });
  card(712, 'OFFLINE BANNER', (x, yy) => { d.rect(x, yy + 10, 256, 44, { r: 14, fill: 'warn-soft' }); d.icon('wifi-off', x + 12, yy + 22, 20, 'brand-ink'); d.text(x + 40, yy + 37, 'Offline. Javoblar saqlanmoqda', { size: 13, w: 800, fill: 'brand-ink' }); d.rect(x, yy + 70, 256, 44, { r: 14, fill: 'success-soft' }); d.icon('check', x + 12, yy + 82, 20, 'success-ink', 3); d.text(x + 40, yy + 97, 'Yuborildi', { size: 13, w: 800, fill: 'success-ink' }); d.para(x, yy + 150, 'Banner ekran tepasida, top bar ostida; ulanish tiklanganda 2 soniyadan so\'ng yo\'qoladi.', { size: 12, maxw: 256, lh: 16 }); });
  card(1028, 'YUKLANMOQDA (skeleton)', (x, yy) => { for (let k = 0; k < 3; k++) { d.rect(x, yy + k * 74, 256, 60, { r: 16, fill: 'surface' }); d.rect(x + 12, yy + k * 74 + 12, 36, 36, { r: 12, fill: 'track' }); d.rect(x + 60, yy + k * 74 + 16, 120, 10, { r: 5, fill: 'track' }); d.rect(x + 60, yy + k * 74 + 34, 80, 8, { r: 4, fill: 'track' }); } d.para(x, yy + 240, 'Skeleton: track rangi, 1.2 s yumshoq pulsatsiya. Spinner faqat tugma ichida.', { size: 12, maxw: 256, lh: 16 }); });
  // daraja nishonlari
  const dy = sy + 390;
  d.text(80, dy, 'Daraja nishonlari (taklif)', { size: 20, w: 800 });
  [['A+', '70+', 'gold', 'gold-edge', 'white'], ['A', '65+', 'gold', 'gold-edge', 'white'], ['B+', '60+', 'success', 'success-ink', 'white'], ['B', '55+', 'success', 'success-ink', 'white'], ['C+', '50+', 'accent', 'selected', 'white'], ['C', '46+', 'accent', 'selected', 'white'], ['—', '<46', 'track', 'line-strong', 'muted']].forEach(([n, r, bg, edge, fg], i) => {
    const x = 80 + i * 170; d.rect(x, dy + 24, 140, 150, { r: 24, fill: 'surface', stroke: 'line-strong', sw: 2 });
    d.add(`<circle cx="${x + 70}" cy="${dy + 90}" r="38" fill="${C[edge]}"/><circle cx="${x + 70}" cy="${dy + 86}" r="38" fill="${C[bg]}"/>`);
    d.text(x + 70, dy + 99, n, { size: 28, w: 600, fill: fg, anchor: 'middle', h: true }); d.text(x + 70, dy + 158, 'ball ' + r, { size: 12, w: 800, fill: 'muted', anchor: 'middle' });
  });
  d.para(80, dy + 210, 'Daraja chegaralari (75 ball): A+ 70, A 65, B+ 60, B 55, C+ 50, C 46. Natija doim "taxminiy" belgisi bilan ko\'rsatiladi.', { size: 14, maxw: 1200, fill: 'ink-soft' });
  d.save('08-holatlar.svg', y + 1660);
}

// =====================================================================
// 09 App icon + splash
// =====================================================================
{
  const d = new Doc(1440);
  let y = d.head('09', 'Ilova belgisi va splash (taklif)', 'Android adaptive icon: 108×108 dp tuval, xavfsiz zona 66 dp. Belgi: oq "π" to\'q sariq fonda. Android 13+ uchun bir rangli (themed) variant.');
  d.panel(40, y);
  const S = 3; // 1 dp = 3 px
  const icon108 = (x, cy, fgOnly) => {
    d.rect(x, cy, 108 * S, 108 * S, { fill: fgOnly ? 'white' : 'brand', stroke: 'line-strong', sw: 1 });
    if (fgOnly) { d.rect(x, cy, 108 * S, 108 * S, { fill: 'none', stroke: 'line-strong', sw: 1 }); }
    d.text(x + 54 * S, cy + 70 * S, 'π', { size: 56 * S * 0.9, w: 700, fill: fgOnly ? 'brand' : 'white', anchor: 'middle', h: true });
  };
  // layers
  d.text(80, y + 50, 'Qatlamlar', { size: 18, w: 800 });
  d.rect(80, y + 70, 324, 324, { fill: 'brand' }); d.text(242, y + 420, 'Fon: #E8590C', { size: 13, w: 700, fill: 'muted', anchor: 'middle' });
  d.rect(430, y + 70, 324, 324, { fill: 'ink-soft' }); d.add(`<circle cx="592" cy="${y + 232}" r="99" fill="none" stroke="${C['brand-soft']}" stroke-width="1.5" stroke-dasharray="6 5"/>`); d.text(592, y + 306, 'π', { size: 190, w: 700, fill: 'white', anchor: 'middle', h: true }); d.text(592, y + 420, 'Old qatlam (shaffof): oq π, 66 dp xavfsiz zona', { size: 13, w: 700, fill: 'muted', anchor: 'middle' });
  // composed
  d.text(800, y + 50, 'Maska shakllari', { size: 18, w: 800 });
  [['Doira', 'circle'], ['Squircle', 'squircle'], ['Yumaloq kvadrat', 'round']].forEach(([n, k], i) => {
    const cx = 830 + i * 190, cy = y + 90;
    const sz = 144;
    const r = k === 'circle' ? sz / 2 : k === 'squircle' ? sz * 0.36 : sz * 0.22;
    d.rect(cx, cy, sz, sz, { r, fill: 'brand-edge' }); d.rect(cx, cy, sz, sz - 5, { r, fill: 'brand' });
    d.text(cx + sz / 2, cy + sz * 0.7, 'π', { size: sz * 0.62, w: 700, fill: 'white', anchor: 'middle', h: true }); d.text(cx + sz / 2, cy + sz + 28, n, { size: 13, w: 700, fill: 'muted', anchor: 'middle' });
  });
  // themed
  d.text(800, y + 320, 'Themed (Android 13+, bir rangli)', { size: 15, w: 800, fill: 'accent' });
  d.rect(830, y + 340, 120, 120, { r: 60, fill: 'accent-soft' }); d.text(890, y + 420, 'π', { size: 76, w: 700, fill: 'accent', anchor: 'middle', h: true });
  d.rect(990, y + 340, 120, 120, { r: 60, fill: 'ink' }); d.text(1050, y + 420, 'π', { size: 76, w: 700, fill: 'brand-soft', anchor: 'middle', h: true });
  d.para(1140, y + 366, 'Tizim fon rangini obis tanlaydi; qatlam faqat alfa kanalli, bitta rangda.', { size: 12, maxw: 220, lh: 16 });
  // sizes
  const sy = y + 510; d.text(80, sy, 'Eksport o\'lchamlari', { size: 18, w: 800 });
  [[48, 'mdpi 48'], [72, 'hdpi 72'], [96, 'xhdpi 96'], [144, 'xxhdpi 144'], [192, 'xxxhdpi 192 (Play: 512)']].reduce((x, [s, l]) => { d.rect(x, sy + 20 + (192 - s), s, s, { r: s * 0.22, fill: 'brand-edge' }); d.rect(x, sy + 20 + (192 - s), s, s - Math.max(2, s * 0.04), { r: s * 0.22, fill: 'brand' }); d.text(x + s / 2, sy + 20 + (192 - s) + s * 0.7, 'π', { size: s * 0.6, w: 700, fill: 'white', anchor: 'middle', h: true }); d.text(x, sy + 236, l, { size: 12, w: 700, fill: 'muted' }); return x + Math.max(s, 100) + 24; }, 80);
  // splash + notification
  const px = 1000; d.text(px, sy, 'Splash (Android 12+)', { size: 18, w: 800 });
  d.rect(px, sy + 20, 150, 266, { r: 22, fill: 'page', stroke: 'line-strong', sw: 2 }); d.add(`<circle cx="${px + 75}" cy="${sy + 130}" r="46" fill="${C.white}"/>`); d.tile(px + 51, sy + 106, 48); d.text(px + 75, sy + 250, 'Milliy sertifikat', { size: 12, w: 600, anchor: 'middle', h: true });
  d.para(px + 170, sy + 40, 'Fon: page (#F3F1FB). Markazda belgi (animatsiyasiz yoki 400 ms scale). Brend nomi pastda.', { size: 12, maxw: 180, lh: 16 });
  d.text(px + 170, sy + 160, 'Bildirishnoma ikonkasi', { size: 13, w: 800, fill: 'accent' }); d.rect(px + 170, sy + 176, 120, 40, { r: 10, fill: 'ink' }); d.text(px + 200, sy + 204, 'π', { size: 26, w: 700, fill: 'white', anchor: 'middle', h: true }); d.text(px + 222, sy + 202, '24 dp', { size: 12, w: 700, fill: 'faint' });
  d.save('09-ilova-belgisi.svg', y + 940);
}

// =====================================================================
// 10 Flow map
// =====================================================================
{
  const d = new Doc(1440);
  let y = d.head('10', 'Ekranlar xaritasi', 'Figma faylidagi 17 ekranning o\'zaro bog\'lanishi. Pastki navigatsiya 5 tab: Bosh sahifa, Imtihon, Mashq, Natijalar, Yana. Kirish yo\'q: ism/telefon/sinf bilan jim "mehmon" hisob.');
  d.panel(40, y);
  const W = 160, H = 64, Y0 = y + 70, DY = 92;
  const col = { A: 80, C: 330, D: 550, E: 770, F: 990, G: 1200 };
  const tones = { white: ['white', 'line-strong'], brand: ['brand-tint', 'brand'], accent: ['accent-soft', 'selected'], success: ['success-soft', 'success'], warn: ['warn-soft', 'gold'] };
  const nd = (c, r, t, sub, tone = 'white') => {
    const x = col[c], cy = Y0 + r * DY, tn = tones[tone];
    d.box(x, cy, W, H, { r: 16, fill: tn[0], line: tn[1], sb: 3 });
    d.text(x + 14, cy + 28, t, { size: 14, w: 800 }); d.text(x + 14, cy + 48, sub, { size: 11, w: 700, fill: 'muted' });
    return { x, y: cy, r: x + W, b: cy + H, mx: x + W / 2, my: cy + H / 2 };
  };
  const path = (pts, dash) => {
    const dstr = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 10, sp = 0.5;
    const p1 = [b[0] - L * Math.cos(ang - sp), b[1] - L * Math.sin(ang - sp)], p2 = [b[0] - L * Math.cos(ang + sp), b[1] - L * Math.sin(ang + sp)];
    d.add(`<path d="${dstr}" fill="none" stroke="${C['ink-soft']}" stroke-width="2" stroke-linejoin="round"${dash ? ' stroke-dasharray="6 5"' : ''}/><path d="M${p1[0]} ${p1[1]} L${b[0]} ${b[1]} L${p2[0]} ${p2[1]}" fill="none" stroke="${C['ink-soft']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
  };
  const n1 = nd('A', 1, '01 Boshlang\'ich', 'Boshlash', 'brand'), n2 = nd('A', 2, '02 Forma', 'Ism, telefon, sinf'), n3 = nd('A', 3, '03 Bosh sahifa', 'Hub', 'brand');
  const n4 = nd('C', 0, '04 Imtihonlar', 'Imtihon tabi', 'accent'), n15 = nd('C', 2, '15 Mashq', 'Mashq tabi', 'accent'), n13 = nd('C', 4, '13 Natijalar', 'Natijalar tabi', 'accent'), n17 = nd('C', 6, '17 Yana', 'Yana tabi', 'accent');
  const n5 = nd('D', 0, '05 Tafsilot', 'Qoidalar, boshlash');
  const n6 = nd('E', 0, '06 Y-1', 'Yopiq savol', 'warn'), n7 = nd('E', 1, '07 Y-2', 'Moslashtirish', 'warn'), n8 = nd('E', 2, '08 O', 'Ochiq javob', 'warn');
  const n9 = nd('F', 1, '09 Panel', 'Savollar, sheet'), n10 = nd('G', 1, '10 Tasdiqlash', 'Dialog');
  const n11 = nd('G', 3, '11 Natija', 'Taxminiy ball', 'success'), n12 = nd('G', 5, '12 Tahlil', 'Bloklar bo\'yicha', 'success');
  const n14 = nd('D', 6, '14 Xatolar daftari', 'Yana ichida'), n16 = nd('D', 7, '16 DTM kalkulyator', 'Yana ichida');
  path([[n1.mx, n1.b], [n2.mx, n2.y]]); path([[n2.mx, n2.b], [n3.mx, n3.y]]);
  for (const t of [n4, n15, n13, n17]) path([[n3.r, n3.my], [285, n3.my], [285, t.my], [t.x, t.my]]);
  path([[n4.r, n4.my], [n5.x, n5.my]]);
  for (const t of [n6, n7, n8]) path([[n5.r, n5.my], [740, n5.my], [740, t.my], [t.x, t.my]]);
  for (const t of [n6, n7, n8]) path([[t.r, t.my], [960, t.my], [960, n9.my], [n9.x, n9.my]]);
  path([[n9.r, n9.my], [n10.x, n10.my]]);
  path([[n10.mx, n10.b], [n11.mx, n11.y]]); path([[n11.mx, n11.b], [n12.mx, n12.y]]);
  path([[n13.r, n13.my], [1170, n13.my], [1170, n11.my], [n11.x, n11.my]], true);
  path([[n17.r, n17.my], [n14.x, n14.my]]); path([[n17.r, n17.my], [520, n17.my], [520, n16.my], [n16.x, n16.my]]);
  path([[n12.mx, n12.b], [n12.mx, n14.my], [n14.r, n14.my]], true);
  d.text(80, y + 40, 'Qattiq chiziq: asosiy yo\'l · uzilgan: ikkilamchi yo\'l', { size: 12, w: 700, fill: 'muted' });
  d.save('10-ekranlar-xaritasi.svg');
}
console.log('SVG tayyor:', fs.readdirSync(OUT).join(', '));
