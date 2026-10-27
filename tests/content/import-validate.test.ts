import { describe, expect, it } from 'vitest';
import { examSortFromCode, MAX_IMPORT_BYTES, validateImportText } from '../../lib/content/validate';

const y1 = (over: Record<string, unknown> = {}) => ({
  type: 'y1',
  block: 'sonlar',
  topic: 3,
  difficulty: 'L1',
  stem_md: '$12$ va $18$ EKUBi?',
  payload: { options: { A: '3', B: '6', C: '9', D: '36' } },
  key: { correct: 'B' },
  solution_md: 'EKUB = 6',
  ...over,
});

const y2 = {
  type: 'y2',
  block: 'geometriya',
  topic: 70,
  difficulty: 'L2',
  stem_md: 'Moslang',
  payload: { options: { A: '1', B: '2', C: '3' }, items: [{ id: '1', text_md: 'x' }, { id: '2', text_md: 'y' }] },
  key: { pairs: { '1': 'A', '2': 'C' } },
};

const open = {
  type: 'o',
  block: 'tenglama',
  topic: 30,
  difficulty: 'L2',
  stem_md: 'Yeching',
  payload: { parts: { a: { prompt_md: 'a)' }, b: { prompt_md: 'b)' } } },
  key: { a: ['3/4', '0.75'], b: ['-2'] },
};

const text = (v: unknown) => JSON.stringify(v);

describe('validateImportText: savollar', () => {
  it('to\'g\'ri savollar ro\'yxati (massiv yoki {questions}) qabul qilinadi va xulosa beradi', () => {
    for (const input of [[y1(), y2, open], { questions: [y1(), y2, open] }]) {
      const r = validateImportText(text(input));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.summary).toMatchObject({ questions: 3, byType: { y1: 1, y2: 1, o: 1 }, exam: null, withFigure: 0 });
    }
  });

  it('tarjima va chizmalar xulosada sanaladi', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';
    const q = y1({
      payload: { options: { A: '3', B: '6', C: '9', D: '36' }, figure: { svg, alt: 'doira' } },
      i18n: { ru: { stem_md: 'Вопрос', payload: { options: { A: '3', B: '6', C: '9', D: '36' } } } },
    });
    const r = validateImportText(text([q]));
    expect(r.ok && r.summary.translated).toEqual({ ru: 1, kaa: 0, en: 0 });
    expect(r.ok && r.summary.withFigure).toBe(1);
  });

  it('xato savol raqami va maydon yo\'li bilan ko\'rsatiladi', () => {
    const r = validateImportText(text([y1(), y1({ key: { correct: 'E' } }), y1({ topic: 50 })]));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const paths = r.problems.map((p) => p.path);
    expect(paths.some((p) => p.startsWith('questions[2]'))).toBe(true);
    expect(r.problems.some((p) => /"sonlar" blokiga tegishli emas/.test(p.message) && p.path === 'questions[3].topic')).toBe(true);
  });

  it('kalit va payload nomuvofiqligi ushlanadi (y2: kalitsiz band; o: a/b mos emas)', () => {
    const noKey = { ...y2, key: { pairs: { '1': 'A' } } };
    const wrongLetter = { ...y2, key: { pairs: { '1': 'A', '2': 'F' } } };
    const partMismatch = { ...open, key: { a: ['1'] } };
    for (const q of [noKey, wrongLetter, partMismatch]) {
      expect(validateImportText(text([q])).ok).toBe(false);
    }
    const r = validateImportText(text([noKey]));
    expect(!r.ok && r.problems.map((p) => p.message).join('|')).toMatch(/"2" bandi uchun kalit yo'q/);
  });

  it('tarjima tuzilishi asosiy matnnikidan farq qilsa rad etiladi', () => {
    const q = y2 && { ...y2, i18n: { ru: { stem_md: 'x', payload: { options: { A: '1', B: '2' }, items: [{ id: '1', text_md: 'x' }, { id: '2', text_md: 'y' }] } } } };
    const r = validateImportText(text([q]));
    expect(!r.ok && r.problems.map((p) => p.message).join('|')).toMatch(/ru tarjimasi tuzilishi/);
  });

  it('xavfli SVG, buzuq JSON va katta fayl rad etiladi', () => {
    const bad = y1({ payload: { options: { A: '1', B: '2', C: '3', D: '4' }, figure: { svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', alt: 'x' } } });
    expect(validateImportText(text([bad])).ok).toBe(false);
    const broken = validateImportText('{"questions": [');
    expect(!broken.ok && broken.problems[0]!.message).toMatch(/JSON sintaksisi/);
    expect(validateImportText('x'.repeat(MAX_IMPORT_BYTES + 1)).ok).toBe(false);
    expect(validateImportText('[]').ok).toBe(false); // bo'sh ro'yxat
  });

  it('external_id fayl ichida takrorlanmasin', () => {
    const r = validateImportText(text([y1({ external_id: 'a' }), y1({ external_id: 'a' })]));
    expect(!r.ok && r.problems[0]!.message).toMatch(/2-savolda ham bor|1-savolda ham bor/);
  });
});

describe('validateImportText: mock', () => {
  it('45 dan kam savol bilan mock rad etiladi', () => {
    const r = validateImportText(text({ exam: { title: 'Variant X', code: 'X' }, questions: [y1()] }));
    expect(!r.ok && r.problems[0]!.message).toMatch(/45 ta savol kerak, 1 ta berilgan/);
  });

  it('exam.code tartibi', () => {
    expect([examSortFromCode('A'), examSortFromCode('c'), examSortFromCode('F'), examSortFromCode(undefined), examSortFromCode('?')]).toEqual([0, 2, 5, 0, 0]);
  });
});

import { SAMPLE_IMPORT } from '../../lib/content/sample';

describe('namunaviy import fayli', () => {
  it("admin yuklab oladigan namuna o'zi tekshiruvdan o'tadi", () => {
    const r = validateImportText(JSON.stringify(SAMPLE_IMPORT));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.summary).toMatchObject({ questions: 3, byType: { y1: 1, y2: 1, o: 1 } });
  });
});
