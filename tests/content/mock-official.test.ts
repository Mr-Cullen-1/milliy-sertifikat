import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { officialBlocksOf } from '../../config/elements';
import { buildVariantFile } from '../../content/gen';
import { EXTRA_TEMPLATES } from '../../content/gen/extra';
import { buildExtraPool } from '../../content/gen/extra/build';
import { LAYOUT, VARIANT_COUNT } from '../../content/gen/layout';
import { OFFICIAL_MOCK_CODES, buildAllOfficialMocks } from '../../content/gen/mock-official';
import { buildPoolItems } from '../../content/gen/pool';
import { validateImportText } from '../../lib/content/validate';

// Yangi mock variantlar G–O (9 ta): Variant A tuzilishi + rasmiy bo'lim joylashuvi; A–F va mashq zaxirasi bilan takrorlanmaydi.

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');
const signature = (q: { stem_md?: unknown; payload?: unknown }): string => sha1(String(q.stem_md) + JSON.stringify(q.payload));
const mocks = buildAllOfficialMocks();
type Q = { topic: number; block: string; type: string; difficulty: string; external_id: string; stem_md: string; payload: unknown };

describe("yangi mock variantlar G–O (rasmiy joylashuv)", () => {
  it('9 ta variant: kodlar G..O', () => {
    expect(mocks.map((m) => m.exam.code)).toEqual([...OFFICIAL_MOCK_CODES]);
  });

  describe.each(mocks.map((m, i) => [m.exam.code, m, i] as const))('variant %s', (code, file) => {
    const result = validateImportText(JSON.stringify({ exam: file.exam, questions: file.questions }));

    it("import tekshiruvidan to'liq o'tadi (blueprint, kalitlar, tarjimalar)", () => {
      if (!result.ok) throw new Error(result.problems.slice(0, 8).map((p) => `${p.path}: ${p.message}`).join('\n'));
      expect(result.summary.questions).toBe(45);
      expect(result.summary.byType).toEqual({ y1: 32, y2: 3, o: 10 });
      expect(result.summary.translated).toEqual({ ru: 45, kaa: 45, en: 45 });
    });

    it("Variant A tuzilishi: tur, bo'lim va qiyinlik joylashuvi aynan A dagidek", () => {
      const qs = file.questions as unknown as Q[];
      expect(qs.map((q) => [q.type, q.block, q.difficulty])).toEqual(LAYOUT.map((s) => [s.type, s.block, s.difficulty]));
    });

    it("rasmiy joylashuv: har savol mavzusi o'z bo'limining rasmiy elementidan", () => {
      const bad = (file.questions as unknown as Q[]).map((q, i) => ({ q, i })).filter(({ q }) => !officialBlocksOf(q.topic).includes(q.block as never));
      expect(bad.map(({ q, i }) => `#${i + 1} ${q.block}: ${q.topic}`)).toEqual([]);
    });

    it('external_id lar noyob va variant harfi bilan', () => {
      const ids = (file.questions as unknown as Q[]).map((q) => q.external_id);
      expect(new Set(ids).size).toBe(45);
      expect(ids.every((id) => id.startsWith(`gen-${code}-`))).toBe(true);
    });

    it("JSON hajmi 4 MB dan kichik", () => {
      expect(new TextEncoder().encode(JSON.stringify(file)).length).toBeLessThan(4 * 1024 * 1024);
    });
  });

  it("bo'lim qoidalari: Analiz faqat 60–66 va 110; Sonlar faqat 1.x (1–6, 9–11); progressiya/matnli masala/foiz/nisbat/masshtab faqat Algebrada", () => {
    const all = mocks.flatMap((m) => m.questions as unknown as Q[]);
    for (const q of all) {
      if (q.block === 'analiz') expect([60, 61, 62, 63, 64, 65, 66, 110], `analiz: ${q.topic}`).toContain(q.topic);
      if (q.block === 'sonlar') expect([1, 2, 3, 4, 5, 6, 9, 10, 11, 104], `sonlar: ${q.topic}`).toContain(q.topic);
      if ([7, 8, 42, 56, 57, 58, 105].includes(q.topic)) expect(q.block, `mavzu ${q.topic}`).toBe('algebra');
    }
  });

  it("mavzular qamrovi: G–O da rasmiy 2.4 mavzulari (progressiya, matnli masala, foiz/nisbat, masshtab) va hosilaning fizik ma'nosi bor", () => {
    const topics = new Set(mocks.flatMap((m) => (m.questions as unknown as Q[]).map((q) => q.topic)));
    for (const t of [57, 58, 42, 105, 110]) expect(topics.has(t), `mavzu ${t}`).toBe(true);
    expect([7, 8].some((t) => topics.has(t))).toBe(true);
  });

  it("15 variantda (A–O) savollar takrorlanmaydi; G–O mashq zaxirasi va qo'shimcha shablonlar savollarini ham takrorlamaydi", () => {
    const seen = new Map<string, string>();
    const dups: string[] = [];
    const add = (sig: string, at: string) => {
      if (seen.has(sig)) dups.push(`${at} == ${seen.get(sig)}`);
      else seen.set(sig, at);
    };
    for (let v = 0; v < VARIANT_COUNT; v++) buildVariantFile(v).questions.forEach((q, i) => add(signature(q), `v${v}#${i + 1}`));
    for (const m of mocks) (m.questions as unknown as Q[]).forEach((q, i) => add(signature(q), `${m.exam.code}#${i + 1}`));
    expect(dups.slice(0, 10)).toEqual([]);

    const mockSigs = new Set(mocks.flatMap((m) => (m.questions as unknown as Q[]).map(signature)));
    const poolHits = buildPoolItems().items.filter((it) => mockSigs.has(signature(it.question))).map((it) => it.question.external_id);
    expect(poolHits.slice(0, 5)).toEqual([]);
    const extraHits = buildExtraPool(EXTRA_TEMPLATES, { seedsPerTemplate: 40 }).questions.filter((q) => mockSigs.has(signature(q))).map((q) => q.external_id);
    expect(extraHits.slice(0, 5)).toEqual([]);
  }, 300000);

  it("content/variants/*.json fayllari generator natijasi bilan mos (A–F o'zgarmagan, G–O yangilangan)", () => {
    const read = (code: string) => JSON.parse(readFileSync(join(process.cwd(), 'content', 'variants', `variant-${code}.json`), 'utf8'));
    for (let v = 0; v < VARIANT_COUNT; v++) {
      const f = buildVariantFile(v);
      expect(read(f.exam.code), `variant-${f.exam.code}.json eskirgan: pnpm content:dump`).toEqual(JSON.parse(JSON.stringify(f)));
    }
    for (const m of mocks) {
      const { info: _info, ...file } = m;
      void _info;
      expect(read(file.exam.code), `variant-${file.exam.code}.json eskirgan: pnpm content:dump`).toEqual(JSON.parse(JSON.stringify(file)));
    }
  });
});
