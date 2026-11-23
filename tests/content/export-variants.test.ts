import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateImportText } from '../../lib/content/validate';

// content/export/variant-*.v2.json (pnpm content:export) — platforma validatoridan to'liq o'tishi va content/variants bilan mos bo'lishi shart.
const dir = join(process.cwd(), 'content', 'export');
const variantsDir = join(process.cwd(), 'content', 'variants');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^variant-[A-Z]\.v2\.json$/.test(f)).sort() : [];

describe('v2 eksport: barcha variantlar', () => {
  it('15 ta variant (A–O) bor', () => {
    expect(files.map((f) => f.slice(8, 9)).join('')).toBe('ABCDEFGHIJKLMNO');
  });

  for (const f of files) {
    it(`${f}: validatordan o'tadi, 45 savol, content/variants bilan bir xil`, () => {
      const text = readFileSync(join(dir, f), 'utf8');
      const res = validateImportText(text);
      if (!res.ok) throw new Error(res.problems.slice(0, 5).map((p) => `${p.path}: ${p.message}`).join('\n'));
      expect(res.summary.questions).toBe(45);
      expect(res.summary.byType).toEqual({ y1: 32, y2: 3, o: 10 });
      expect(res.summary.translated).toEqual({ ru: 45, kaa: 45, en: 45 });

      const out = JSON.parse(text) as { schema_version: number; exam: { code: string; slug: string; status: string }; questions: Array<Record<string, unknown>> };
      expect(out.schema_version).toBe(2);
      expect(out.exam.status).toBe('draft');
      expect(out.exam.slug).toBe(`variant-${out.exam.code.toLowerCase()}-v2`);
      out.questions.forEach((q, i) => expect(q.position).toBe(i + 1));

      const src = JSON.parse(readFileSync(join(variantsDir, `variant-${out.exam.code}.json`), 'utf8')) as { questions: Array<Record<string, unknown>> };
      const stripped = out.questions.map(({ position: _p, ...rest }) => rest);
      expect(stripped).toEqual(src.questions);
    });
  }
});
