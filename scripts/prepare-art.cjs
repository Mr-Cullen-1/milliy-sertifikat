// Dizayn assetlarini (junior_trainer_* papkalari) saytga tayyorlaydi: node scripts/prepare-art.cjs
//   - oq fonni shaffof qiladi, qo'shni sprite bo'laklarini kesadi, kerakli joyini qirqadi;
//   - public/art/*.png va public/art/icons/*.svg ga yozadi;
//   - components/art-data.ts (o'lchamlar) ni generatsiya qiladi.
// Manba papkalar saqlanib qoladi (loyiha ildizida); saytga faqat public/art dagilar chiqadi.
const fs = require('node:fs');
const path = require('node:path');
const { sharp, cleanSprite, writePng } = require('./art-lib.cjs');

const A = 'junior_trainer_assets_individual/junior_trainer_assets';
const M = 'junior_trainer_modal_assets/junior_trainer_modal_assets';

// out: public/art/<out>.png; keep: 'main' | 'all'; crop: tozalangandan keyin {left, top, width, height}
const SPRITES = [
  // mascotlar (Junior Trainer robot)
  { out: 'mascot-waving', src: `${A}/mascot_waving.png` },
  { out: 'mascot-laptop', src: `${A}/mascot_laptop.png` },
  { out: 'mascot-trophy', src: `${A}/mascot_trophy.png` },
  { out: 'mascot-celebrate', src: `${A}/mascot_excited_jump.png` },
  { out: 'mascot-pencil', src: `${A}/mascot_pencil_happy.png` },
  { out: 'mascot-point', src: `${A}/mascot_pencil_pointing.png` },
  { out: 'mascot-reading', src: `${A}/mascot_reading_books.png` },
  { out: 'mascot-books', src: `${A}/mascot_sitting_books.png` },
  { out: 'mascot-think', src: `${A}/mascot_thinking_questions.png` },
  { out: 'mascot-thumbs', src: `${A}/mascot_wink_thumbs_up.png` },
  { out: 'mascot-checklist', src: `${A}/mascot_checklist.png` },
  { out: 'mascot-coin', src: `${A}/mascot_coin_star.png` },
  // mukofotlar va dekorlar
  // kubok: chap-pastdagi qo'shni tanga bo'lagi o'chiriladi
  { out: 'trophy', src: `${A}/trophy_gold.png`, erase: [{ x: 0, y: 118, w: 46, h: 180 }] },
  { out: 'sparkles', src: `${A}/cloud_small.png` },
  { out: 'orb', src: `${A}/cloud_light.png` },
  { out: 'alarm', src: `${A}/alarm_clock.png` },
  { out: 'chart', src: `${A}/icon_minus.png` },
  { out: 'crown', src: `${A}/icon_plus.png` },
  { out: 'shuffle', src: `${A}/icon_check.png` },
  { out: 'gift', src: `${A}/icon_question.png` },
  { out: 'cube', src: `${A}/shape_green_cube.png` },
  { out: 'pyramid', src: `${A}/shape_orange_sphere.png` },
  { out: 'books', src: `${A}/math_open_book.png` },
];

// Toza SVG ikonkalar (modal paketdan)
const ICONS = ['icon_coin', 'icon_daily_reset', 'icon_lesson', 'icon_point', 'icon_random_questions', 'icon_test_complete', 'icon_trainer', 'icon_unrewarded_practice'];

(async () => {
  const outDir = path.join('public', 'art');
  fs.mkdirSync(path.join(outDir, 'icons'), { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith('.png')) fs.unlinkSync(path.join(outDir, f)); // eskirgan fayllar qolmasin
  const sizes = {};

  for (const s of SPRITES) {
    const r = await cleanSprite(s.src, { keep: s.keep ?? 'all' });
    let { buffer, width, height } = r;
    for (const e of s.erase ?? []) {
      for (let y = e.y; y < Math.min(height, e.y + e.h); y++) for (let x = e.x; x < Math.min(width, e.x + e.w); x++) buffer[(y * width + x) * 4 + 3] = 0;
    }
    if (s.crop) {
      const left = s.crop.left ?? 0;
      const top = s.crop.top ?? 0;
      const cw = Math.min(s.crop.width ?? width - left, width - left);
      const ch = Math.min(s.crop.height ?? height - top, height - top);
      buffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).extract({ left, top, width: cw, height: ch }).raw().toBuffer();
      width = cw;
      height = ch;
    }
    await writePng({ buffer, width, height }, path.join(outDir, `${s.out}.png`));
    sizes[s.out] = { w: width, h: height };
  }

  for (const name of ICONS) fs.copyFileSync(path.join(M, `${name}.svg`), path.join(outDir, 'icons', `${name.replace('icon_', '').replace(/_/g, '-')}.svg`));

  const names = Object.keys(sizes);
  const ts =
    `// Avto-generatsiya: node scripts/prepare-art.cjs (qo'lda tahrirlamang)\n` +
    `export const ART = {\n${names.map((n) => `  '${n}': { w: ${sizes[n].w}, h: ${sizes[n].h} },`).join('\n')}\n} as const;\n\n` +
    `export type ArtName = keyof typeof ART;\n\n` +
    `export const ICONS = [${ICONS.map((n) => `'${n.replace('icon_', '').replace(/_/g, '-')}'`).join(', ')}] as const;\n\nexport type IconName = (typeof ICONS)[number];\n`;
  fs.writeFileSync(path.join('components', 'art-data.ts'), ts);
  console.log(`${names.length} sprite, ${ICONS.length} ikonka yozildi`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
