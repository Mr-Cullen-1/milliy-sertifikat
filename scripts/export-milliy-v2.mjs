// Bizning v2 import fayli (content/export/variant-X.v2.json) -> dev jamoasining "example-milliy.v2.json" formati.
// Ishlatish: node scripts/export-milliy-v2.mjs [A]   (natija: content/export/variant-A.milliy.v2.json)
// Skript chiqarilgan faylni o'zi tekshiradi (tuzilma, 45 savol, blueprint, kalitlar, chizmalar, teskari konvertatsiya).
import { readFileSync, writeFileSync } from 'node:fs';
import { TOPIC_ELEMENTS, elementByCode } from '../config/elements.ts';
import { mathFormatV1 } from '../config/exam-format.math-v1.ts';

const code = (process.argv[2] ?? 'A').toUpperCase();
const src = JSON.parse(readFileSync(`content/export/variant-${code}.v2.json`, 'utf8'));
const OUT = `content/export/variant-${code}.milliy.v2.json`;

const KIND = { y1: 'y1', y2: 'y2', o: 'o' };

/** Elementni tanlash: mavzuning elementlari ichida savol blokiga tegishlisi, bo'lmasa asosiy element (nomuvofiqlik hisobotga tushadi). */
function pickElement(q) {
  const els = TOPIC_ELEMENTS[q.topic] ?? [];
  const inBlock = els.find((c) => elementByCode(c)?.block === q.block);
  const chosen = inBlock ?? els[0];
  if (!chosen) throw new Error(`Savol ${q.position}: mavzu ${q.topic} elementsiz`);
  return { code: 'e' + chosen.replace('.', ''), mismatch: !inBlock, official: chosen };
}

/** "Tipik xato: ..." yorlig'i interfeysda sarlavha bo'ladi; namunada matn yorliqsiz. */
const stripLabel = (s) => {
  const t = s.replace(/^Tipik xato:\s*/i, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const endDot = (s) => (/[.!?)]$/.test(s) ? s : s + '.');

const mismatches = [];

function convert(q) {
  const el = pickElement(q);
  if (el.mismatch) mismatches.push({ position: q.position, block: q.block, topic: q.topic, element: el.official });

  let prompt = q.stem_md;
  let payload;
  let answer_key;

  if (q.type === 'y1') {
    payload = { options: q.payload.options };
    answer_key = { correct: q.key.correct };
  } else if (q.type === 'y2') {
    payload = {
      items: q.payload.items.map((i) => ({ id: i.id, text: i.text_md })),
      options: q.payload.options,
    };
    answer_key = { ...q.key.pairs };
  } else {
    // Namunada a)/b) savollari `prompt` ichida, `parts` esa qisqa yorliq; band ko'rsatmasi (hint) ham matnga qo'shiladi.
    const lines = Object.entries(q.payload.parts).map(([k, p]) => `${k}) ${p.prompt_md}${p.hint ? ' ' + endDot(p.hint) : ''}`);
    prompt = `${q.stem_md}\n\n${lines.join('\n\n')}`;
    payload = { parts: Object.fromEntries(Object.keys(q.payload.parts).map((k) => [k, `${k}) band javobi`])) };
    answer_key = {};
    for (const k of Object.keys(q.payload.parts)) answer_key[k] = q.key[k];
  }

  const metadata = { topic: q.topic };
  if (q.extra_topics?.length) metadata.extra_topics = q.extra_topics;
  metadata.est_seconds = q.est_seconds;
  metadata.source = q.source;

  const out = {
    id: q.external_id,
    number: q.position,
    kind: KIND[q.type],
    block_code: q.block,
    element_code: el.code,
    difficulty: q.difficulty,
    prompt,
    payload,
    answer_key,
    explanation: q.solution_md,
    typical_error: stripLabel(q.mistake_note_md),
    metadata,
  };
  const fig = q.payload.figure;
  if (fig) out.figure = { svg: fig.svg, alt: fig.alt };
  return out;
}

const result = {
  schema_version: 2,
  exam: {
    slug: src.exam.slug ?? `variant-${code.toLowerCase()}`,
    title: src.exam.title,
    description: `Milliy sertifikat (Matematika), Variant ${code}: 45 topshiriq (32 yopiq, 3 moslashtirish, 10 ochiq), 150 daqiqa. Original savollar.`,
    duration_seconds: src.exam.duration_seconds,
    format: 'milliy-math-v1',
    purpose: 'mock',
    status: 'published',
    access: src.exam.is_free ? 'free' : 'pro',
    content_version: `${code}-v1`,
    metadata: { variant_code: code, generator: src.questions[0]?.source ?? null },
  },
  questions: src.questions.map(convert),
};

// ---------------------------------------------------------------- tekshiruv
const problems = [];
const fail = (m) => problems.push(m);
const qs = result.questions;

if (qs.length !== 45) fail(`savollar soni ${qs.length}`);
qs.forEach((q, i) => {
  if (q.number !== i + 1) fail(`number ${q.number} != ${i + 1}`);
  const want = mathFormatV1.sections.find((s) => q.number >= s.from && q.number <= s.to)?.type;
  if (q.kind !== want) fail(`savol ${q.number}: tur ${q.kind}, kutilgan ${want}`);
});
if (new Set(qs.map((q) => q.id)).size !== qs.length) fail('id takrorlangan');

const count = {};
for (const q of qs) {
  count[q.block_code] ??= { y1: 0, y2: 0, o: 0 };
  count[q.block_code][q.kind]++;
}
for (const [b, want] of Object.entries(mathFormatV1.blueprint)) {
  if (JSON.stringify(count[b]) !== JSON.stringify(want)) fail(`blueprint ${b}: ${JSON.stringify(count[b])} != ${JSON.stringify(want)}`);
}

const SVG_BAD = /<script|href=|xlink|\son\w+=|<image|<foreignObject|javascript:/i;
for (const q of qs) {
  const where = `savol ${q.number}`;
  if (!/^e[1-7][1-5]$/.test(q.element_code) || !elementByCode(q.element_code.replace(/^e(\d)(\d)$/, '$1.$2'))) fail(`${where}: element ${q.element_code}`);
  if (!['L1', 'L2', 'L3'].includes(q.difficulty)) fail(`${where}: qiyinlik`);
  if (!q.prompt || !q.explanation || !q.typical_error) fail(`${where}: bo'sh matn`);
  if (/^tipik xato/i.test(q.typical_error)) fail(`${where}: yorliq qolgan`);
  if (q.kind === 'y1') {
    if (Object.keys(q.payload.options).join('') !== 'ABCD') fail(`${where}: Y-1 variantlari`);
    if (!(q.answer_key.correct in q.payload.options)) fail(`${where}: kalit variantda yo'q`);
  } else if (q.kind === 'y2') {
    const ids = q.payload.items.map((i) => i.id);
    if (JSON.stringify(ids.slice().sort()) !== JSON.stringify(Object.keys(q.answer_key).sort())) fail(`${where}: Y-2 band id lari != kalit`);
    if (Object.keys(q.payload.options).join('') !== 'ABCDEF') fail(`${where}: Y-2 variantlari`);
    for (const l of Object.values(q.answer_key)) if (!(l in q.payload.options)) fail(`${where}: Y-2 kalit harfi`);
  } else {
    if (JSON.stringify(Object.keys(q.payload.parts)) !== JSON.stringify(Object.keys(q.answer_key))) fail(`${where}: a/b != kalit`);
    for (const a of Object.values(q.answer_key)) if (!Array.isArray(a) || !a.length) fail(`${where}: O kaliti`);
  }
  const texts = [q.prompt, q.explanation, q.typical_error, ...Object.values(q.payload.options ?? {}), ...(q.payload.items ?? []).map((i) => i.text)];
  for (const t of texts) {
    if (((t.replace(/\$\$/g, '').match(/\$/g) ?? []).length) % 2) fail(`${where}: $ juft emas`);
    if (/\[Chizma/i.test(t)) fail(`${where}: chizma o'rniga matn`);
  }
  if (q.figure) {
    if (!q.figure.alt || SVG_BAD.test(q.figure.svg) || !q.figure.svg.startsWith('<svg')) fail(`${where}: chizma`);
  }
}
if (qs.filter((q) => q.figure).length !== src.questions.filter((q) => q.payload.figure).length) fail('chizmalar soni');

// Teskari konvertatsiya: asl faylga nisbatan hech narsa yo'qolmaganini isbotlaydi (O savollar ko'rsatmasi matnga qo'shilgani bundan mustasno).
src.questions.forEach((o, i) => {
  const n = qs[i];
  const w = `savol ${o.position}`;
  const eq = (a, b, what) => JSON.stringify(a) !== JSON.stringify(b) && fail(`${w}: ${what} o'zgargan`);
  eq(o.external_id, n.id, 'id');
  eq(o.block, n.block_code, 'blok');
  eq(o.difficulty, n.difficulty, 'qiyinlik');
  eq(o.solution_md, n.explanation, 'yechim');
  eq(o.payload.figure ?? null, n.figure ?? null, 'chizma');
  if (o.type === 'y1') { eq(o.payload.options, n.payload.options, 'variantlar'); eq(o.key.correct, n.answer_key.correct, 'kalit'); eq(o.stem_md, n.prompt, 'matn'); }
  if (o.type === 'y2') { eq(o.payload.options, n.payload.options, 'variantlar'); eq(o.key.pairs, n.answer_key, 'kalit'); eq(o.payload.items.map((x) => [x.id, x.text_md]), n.payload.items.map((x) => [x.id, x.text]), 'bandlar'); eq(o.stem_md, n.prompt, 'matn'); }
  if (o.type === 'o') {
    eq({ a: o.key.a, b: o.key.b }, { a: n.answer_key.a, b: n.answer_key.b }, 'kalit');
    if (!n.prompt.startsWith(o.stem_md)) fail(`${w}: asosiy matn yo'qolgan`);
    for (const [k, p] of Object.entries(o.payload.parts)) if (!n.prompt.includes(`${k}) ${p.prompt_md}`)) fail(`${w}: ${k} band matni yo'qolgan`);
  }
  eq(o.topic, n.metadata.topic, 'mavzu');
});

if (problems.length) {
  console.error('XATOLAR:\n- ' + problems.join('\n- '));
  process.exit(1);
}

writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
const figs = qs.filter((q) => q.figure).length;
console.log(`OK: ${OUT}`);
console.log(`savollar ${qs.length} (y1 ${qs.filter((q) => q.kind === 'y1').length}, y2 ${qs.filter((q) => q.kind === 'y2').length}, o ${qs.filter((q) => q.kind === 'o').length}), chizmalar ${figs}`);
console.log('blok/element nomuvofiqligi:', mismatches.length ? JSON.stringify(mismatches) : "yo'q");
