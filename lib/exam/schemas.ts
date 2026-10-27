import { z } from 'zod';
import type { QuestionType } from './format';
import { parseNumeric } from './normalize-answer';
import type { AnswerKey, AnswerValue } from './scoring';

const letterAD = z.string().regex(/^[A-D]$/, 'A–D harfi kerak');
const letterAF = z.string().regex(/^[A-F]$/, 'A–F harfi kerak');
const numericForm = z.string().refine((s) => parseNumeric(s) !== null, 'son yoki kasr emas');

// --- Ball konfiguratsiyasi (exam_formats.scoring): DB'dan kelgan JSON'ni tekshiradi ---

const positive = z.number().positive();

export const scoringConfigSchema = z
  .object({
    version: z.string().min(1),
    y1Weights: z.object({ L1: positive, L2: positive, L3: positive }),
    y2Weight: positive,
    open: z.object({ a: positive, b: positive, both: positive }),
    scale: z.array(z.tuple([z.number(), z.number()])).min(2),
    levels: z.array(z.object({ code: z.string().min(1), min: z.number() })).min(1),
    graceSec: z.number().int().nonnegative(),
  })
  .refine((c) => c.scale.every((p, i) => i === 0 || p[0] > c.scale[i - 1]![0]), 'scale nuqtalari ulush bo\'yicha qat\'iy o\'sishi kerak')
  .refine((c) => c.levels.every((l, i) => i === 0 || l.min < c.levels[i - 1]!.min), 'levels min bo\'yicha kamayish tartibida bo\'lishi kerak');

// --- Kalitlar (question_keys.key_json): import va ball hisoblashda bir xil sxema ---

export const y1KeySchema = z.object({ correct: letterAD });

export const y2KeySchema = z.object({
  pairs: z.record(z.string().min(1), letterAF).refine((p) => Object.keys(p).length > 0, 'kamida bitta band kerak'),
});

export const oKeySchema = z
  .object({
    a: z.array(numericForm).min(1).optional(),
    b: z.array(numericForm).min(1).optional(),
  })
  .refine((k) => k.a !== undefined || k.b !== undefined, 'a yoki b banddan kamida bittasi kerak');

export function parseKey(type: QuestionType, raw: unknown): AnswerKey {
  switch (type) {
    case 'y1': {
      const k = y1KeySchema.parse(raw);
      return { type, correct: k.correct };
    }
    case 'y2': {
      const k = y2KeySchema.parse(raw);
      return { type, pairs: k.pairs };
    }
    case 'o': {
      const k = oKeySchema.parse(raw);
      return { type, a: k.a, b: k.b };
    }
  }
}

// --- Talaba javoblari (answers.value_json): noto'g'ri shakl "javobsiz" hisoblanadi, xato bermaydi ---

const y1AnswerSchema = z.string().trim().regex(/^[A-Da-d]$/);

const y2AnswerSchema = z.record(z.string(), z.unknown()).transform((rec) => {
  const out: Record<string, string> = {};
  for (const [sub, v] of Object.entries(rec)) {
    if (typeof v === 'string' && /^[A-Fa-f]$/.test(v.trim())) out[sub] = v.trim();
  }
  return out;
});

// .optional() shart: talaba faqat bitta bandni to'ldirsa ikkinchi kalit umuman kelmaydi.
const openField = z.unknown().optional().transform((v) => (typeof v === 'string' && v.length <= 64 ? v : undefined));
const oAnswerSchema = z.object({ a: openField, b: openField });

export function parseAnswer(type: QuestionType, raw: unknown): AnswerValue | undefined {
  if (raw === null || raw === undefined) return undefined;
  const schema = type === 'y1' ? y1AnswerSchema : type === 'y2' ? y2AnswerSchema : oAnswerSchema;
  const parsed = schema.safeParse(raw);
  return parsed.success ? (parsed.data as AnswerValue) : undefined;
}
