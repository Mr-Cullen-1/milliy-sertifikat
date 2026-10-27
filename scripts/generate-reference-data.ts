// docs/mavzular.md + config/exam-format.math-v1.ts -> supabase/migrations/20261027120300_reference_data.sql
// Ishga tushirish: pnpm gen:reference
import { readFileSync, writeFileSync } from 'node:fs';
import { mathFormatV1 } from '../config/exam-format.math-v1.ts';

const BLOCK_CODES = ['sonlar', 'algebra', 'tenglama', 'funksiyalar', 'analiz', 'geometriya', 'toplam'];
const EXPECTED_TOPICS_PER_BLOCK = [11, 16, 15, 13, 11, 27, 10];

const sql = (s: string) => `'${s.replace(/'/g, "''")}'`;

const md = readFileSync(new URL('../docs/mavzular.md', import.meta.url), 'utf8');
const start = md.indexOf("## Mavzular ro'yxati");
const end = md.indexOf("## Bo'limlar bo'yicha mavzular soni");
if (start < 0 || end < start) throw new Error('docs/mavzular.md tuzilishi o\'zgargan: bo\'lim sarlavhalari topilmadi');

const blocks: { id: number; code: string; name: string }[] = [];
const topics: { id: number; block: number; name: string }[] = [];

for (const line of md.slice(start, end).split(/\r?\n/)) {
  const heading = /^### (\d+)\. (.+?) — variantda/.exec(line);
  if (heading) {
    const id = Number(heading[1]);
    blocks.push({ id, code: BLOCK_CODES[id - 1] ?? `block${id}`, name: heading[2]! });
    continue;
  }
  const topic = /^(\d+)\. (.+)$/.exec(line);
  if (topic && blocks.length > 0) {
    topics.push({ id: Number(topic[1]), block: blocks[blocks.length - 1]!.id, name: topic[2]!.trim() });
  }
}

if (blocks.length !== 7) throw new Error(`7 ta blok kutilgan, ${blocks.length} ta topildi`);
if (topics.length !== 103) throw new Error(`103 ta mavzu kutilgan, ${topics.length} ta topildi`);
topics.forEach((t, i) => {
  if (t.id !== i + 1) throw new Error(`mavzu raqami ketma-ket emas: ${t.id} (kutilgan ${i + 1})`);
});
blocks.forEach((b, i) => {
  const count = topics.filter((t) => t.block === b.id).length;
  if (count !== EXPECTED_TOPICS_PER_BLOCK[i]) {
    throw new Error(`${b.id}-blokda ${count} ta mavzu, kutilgan ${EXPECTED_TOPICS_PER_BLOCK[i]}`);
  }
});

const f = mathFormatV1;
const spec = { sections: f.sections, blueprint: f.blueprint };

const out = [
  '-- 4/4: ma\'lumotnoma ma\'lumotlari (7 blok, 103 mavzu, imtihon formati)',
  '-- Avto-generatsiya: pnpm gen:reference (docs/mavzular.md va config/exam-format.math-v1.ts dan). Qo\'lda tahrirlamang.',
  '',
  'insert into public.blocks (id, code, name_uz, sort) values',
  blocks.map((b) => `  (${b.id}, ${sql(b.code)}, ${sql(b.name)}, ${b.id})`).join(',\n') + ';',
  '',
  'insert into public.topics (id, block_id, name_uz) values',
  topics.map((t) => `  (${t.id}, ${t.block}, ${sql(t.name)})`).join(',\n') + ';',
  '',
  'insert into public.exam_formats (code, duration_min, spec, scoring) values',
  `  (${sql(f.code)}, ${f.durationMin}, ${sql(JSON.stringify(spec))}::jsonb, ${sql(JSON.stringify(f.scoring))}::jsonb);`,
  '',
].join('\n');

writeFileSync(new URL('../supabase/migrations/20261027120300_reference_data.sql', import.meta.url), out);
console.log(`blocks=${blocks.length} topics=${topics.length} format=${f.code}`);
