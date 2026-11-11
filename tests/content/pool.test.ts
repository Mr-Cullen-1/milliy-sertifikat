import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildVariantFile } from '../../content/gen';
import { VARIANT_COUNT } from '../../content/gen/layout';
import { buildPool, buildPoolItems, POOL_SOURCE } from '../../content/gen/pool';
import { topicAllowedInBlock } from '../../config/elements';
import { BLOCK_CODES, type BlockCode } from '../../config/topics';
import { importQuestionSchema } from '../../lib/content/import-schema';
import { validateImportText } from '../../lib/content/validate';
import { checkQuestion } from './harness';

// Mashq zaxirasi (pool: 'practice'): mock variantlardan (0..5) keyingi variant raqamlari bilan yaratiladi.
const sig = (q: Record<string, unknown>) => createHash('sha1').update(String(q.stem_md) + JSON.stringify(q.payload)).digest('hex');
const questionsOf = (r: { questions: Record<string, unknown>[] }) => r.questions as Array<Record<string, unknown> & { external_id: string; block: string; topic: number }>;

describe('mashq zaxirasi: kichik qurilma (8 variant)', () => {
  const built = buildPoolItems({ variants: 8 });

  it('har savol to\'liq tekshiruvdan o\'tadi (KaTeX, 4 til, kalit, tuzilish, mavzu-blok, qiyinlik)', () => {
    expect(built.items.length).toBeGreaterThan(200);
    const problems = built.items.flatMap((it) => checkQuestion(it.spec, it.req));
    expect(problems.slice(0, 15)).toEqual([]);
  }, 60_000);

  it('har savol import sxemasidan o\'tadi va mashq belgilari to\'g\'ri', () => {
    for (const { question: q, variant, req } of built.items) {
      const r = importQuestionSchema.safeParse(q);
      expect(r.success, `${String(q.external_id)}: ${r.success ? '' : r.error.issues[0]?.message}`).toBe(true);
      expect(q.pool).toBe('practice');
      expect(q.source).toBe(POOL_SOURCE);
      expect(q.external_id).toBe(`gen-P${String(variant).padStart(3, '0')}-${String(req.position).padStart(2, '0')}`);
      expect((q.external_id as string).length).toBeLessThanOrEqual(64);
    }
  });

  it('to\'liq import tekshiruvi (xavfsiz SVG, tarjima) va mocksiz: exam maydoni yo\'q', () => {
    const qs = questionsOf(buildPool({ variants: 8 }));
    for (let i = 0; i < qs.length; i += 100) {
      const res = validateImportText(JSON.stringify({ questions: qs.slice(i, i + 100) }));
      if (!res.ok) throw new Error(res.problems.slice(0, 5).map((p) => `${p.path}: ${p.message}`).join('\n'));
      expect(res.summary.translated.kaa).toBe(res.summary.questions);
      expect(res.summary.exam).toBeNull();
    }
  });

  it('deterministik: ikki marta qurilsa baytma-bayt bir xil', () => {
    expect(JSON.stringify(buildPool({ variants: 8 }))).toBe(JSON.stringify(buildPool({ variants: 8 })));
  });

  it('mock variantlar (0..5) raqamlari mashqqa berilmaydi', () => {
    expect(() => buildPool({ fromVariant: VARIANT_COUNT - 1, variants: 1 })).toThrow();
  });
});

describe('mashq zaxirasi: to\'liq (standart 40 variant)', () => {
  const pool = buildPool();
  const qs = questionsOf(pool);

  it('har blok kamida 60 savol, 7 blokning hammasi qamralgan', () => {
    const byBlock: Record<string, number> = {};
    for (const q of qs) byBlock[q.block] = (byBlock[q.block] ?? 0) + 1;
    expect(Object.keys(byBlock).sort()).toEqual([...BLOCK_CODES].sort());
    for (const b of BLOCK_CODES) expect(byBlock[b], `${b}: ${byBlock[b]}`).toBeGreaterThanOrEqual(60);
  });

  it('o\'tkazib yuborilganlar kam, barcha savollar sxemadan o\'tadi va mavzu blokka tegishli', () => {
    expect(pool.skipped).toBeLessThan(qs.length * 0.05);
    const bad: string[] = [];
    for (const q of qs) {
      const r = importQuestionSchema.safeParse(q);
      if (!r.success) bad.push(`${q.external_id}: ${r.error.issues[0]?.message}`);
      if (!topicAllowedInBlock(q.block as BlockCode, q.topic)) bad.push(`${q.external_id}: mavzu ${q.topic} blokka tegishli emas`);
      if (JSON.stringify(q).includes('undefined') || /"NaN"|NaN\b/.test(JSON.stringify([q.stem_md, q.payload]))) bad.push(`${q.external_id}: undefined/NaN`);
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('external_id lar noyob', () => {
    expect(new Set(qs.map((q) => q.external_id)).size).toBe(qs.length);
  });

  it('savollar o\'zaro va mock A–F bilan takrorlanmaydi (matn + variantlar)', () => {
    const mock = new Set<string>();
    for (let v = 0; v < VARIANT_COUNT; v++) for (const q of buildVariantFile(v).questions) mock.add(sig(q));
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const q of qs) {
      const s = sig(q);
      if (mock.has(s) || seen.has(s)) dups.push(q.external_id);
      seen.add(s);
    }
    expect(dups.slice(0, 10)).toEqual([]);
  });

  it('deterministik: ikki qurilish bir xil', () => {
    expect(JSON.stringify(buildPool())).toBe(JSON.stringify(pool));
  });
});
