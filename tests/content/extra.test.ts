import { describe, expect, it } from 'vitest';
import { buildExtraPool, buildExtraQuestion, questionSignature } from '../../content/gen/extra/build';
import { EXTRA_TEMPLATES } from '../../content/gen/extra';
import { ELEMENT_CODES, TOPIC_ELEMENTS } from '../../config/elements';
import { checkExtraTemplate } from './extra-harness';

// Barcha qo'shimcha shablonlar uchun umumiy tekshiruvlar. Matematik to'g'rilik: har soha o'zining extra-*-math.test.ts faylida.
const SEEDS = Array.from({ length: 12 }, (_, i) => i);

describe("qo'shimcha shablonlar (mashq zaxirasi)", () => {
  it("id lar noyob, formati to'g'ri; mavzu mavjud", () => {
    const ids = EXTRA_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of EXTRA_TEMPLATES) {
      expect(t.id, t.id).toMatch(/^[a-z0-9-]{2,32}$/);
      expect(TOPIC_ELEMENTS[t.topic], `${t.id}: mavzu ${t.topic}`).toBeDefined();
    }
  });

  it('har bir shablon: tuzilish, KaTeX, 4 til, import sxemasi (12 seed)', () => {
    const problems = EXTRA_TEMPLATES.flatMap((t) => checkExtraTemplate(t, SEEDS));
    expect(problems.slice(0, 15)).toEqual([]);
  });

  it("deterministik va seed bo'yicha turli savollar (kamida 8 ta turli savol 12 seedda)", () => {
    for (const t of EXTRA_TEMPLATES) {
      const a = SEEDS.map((s) => questionSignature(buildExtraQuestion(t, s)));
      const b = SEEDS.map((s) => questionSignature(buildExtraQuestion(t, s)));
      expect(a, `${t.id} deterministik emas`).toEqual(b);
      expect(new Set(a).size, `${t.id}: 12 seedda juda kam turli savol`).toBeGreaterThanOrEqual(8);
    }
  });

  it("qo'shimcha pool: external_id noyob, takroriy savol yo'q", () => {
    const pool = buildExtraPool(EXTRA_TEMPLATES, { seedsPerTemplate: 12 });
    const ids = pool.questions.map((q) => q.external_id as string);
    expect(new Set(ids).size).toBe(ids.length);
    const sigs = pool.questions.map((q) => questionSignature(q));
    expect(new Set(sigs).size).toBe(sigs.length);
    for (const q of pool.questions) expect(q.pool).toBe('practice');
  });

  it("elementlar: shablon mavzularining elementlari mavjud kodlar", () => {
    for (const t of EXTRA_TEMPLATES) for (const c of TOPIC_ELEMENTS[t.topic] ?? []) expect(ELEMENT_CODES).toContain(c);
  });
});
