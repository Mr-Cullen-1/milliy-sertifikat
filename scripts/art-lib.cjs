// Oq fonli PNG sprite'larni shaffof, toza (qo'shni rasm bo'laklarisiz) rasmga aylantirish.
// `sharp` Next.js bilan birga o'rnatilgan; pnpm ichidan topiladi.
const fs = require('node:fs');
const path = require('node:path');

function loadSharp() {
  const store = path.join(process.cwd(), 'node_modules', '.pnpm');
  const dir = fs.readdirSync(store).find((d) => d.startsWith('sharp@'));
  if (!dir) throw new Error('sharp topilmadi (pnpm install qiling)');
  return require(require.resolve('sharp', { paths: [path.join(store, dir, 'node_modules')] }));
}
const sharp = loadSharp();

const WHITE_T = 242; // shundan yorug' piksellar (R,G,B) fon hisoblanadi

/**
 * opts.keep: 'main' (faqat eng katta bo'lak) | 'all' (chegaraga tegmaydigan yetarli katta bo'laklar ham; yaltirash/uchqunlar)
 * opts.pad: kesishdan keyin chetga qoldiriladigan piksel
 * opts.minArea: 'all' rejimida kichik bo'lak chegarasi (eng kattaning ulushi)
 */
async function cleanSprite(src, opts = {}) {
  const { keep = 'all', pad = 3, minArea = 0.004 } = opts;
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
  const isWhite = (i) => data[i * 3] >= WHITE_T && data[i * 3 + 1] >= WHITE_T && data[i * 3 + 2] >= WHITE_T;

  // 1) chetdan boshlab fonni to'ldirish (flood fill)
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const i = y * w + x;
    if (!bg[i] && isWhite(i)) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  // 2) alfa kanali: fon = 0, chet halqalari yumshatiladi (oq "halo" ni yo'qotish)
  const alpha = new Float32Array(w * h);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) alpha[i] = bg[i] ? 0 : 1;
  const nearBg = (i, level) => {
    const x = i % w;
    const y = (i / w) | 0;
    for (let dy = -level; dy <= level; dy++) {
      for (let dx = -level; dx <= level; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (bg[ny * w + nx]) return true;
      }
    }
    return false;
  };
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) continue;
    const [r, g, b] = px(i);
    let a = 1;
    if (nearBg(i, 1)) {
      const m = Math.min(r, g, b);
      a = Math.min(1, Math.max(0.2, (248 - m) / 48));
    } else if (nearBg(i, 2)) {
      const m = Math.min(r, g, b);
      a = Math.min(1, Math.max(0.6, (252 - m) / 40));
    }
    alpha[i] = a;
    // oq bilan aralashgan rangni tozalash: c = a*F + (1-a)*255
    const un = (c) => Math.max(0, Math.min(255, (c - 255 * (1 - a)) / a));
    out[i * 4] = un(r);
    out[i * 4 + 1] = un(g);
    out[i * 4 + 2] = un(b);
    out[i * 4 + 3] = Math.round(a * 255);
  }

  // 3) bog'langan bo'laklar: eng kattasini saqlash, chegaraga tegib turganlarini (qo'shni sprite qoldig'i) tashlash
  const label = new Int32Array(w * h).fill(-1);
  const comps = [];
  for (let s = 0; s < w * h; s++) {
    if (alpha[s] === 0 || label[s] !== -1) continue;
    const id = comps.length;
    const c = { id, area: 0, minX: w, minY: h, maxX: 0, maxY: 0, border: false };
    const q = [s];
    label[s] = id;
    while (q.length) {
      const i = q.pop();
      const x = i % w;
      const y = (i / w) | 0;
      c.area++;
      if (x < c.minX) c.minX = x;
      if (x > c.maxX) c.maxX = x;
      if (y < c.minY) c.minY = y;
      if (y > c.maxY) c.maxY = y;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) c.border = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (alpha[ni] > 0 && label[ni] === -1) {
            label[ni] = id;
            q.push(ni);
          }
        }
      }
    }
    comps.push(c);
  }
  if (comps.length === 0) throw new Error(`${src}: bo'sh rasm`);
  const main = comps.reduce((a, b) => (b.area > a.area ? b : a));
  const keepIds = new Set([main.id]);
  if (keep === 'all') {
    for (const c of comps) if (c.id !== main.id && !c.border && c.area >= main.area * minArea) keepIds.add(c.id);
  }

  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let i = 0; i < w * h; i++) {
    if (label[i] === -1 || !keepIds.has(label[i])) {
      out[i * 4 + 3] = 0;
      continue;
    }
    const x = i % w;
    const y = (i / w) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const x0 = Math.max(0, minX - pad);
  const y0 = Math.max(0, minY - pad);
  const x1 = Math.min(w - 1, maxX + pad);
  const y1 = Math.min(h - 1, maxY + pad);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const cropped = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = ((y0 + y) * w + (x0 + x)) * 4;
      const di = (y * cw + x) * 4;
      cropped[di] = out[si];
      cropped[di + 1] = out[si + 1];
      cropped[di + 2] = out[si + 2];
      cropped[di + 3] = out[si + 3];
    }
  }
  return { buffer: cropped, width: cw, height: ch, components: comps.length, kept: keepIds.size };
}

async function writePng(result, dest) {
  await sharp(result.buffer, { raw: { width: result.width, height: result.height, channels: 4 } })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(dest);
}

module.exports = { sharp, cleanSprite, writePng };
