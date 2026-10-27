import { z } from 'zod';
import { mathFormatV1 } from '../../config/exam-format.math-v1';
import { BLOCK_CODES, topicInBlock, type BlockCode } from '../../config/topics';
import { parsePayload, payloadShape, type ParsedPayload } from '../exam/payload';
import { parseKey } from '../exam/schemas';

// Savollarni yuklash formati (admin JSON importi va kontent generatorlari uchun yagona sxema).

export const LOCALES = ['ru', 'kaa', 'en'] as const; // asosiy matn: o'zbek (uz)

const localizedSchema = z.object({
  stem_md: z.string().min(1).max(4000),
  payload: z.unknown(),
  solution_md: z.string().max(8000).optional(),
  mistake_note_md: z.string().max(2000).optional(),
});

export const importQuestionSchema = z
  .object({
    /** Qayta yuklashda takrorlanmasligi uchun (ixtiyoriy, bazada unique) */
    external_id: z.string().min(1).max(64).optional(),
    type: z.enum(['y1', 'y2', 'o']),
    block: z.enum(BLOCK_CODES),
    topic: z.number().int().min(1).max(103),
    extra_topics: z.array(z.number().int().min(1).max(103)).max(5).optional(),
    difficulty: z.enum(['L1', 'L2', 'L3']),
    weight: z.number().positive().max(10).optional(),
    est_seconds: z.number().int().positive().max(1800).optional(),
    source: z.string().max(200).optional(),
    stem_md: z.string().min(1).max(4000),
    payload: z.unknown(),
    key: z.unknown(),
    solution_md: z.string().max(8000).optional(),
    mistake_note_md: z.string().max(2000).optional(),
    i18n: z.object({ ru: localizedSchema, kaa: localizedSchema, en: localizedSchema }).partial().optional(),
  })
  .superRefine((q, ctx) => {
    const add = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: 'custom', message, path });

    if (!topicInBlock(q.block, q.topic)) add(`${q.topic}-mavzu "${q.block}" blokiga tegishli emas`, ['topic']);
    for (const t of q.extra_topics ?? []) {
      if (t < 1 || t > 103) add(`qo'shimcha mavzu ${t} yaroqsiz`, ['extra_topics']);
    }

    let payload: ParsedPayload | null = null;
    try {
      payload = parsePayload(q.type, q.payload);
    } catch (e) {
      add(`payload yaroqsiz: ${firstIssue(e)}`, ['payload']);
    }

    let key: ReturnType<typeof parseKey> | null = null;
    try {
      key = parseKey(q.type, q.key);
    } catch (e) {
      add(`key yaroqsiz: ${firstIssue(e)}`, ['key']);
    }
    if (!payload || !key) return;

    // payload va kalit mosligi
    if (payload.type === 'y2' && key.type === 'y2') {
      const ids = payload.data.items.map((i) => i.id);
      const keyed = Object.keys(key.pairs);
      for (const id of ids) if (!(id in key.pairs)) add(`"${id}" bandi uchun kalit yo'q`, ['key', 'pairs']);
      for (const id of keyed) if (!ids.includes(id)) add(`kalitda mavjud bo'lmagan band: "${id}"`, ['key', 'pairs']);
      for (const [id, l] of Object.entries(key.pairs)) {
        if (!(l in payload.data.options)) add(`"${id}" bandi kaliti ${l} variantga ishora qiladi, lekin u yo'q`, ['key', 'pairs', id]);
      }
    }
    if (payload.type === 'o' && key.type === 'o') {
      for (const part of ['a', 'b'] as const) {
        const inPayload = payload.data.parts[part] !== undefined;
        const inKey = key[part] !== undefined;
        if (inPayload !== inKey) add(`${part}) bandi payload va kalitda mos emas`, ['key', part]);
      }
    }

    // tarjimalar bir xil tuzilishda bo'lsin
    const shape = payloadShape(payload);
    for (const [lang, loc] of Object.entries(q.i18n ?? {})) {
      try {
        const p = parsePayload(q.type, loc.payload);
        if (payloadShape(p) !== shape) add(`${lang} tarjimasi tuzilishi asosiy matnnikidan farq qiladi`, ['i18n', lang, 'payload']);
      } catch (e) {
        add(`${lang} payload yaroqsiz: ${firstIssue(e)}`, ['i18n', lang, 'payload']);
      }
    }
  });

export type ImportQuestion = z.output<typeof importQuestionSchema>;

const examMeta = z.object({
  title: z.string().min(1).max(120),
  /** "A".."F": ro'yxatda tartib va nom uchun */
  code: z.string().min(1).max(8).optional(),
  is_free: z.boolean().optional(),
});

export const importFileSchema = z
  .object({
    exam: examMeta.optional(),
    questions: z.array(importQuestionSchema).min(1).max(500),
  })
  .superRefine((f, ctx) => {
    if (!f.exam) return;
    const total = mathFormatV1.sections.reduce((s, x) => s + x.to - x.from + 1, 0);
    if (f.questions.length !== total) {
      ctx.addIssue({ code: 'custom', message: `mock uchun ${total} ta savol kerak, ${f.questions.length} ta berilgan`, path: ['questions'] });
      return;
    }
    // tartib: 1..45 pozitsiyalar turlarga mos, blok bo'yicha sonlar blueprint'ga teng
    for (const sec of mathFormatV1.sections) {
      for (let pos = sec.from; pos <= sec.to; pos++) {
        const q = f.questions[pos - 1]!;
        if (q.type !== sec.type) {
          ctx.addIssue({ code: 'custom', message: `${pos}-savol turi "${sec.type}" bo'lishi kerak ("${q.type}" berilgan)`, path: ['questions', pos - 1, 'type'] });
        }
      }
    }
    const counts = new Map<string, number>();
    for (const q of f.questions) counts.set(`${q.block}/${q.type}`, (counts.get(`${q.block}/${q.type}`) ?? 0) + 1);
    for (const block of BLOCK_CODES) {
      for (const type of ['y1', 'y2', 'o'] as const) {
        const expected = mathFormatV1.blueprint[block]?.[type] ?? 0;
        const actual = counts.get(`${block}/${type}`) ?? 0;
        if (actual !== expected) {
          ctx.addIssue({ code: 'custom', message: `${block}/${type}: ${actual} ta, kerak ${expected}`, path: ['questions'] });
        }
      }
    }
  });

export type ImportFile = z.output<typeof importFileSchema>;

function firstIssue(e: unknown): string {
  if (e instanceof z.ZodError) {
    const i = e.issues[0];
    return i ? `${i.path.join('.') || '(ildiz)'}: ${i.message}` : 'noma\'lum';
  }
  return e instanceof Error ? e.message : String(e);
}

export type { BlockCode };
