import { createHash } from 'node:crypto';
import { officialPrimaryBlock } from '../../../config/elements';
import { assemble } from '../assemble';
import type { SlotRequest } from '../types';
import type { ExtraTemplate } from './types';

export const EXTRA_SOURCE = 'gen:extra-v1';

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');
export const questionSignature = (q: { stem_md?: unknown; payload?: unknown }): string => sha1(String(q.stem_md) + JSON.stringify(q.payload));

export const extraExternalId = (templateId: string, seed: number): string => `gen-X-${templateId}-${String(seed).padStart(3, '0')}`;

/** Shablonning bo'limi: mavzuning rasmiy asosiy bo'limi (config/elements.ts). */
export function extraBlock(tpl: ExtraTemplate) {
  const block = officialPrimaryBlock(tpl.topic);
  if (!block) throw new Error(`${tpl.id}: ${tpl.topic}-mavzu config/elements.ts da yo'q`);
  return block;
}

/** Sintetik so'rov (mock joylashuviga bog'liq emas): tekshiruv yordamchilari va assemble uchun. */
export function extraRequest(tpl: ExtraTemplate, seed: number): SlotRequest {
  return { variant: seed, block: extraBlock(tpl), type: tpl.type, difficulty: tpl.difficulty, index: 0, count: 1, position: 1 };
}

/** Import formatidagi bitta savol (pool = 'practice'). */
export function buildExtraQuestion(tpl: ExtraTemplate, seed: number): Record<string, unknown> {
  const req = extraRequest(tpl, seed);
  const spec = tpl.generate(seed);
  if (spec.topic !== tpl.topic) throw new Error(`${tpl.id}: spec.topic ${spec.topic} !== ${tpl.topic}`);
  if (spec.difficulty !== tpl.difficulty) throw new Error(`${tpl.id}: spec.difficulty ${spec.difficulty} !== ${tpl.difficulty}`);
  return { ...assemble(spec, req), external_id: extraExternalId(tpl.id, seed), pool: 'practice', source: EXTRA_SOURCE };
}

export interface ExtraPoolResult {
  questions: Record<string, unknown>[];
  skipped: number;
  duplicates: number;
}

/**
 * Hamma shablonlardan `seedsPerTemplate` tadan savol. Xato bergan seed o'tkazib yuboriladi; mock/mashq imzolariga (exclude)
 * yoki oldingi savolga takrorlangan savol olib tashlanadi. Deterministik: shablonlar tartibi va seedlar bo'yicha.
 */
export function buildExtraPool(templates: readonly ExtraTemplate[], opts: { seedsPerTemplate?: number; exclude?: Set<string> } = {}): ExtraPoolResult {
  const per = opts.seedsPerTemplate ?? 40;
  const seen = new Set(opts.exclude ?? []);
  const questions: Record<string, unknown>[] = [];
  let skipped = 0;
  let duplicates = 0;
  for (const tpl of templates) {
    for (let seed = 0; seed < per; seed++) {
      let q: Record<string, unknown>;
      try {
        q = buildExtraQuestion(tpl, seed);
      } catch {
        skipped++;
        continue;
      }
      const sig = questionSignature(q);
      if (seen.has(sig)) {
        duplicates++;
        continue;
      }
      seen.add(sig);
      questions.push(q);
    }
  }
  return { questions, skipped, duplicates };
}
