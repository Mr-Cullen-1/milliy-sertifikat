// Mashq zaxirasi (content/pool/pool-*.json, extra-*.json) -> content/export/practice/<mavzu papkasi>/mavzu-NNN-PP.v2.json: pnpm content:export:practice
// Har mavzu (savolning asosiy `topic` i) alohida papka; papka ichida fayllar <= 500 savol va <= 3,5 MB (import chegarasi 500 ta / 4 MB).
// Savollar o'zgarmaydi. Fayl: { schema_version: 2, questions: [...] }, har savolda pool: "practice". Format: docs/import-practice-format.md
//   --per-file=500   bir fayldagi savollarning eng ko'p soni
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_COUNT_LIMIT = 500;
const MAX_BYTES = 3.5 * 1024 * 1024;

const arg = process.argv.find((a) => a.startsWith('--per-file='));
const perFile = arg ? Number(arg.slice('--per-file='.length)) : MAX_COUNT_LIMIT;
if (!Number.isInteger(perFile) || perFile < 1 || perFile > MAX_COUNT_LIMIT) throw new Error(`--per-file 1..${MAX_COUNT_LIMIT} oralig'ida bo'lsin`);

const root = process.cwd();
const poolDir = join(root, 'content', 'pool');
const outDir = join(root, 'content', 'export', 'practice');

// --- mavzu nomlari: docs/mavzular.md (1-103) va config/elements.ts NEW_TOPICS (104+) ---
const names = new Map();
const md = readFileSync(join(root, 'docs', 'mavzular.md'), 'utf8');
const start = md.indexOf("## Mavzular ro'yxati");
const end = md.indexOf("## Bo'limlar bo'yicha mavzular soni");
if (start < 0 || end < start) throw new Error("docs/mavzular.md tuzilishi o'zgargan");
for (const line of md.slice(start, end).split(/\r?\n/)) {
  const m = /^(\d+)\. (.+)$/.exec(line);
  if (m) names.set(Number(m[1]), m[2].trim());
}
const el = readFileSync(join(root, 'config', 'elements.ts'), 'utf8');
for (const m of el.matchAll(/\{ id: (\d+), name: (['"])(.*?)\2, elements:/g)) names.set(Number(m[1]), m[3].replace(/\\'/g, "'"));

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[ʻʼ`’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '');

// --- savollarni o'qish ---
if (!existsSync(poolDir)) throw new Error(`${poolDir} yo'q; avval "pnpm content:pool" ni ishga tushiring`);
const files = readdirSync(poolDir).filter((f) => /^(pool|extra)-\d+\.json$/.test(f)).sort();
if (files.length === 0) throw new Error('pool-*.json topilmadi; avval "pnpm content:pool" ni ishga tushiring');

const byTopic = new Map();
const seen = new Set();
for (const f of files) {
  const data = JSON.parse(readFileSync(join(poolDir, f), 'utf8'));
  for (const q of data.questions) {
    if (q.pool !== 'practice') throw new Error(`${f}: ${q.external_id}: pool "practice" emas`);
    if (!q.external_id || seen.has(q.external_id)) throw new Error(`${f}: external_id yo'q yoki takrorlangan (${q.external_id})`);
    seen.add(q.external_id);
    if (!byTopic.has(q.topic)) byTopic.set(q.topic, []);
    byTopic.get(q.topic).push(q);
  }
}

// --- yozish (eski eksport tozalanadi: qolib ketgan fayllar aralashmasin) ---
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const pad = (n, w) => String(n).padStart(w, '0');
const manifest = [];
let totalQuestions = 0;
let totalFiles = 0;

for (const topic of [...byTopic.keys()].sort((a, b) => a - b)) {
  const name = names.get(topic);
  if (!name) throw new Error(`${topic}-mavzu nomi topilmadi`);
  const questions = byTopic.get(topic).sort((a, b) => a.external_id.localeCompare(b.external_id));
  const folder = `mavzu-${pad(topic, 3)}-${slugify(name)}`;
  mkdirSync(join(outDir, folder), { recursive: true });

  // bo'lish: <= perFile savol va <= MAX_BYTES
  const chunks = [];
  let cur = [];
  let curBytes = 0;
  for (const q of questions) {
    const size = Buffer.byteLength(JSON.stringify(q)) + 1;
    if (cur.length > 0 && (cur.length >= perFile || curBytes + size > MAX_BYTES)) {
      chunks.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(q);
    curBytes += size;
  }
  if (cur.length > 0) chunks.push(cur);

  const fileNames = [];
  chunks.forEach((chunk, i) => {
    const file = `mavzu-${pad(topic, 3)}-${pad(i + 1, 2)}.v2.json`;
    writeFileSync(join(outDir, folder, file), `${JSON.stringify({ schema_version: 2, questions: chunk })}\n`);
    fileNames.push(file);
  });

  const tally = (key) => {
    const out = {};
    for (const q of questions) out[q[key]] = (out[q[key]] ?? 0) + 1;
    return out;
  };
  manifest.push({
    topic,
    name,
    block: questions[0].block,
    folder,
    questions: questions.length,
    by_difficulty: tally('difficulty'),
    by_type: tally('type'),
    files: fileNames,
  });
  totalQuestions += questions.length;
  totalFiles += fileNames.length;
}

writeFileSync(
  join(outDir, 'index.json'),
  `${JSON.stringify({ schema_version: 2, pool: 'practice', total_questions: totalQuestions, total_files: totalFiles, per_file_max: perFile, topics: manifest }, null, 2)}\n`,
);
console.log(`${manifest.length} mavzu papkasi, ${totalFiles} fayl, ${totalQuestions} savol -> content/export/practice/ (index.json bilan)`);
