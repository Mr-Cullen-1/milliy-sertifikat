import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importQuestionSchema } from '../../lib/content/import-schema';
import { validateImportText } from '../../lib/content/validate';

// Mashq importi namunasi (docs/import-practice-format.md): content/export/practice-sample.v2.json platforma validatoridan o'tishi shart.
const text = readFileSync(join(process.cwd(), 'content', 'export', 'practice-sample.v2.json'), 'utf8');

describe('mashq importi namunasi', () => {
  const res = validateImportText(text);

  it('to\'liq import tekshiruvidan o\'tadi va mocksiz (exam yo\'q)', () => {
    if (!res.ok) throw new Error(res.problems.map((p) => `${p.path}: ${p.message}`).join('\n'));
    expect(res.summary.exam).toBeNull();
  });

  it('hamma savol mashq zaxirasiga tegishli va 4 tilda, id lari noyob', () => {
    if (!res.ok) throw new Error('validatsiya o\'tmadi');
    const ids = res.file.questions.map((q) => q.external_id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of res.file.questions) {
      expect(q.pool, q.external_id).toBe('practice');
      expect(q.i18n?.ru && q.i18n.kaa && q.i18n.en, q.external_id).toBeTruthy();
    }
  });

  it('namuna hamma tur, qiyinlik, blok va chizmani qamraydi', () => {
    if (!res.ok) throw new Error('validatsiya o\'tmadi');
    expect(Object.keys(res.summary.byType).sort()).toEqual(['o', 'y1', 'y2']);
    expect(Object.keys(res.summary.byDifficulty).sort()).toEqual(['L1', 'L2', 'L3']);
    expect(Object.keys(res.summary.byBlock)).toHaveLength(7);
    expect(res.summary.withFigure).toBeGreaterThanOrEqual(3);
  });
});

// Hujjatdagi (5.3) "faqat a" va "faqat b" bandli ochiq savol misollari ham yaroqli, nomuvofiq kalit esa rad etiladi.
describe('ochiq savol: bitta bandli misollar', () => {
  const base = { type: 'o', block: 'sonlar', topic: 4, difficulty: 'L1', pool: 'practice', stem_md: 'Hisoblang.' } as const;

  it('faqat a', () => {
    const q = { ...base, payload: { parts: { a: { prompt_md: 'Yig\'indini toping: $\\frac{3}{4}+\\frac{1}{2}$.' } } }, key: { a: ['5/4', '1.25'] } };
    expect(importQuestionSchema.safeParse(q).success).toBe(true);
  });

  it('faqat b', () => {
    const q = { ...base, payload: { parts: { b: { prompt_md: '$2^{5}$ ni toping.' } } }, key: { b: ['32'] } };
    expect(importQuestionSchema.safeParse(q).success).toBe(true);
  });

  it('payload a, kalit b: rad etiladi', () => {
    const q = { ...base, payload: { parts: { a: { prompt_md: 'Savol.' } } }, key: { b: ['1'] } };
    expect(importQuestionSchema.safeParse(q).success).toBe(false);
  });
});
