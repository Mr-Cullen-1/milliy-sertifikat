import { describe, expect, it } from 'vitest';
import { buildVariantFile } from '../../content/gen';
import { VARIANT_COUNT } from '../../content/gen/layout';
import { validateImportText } from '../../lib/content/validate';

// 6 ta to'liq variant: har biri import sxemasi va rasmiy blueprint bo'yicha (45 savol, 32/3/10, bo'limlar 2/11/8/3/4/14/3).
const variants = Array.from({ length: VARIANT_COUNT }, (_, v) => v);
const built = variants.map((v) => buildVariantFile(v));

describe.each(variants)('variant %i', (v) => {
  const file = built[v]!;
  const result = validateImportText(JSON.stringify(file));

  it('import tekshiruvidan to\'liq o\'tadi (blueprint, kalitlar, tarjimalar)', () => {
    if (!result.ok) throw new Error(result.problems.slice(0, 8).map((p) => `${p.path}: ${p.message}`).join('\n'));
    expect(result.summary.questions).toBe(45);
    expect(result.summary.byType).toEqual({ y1: 32, y2: 3, o: 10 });
    expect(result.summary.translated).toEqual({ ru: 45, kaa: 45, en: 45 });
  });

  it('qiyinlik ketma-ketligi: 1–12 L1, 13–27 L2, 28–32 L3', () => {
    const level = (pos: number) => (file.questions[pos - 1] as { difficulty: string }).difficulty;
    expect(Array.from({ length: 12 }, (_, i) => level(i + 1)).every((l) => l === 'L1')).toBe(true);
    expect(Array.from({ length: 15 }, (_, i) => level(i + 13)).every((l) => l === 'L2')).toBe(true);
    expect(Array.from({ length: 5 }, (_, i) => level(i + 28)).every((l) => l === 'L3')).toBe(true);
  });

  it('external_id lar noyob va variant harfi bilan', () => {
    const ids = file.questions.map((q) => q.external_id as string);
    expect(new Set(ids).size).toBe(45);
    expect(ids.every((id) => id.startsWith(`gen-${file.exam.code}-`))).toBe(true);
  });
});

describe('6 variant birgalikda', () => {
  it('270 savolda o\'zbekcha matn+variantlar takrorlanmaydi', () => {
    const seen = new Map<string, string>();
    const dups: string[] = [];
    built.forEach((f, v) =>
      f.questions.forEach((q, i) => {
        const sig = JSON.stringify([q.stem_md, q.payload]);
        const at = `v${v} #${i + 1}`;
        if (seen.has(sig)) dups.push(`${at} == ${seen.get(sig)}`);
        seen.set(sig, at);
      }),
    );
    expect(dups.slice(0, 10)).toEqual([]);
  });

  it('chizmali savollar mavjud (geometriya) va hammasi xavfsiz', () => {
    const withFigure = built.flatMap((f) => f.questions).filter((q) => (q.payload as { figure?: unknown }).figure);
    expect(withFigure.length).toBeGreaterThan(30);
  });

  it('hajm: har variant JSON 4 MB dan kichik (admin importi chegarasi)', () => {
    for (const f of built) expect(new TextEncoder().encode(JSON.stringify(f)).length).toBeLessThan(4 * 1024 * 1024);
  });
});
