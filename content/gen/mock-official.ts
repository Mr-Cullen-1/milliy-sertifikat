import { createHash } from 'node:crypto';
import { officialBlocksOf } from '../../config/elements';
import { buildSpec, type Template } from './algebra-lib';
import { assemble } from './assemble';
import { EXTRA_TEMPLATES } from './extra';
import { buildExtraPool, questionSignature } from './extra/build';
import { buildVariantFile, generators, type VariantFile } from './index';
import { MOCK_TEMPLATES } from './mock-templates';
import { buildPoolItems } from './pool';
import { slotRequests } from './layout';
import { SONLAR_TEMPLATES } from './sonlar';
import type { QuestionSpec, SlotRequest } from './types';

// ---------------------------------------------------------------------------
// Yangi mock variantlar G–O (9 ta): Variant A tuzilishi (45 savol, 32 Y-1 / 3 Y-2 / 10 O, qiyinlik joylashuvi layout.ts dan) va
// RASMIY bo'lim joylashuvi: savolning mavzusi shu slot bo'limining rasmiy elementlaridan biriga tegishli bo'lishi shart
// (config/elements.ts officialBlocksOf). Masalan: progressiya (57, 58), matnli masala (42), foiz (8), nisbat (7), masshtab (105) —
// "Algebraik shakl almashtirish" (2.4) slotlarida; Analiz faqat hosila va integral (60–66, 110); "Sonlar" faqat 1.x (1–6, 9–11).
// A–F o'zgarmaydi (ular eski ishchi diapazon bo'yicha). Mashq zaxirasi (content/gen/pool.ts, variantlar 6..45) va qo'shimcha shablonlar
// (content/gen/extra) savollari G–O ga kirmaydi: imzo bo'yicha takrorlanish tekshiriladi.
// Barcha savollar kod bilan hisoblanadi; MUTAXASSIS TEKSHIRUVIDAN O'TMAGAN (docs/content.md).
// ---------------------------------------------------------------------------

export const OFFICIAL_MOCK_CODES = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'] as const;
export const OFFICIAL_MOCK_COUNT = OFFICIAL_MOCK_CODES.length;
export const OFFICIAL_MOCK_SOURCE = 'gen:v2';

/** Generatorlar uchun ichki variant raqamlari: mashq zaxirasi (6..45) dan keyin. */
const BASE_VARIANT = 46;
const MAX_SALT = 80;
/** Urinishlar orasidagi qadam: tub son (generatorlarning shablon aylanish davrlari bilan mos tushmasligi uchun) */
const SALT_STEP = 17;
/** Dastlabki shuncha urinishda mavzu takrorlanishiga yo'l qo'yilmaydi; keyin (mos nomzod topilmasa) ruxsat */
const DIVERSITY_SALTS = 30;

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');
const signature = (q: { stem_md?: unknown; payload?: unknown }): string => sha1(String(q.stem_md) + JSON.stringify(q.payload));

/** Algebra (2.4) slotlariga qo'shiladigan oddiy shablonlar: progressiya, matnli masala, masshtab, nisbat, foiz. */
const byId = (id: string): Template => {
  const t = SONLAR_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`sonlar shabloni topilmadi: ${id}`);
  return t;
};
const ALGEBRA_EXTRAS: readonly Template[] = [
  MOCK_TEMPLATES['mock-ap']!,
  MOCK_TEMPLATES['mock-work']!,
  byId('son-percent'),
  MOCK_TEMPLATES['mock-gp']!,
  MOCK_TEMPLATES['mock-motion']!,
  byId('son-prop'),
  MOCK_TEMPLATES['mock-scale']!,
];
/** Algebra Y-1 slotlarida (11 ta, indekslar 0..10) rasmiy 2.4 mavzulari uchun ajratilgan o'rinlar */
const ALGEBRA_EXTRA_INDEXES = [8, 9] as const;
/** Analiz Y-1 ning ikkinchi slotida (indeks 1) ba'zi variantlarda hosilaning fizik ma'nosi (110) */
const PHYS = MOCK_TEMPLATES['mock-phys']!;

/** Avvalgi mock (A–F), mashq zaxirasi va qo'shimcha shablonlar savollari imzolari: takrorlanmasligi uchun. */
let AVOID: Set<string> | undefined;
function avoidSet(): Set<string> {
  if (AVOID) return AVOID;
  const s = new Set<string>();
  for (let v = 0; v < 6; v++) for (const q of buildVariantFile(v).questions) s.add(signature(q));
  for (const it of buildPoolItems().items) s.add(signature(it.question));
  for (const q of buildExtraPool(EXTRA_TEMPLATES, { seedsPerTemplate: 40 }).questions) s.add(questionSignature(q));
  AVOID = s;
  return s;
}

function candidate(req: SlotRequest, g: number, salt: number, extraSlot: number): QuestionSpec {
  const variantNo = BASE_VARIANT + g + salt * SALT_STEP;
  const r: SlotRequest = { ...req, variant: variantNo };
  const tpIndex = g + salt;
  if (req.block === 'algebra' && req.type === 'y1' && extraSlot >= 0) {
    const t = ALGEBRA_EXTRAS[(g * 2 + extraSlot + salt) % ALGEBRA_EXTRAS.length]!;
    return buildSpec(r, t.build(tpIndex, 'mock-official'));
  }
  if (req.block === 'analiz' && req.type === 'y1' && req.index === 1 && g % 3 === 1) {
    return buildSpec(r, PHYS.build(tpIndex, 'mock-official'));
  }
  return generators[req.block](r);
}

export interface OfficialMockInfo {
  /** nechanchi urinishda (salt) qabul qilingan savollar soni: 0 dan farqlisi — takror yoki rasmiy joylashuvga mos kelmagan nomzod tashlangan */
  rejected: number;
}

/** G–O dan birini (i = 0..8) import formatida tuzadi. `used` — shu va avvalgi variantlarning imzolari (o'zgaradi). */
export function buildOfficialMockFile(i: number, used: Set<string> = new Set()): VariantFile & { info: OfficialMockInfo } {
  if (!Number.isInteger(i) || i < 0 || i >= OFFICIAL_MOCK_COUNT) throw new Error(`G–O indeksi 0..${OFFICIAL_MOCK_COUNT - 1} bo'lishi kerak`);
  const code = OFFICIAL_MOCK_CODES[i]!;
  const avoid = avoidSet();
  const questions: Record<string, unknown>[] = [];
  let rejected = 0;
  /** Bir variantda bir bo'lim/tur ichida mavzular iloji boricha takrorlanmasin (dastlabki urinishlarda) */
  const topicsUsed = new Map<string, Set<number>>();
  for (const req of slotRequests(i)) {
    const tkey = `${req.block}|${req.type}`;
    const extraSlot = req.block === 'algebra' && req.type === 'y1' ? (ALGEBRA_EXTRA_INDEXES as readonly number[]).indexOf(req.index) : -1;
    let found: Record<string, unknown> | undefined;
    for (let salt = 0; salt <= MAX_SALT && !found; salt++) {
      let spec: QuestionSpec;
      try {
        spec = candidate(req, i, salt, extraSlot);
      } catch {
        rejected++;
        continue;
      }
      if (!officialBlocksOf(spec.topic).includes(req.block) || spec.difficulty !== req.difficulty) {
        rejected++;
        continue;
      }
      if (salt < DIVERSITY_SALTS && topicsUsed.get(tkey)?.has(spec.topic)) {
        rejected++;
        continue;
      }
      const q: Record<string, unknown> = { ...assemble(spec, req), external_id: `gen-${code}-${String(req.position).padStart(2, '0')}`, source: OFFICIAL_MOCK_SOURCE };
      const sig = signature(q);
      if (avoid.has(sig) || used.has(sig)) {
        rejected++;
        continue;
      }
      used.add(sig);
      if (!topicsUsed.has(tkey)) topicsUsed.set(tkey, new Set());
      topicsUsed.get(tkey)!.add(spec.topic);
      found = q;
    }
    if (!found) throw new Error(`${code} #${req.position} (${req.block}/${req.type}): rasmiy joylashuvga mos yangi savol topilmadi`);
    questions.push(found);
  }
  return { exam: { title: `Variant ${code}`, code, is_free: true }, questions, info: { rejected } };
}

/** Hamma G–O: imzolar variantlar bo'yicha ketma-ket yig'iladi (variantlar o'rtasida takror bo'lmasin). */
export function buildAllOfficialMocks(): (VariantFile & { info: OfficialMockInfo })[] {
  const used = new Set<string>();
  return Array.from({ length: OFFICIAL_MOCK_COUNT }, (_, i) => buildOfficialMockFile(i, used));
}
