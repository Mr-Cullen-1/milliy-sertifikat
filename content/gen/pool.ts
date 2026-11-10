import { createHash } from 'node:crypto';
import { assemble } from './assemble';
import { buildVariantFile, generators } from './index';
import { slotRequests, VARIANT_COUNT } from './layout';
import type { QuestionSpec, SlotRequest } from './types';

// Mashq zaxirasi: mock variantlar (0..VARIANT_COUNT-1) dan keyingi variant raqamlari bilan ishlatilgan
// o'sha 45 pozitsiyalik tartib. Savollar mockka kirmaydi (pool: 'practice'). Mavjud generatorlar o'zgarmaydi.

export interface PoolOptions {
  /** Birinchi variant raqami (standart: VARIANT_COUNT, ya'ni mocklardan keyingisi) */
  fromVariant?: number;
  /** nechta variant raqami skanerlanadi (standart: 40) */
  variants?: number;
}

export interface PoolItem {
  variant: number;
  req: SlotRequest;
  spec: QuestionSpec;
  question: Record<string, unknown>;
}

export interface PoolResult {
  questions: Record<string, unknown>[];
  skipped: number;
  duplicates: number;
}

export const POOL_SOURCE = 'gen:pool-v1';

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');
const signature = (q: { stem_md?: unknown; payload?: unknown }) => sha1(String(q.stem_md) + JSON.stringify(q.payload));

/** Mock variantlar (0..5) imzolari: mashq savoli mockdagi savolni takrorlamasin. */
function mockSignatures(): Set<string> {
  const set = new Set<string>();
  for (let v = 0; v < VARIANT_COUNT; v++) for (const q of buildVariantFile(v).questions) set.add(signature(q));
  return set;
}

export const poolExternalId = (variant: number, position: number): string => `gen-P${String(variant).padStart(3, '0')}-${String(position).padStart(2, '0')}`;

/** Spetsifikatsiya bilan birga (testlar uchun): har pozitsiya alohida try/catch, xato bergan o'rin o'tkazib yuboriladi. */
export function buildPoolItems(opts: PoolOptions = {}): { items: PoolItem[]; skipped: number; duplicates: number } {
  const from = opts.fromVariant ?? VARIANT_COUNT;
  const count = opts.variants ?? 40;
  if (!Number.isInteger(from) || from < VARIANT_COUNT) throw new Error(`fromVariant ${VARIANT_COUNT} dan kichik bo'lmasligi kerak (0..${VARIANT_COUNT - 1} mockka band)`);
  if (!Number.isInteger(count) || count < 0) throw new Error("variants manfiy bo'lmagan butun son bo'lishi kerak");

  const seen = mockSignatures();
  const items: PoolItem[] = [];
  let skipped = 0;
  let duplicates = 0;

  for (let variant = from; variant < from + count; variant++) {
    for (const req of slotRequests(variant)) {
      let spec: QuestionSpec;
      let question: Record<string, unknown>;
      try {
        spec = generators[req.block](req);
        question = { ...assemble(spec, req), pool: 'practice', source: POOL_SOURCE, external_id: poolExternalId(variant, req.position) };
      } catch {
        skipped += 1;
        continue;
      }
      const sig = signature(question);
      if (seen.has(sig)) {
        duplicates += 1;
        continue;
      }
      seen.add(sig);
      items.push({ variant, req, spec, question });
    }
  }
  return { items, skipped, duplicates };
}

export function buildPool(opts: PoolOptions = {}): PoolResult {
  const { items, skipped, duplicates } = buildPoolItems(opts);
  return { questions: items.map((i) => i.question), skipped, duplicates };
}
