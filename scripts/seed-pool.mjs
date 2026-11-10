// content/pool/pool-*.json (mashq zaxirasi) ni bazaga yuklaydi: pnpm content:pool:seed
//   pnpm content:pool:seed -- --dry-run   -> faqat tekshiradi va sanaydi (tarmoq ham, .env ham kerak emas)
// Idempotent: external_id bo'yicha takrorlanmaydi. Savollar mockka kirmaydi (pool: 'practice'), darrov nashr etiladi.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const BATCH = 50;
const dir = join(process.cwd(), 'content', 'pool');

if (!existsSync(dir)) throw new Error(`${dir} yo'q; avval "pnpm content:pool" ni ishga tushiring`);
const files = readdirSync(dir).filter((f) => /^pool-\d+\.json$/.test(f)).sort();
if (files.length === 0) throw new Error('pool-*.json topilmadi; avval "pnpm content:pool" ni ishga tushiring');

const questions = [];
for (const f of files) {
  const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (!Array.isArray(data.questions)) throw new Error(`${f}: "questions" massivi yo'q`);
  questions.push(...data.questions);
}

// Yengil tekshiruv (to'liq sxema testlarda): pool, noyob external_id
const ids = new Set();
for (const [i, q] of questions.entries()) {
  if (q.pool !== 'practice') throw new Error(`#${i + 1}: pool "practice" emas`);
  if (!q.external_id || ids.has(q.external_id)) throw new Error(`#${i + 1}: external_id yo'q yoki takrorlangan (${q.external_id})`);
  ids.add(q.external_id);
}

const tally = (key) => questions.reduce((acc, q) => ({ ...acc, [q[key]]: (acc[q[key]] ?? 0) + 1 }), {});
const blockDifficulty = {};
for (const q of questions) {
  const k = `${q.block}/${q.difficulty}`;
  blockDifficulty[k] = (blockDifficulty[k] ?? 0) + 1;
}
console.log(`${files.length} fayl, ${questions.length} savol`);
console.log('blok:', tally('block'));
console.log('qiyinlik:', tally('difficulty'));
console.log('blok/qiyinlik:', blockDifficulty);

if (dryRun) {
  console.log("--dry-run: bazaga yozilmadi");
  process.exit(0);
}

const { createClient } = await import('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL yoki SUPABASE_SECRET_KEY topilmadi');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let created = 0;
let existing = 0;
for (let i = 0; i < questions.length; i += BATCH) {
  const { data: r, error } = await db.rpc('import_questions', { p_questions: questions.slice(i, i + BATCH), p_exam: null });
  if (error) throw new Error(`import xatosi (${i + 1}..${Math.min(i + BATCH, questions.length)}): ${error.message}`);
  created += r.created ?? 0;
  existing += r.existing ?? 0;
  console.log(`${Math.min(i + BATCH, questions.length)}/${questions.length}: yangi ${r.created}, mavjud ${r.existing}`);
}
console.log(`Tayyor: ${created} yangi, ${existing} mavjud`);
