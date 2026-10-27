import { describe, expect, it } from 'vitest';
import { LAYOUT, slotRequests } from '../../content/gen/layout';
import { makeRng, y1Options, keyForms, frac, fAdd, texFrac, texBig, numericDistractors } from '../../content/gen/helpers';
import type { QuestionSpec, SlotRequest } from '../../content/gen/types';
import { checkMath, checkQuestion } from './harness';

describe('layout', () => {
  it('45 ta pozitsiya, rasmiy blueprint: 32 Y-1, 3 Y-2, 10 O', () => {
    expect(LAYOUT).toHaveLength(45);
    expect(LAYOUT.map((s) => s.position)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    const count = (t: string) => LAYOUT.filter((s) => s.type === t).length;
    expect([count('y1'), count('y2'), count('o')]).toEqual([32, 3, 10]);
  });

  it('bloklar tartibi va soni spetsifikatsiyaga mos', () => {
    const perBlock = (b: string) => LAYOUT.filter((s) => s.block === b).length;
    expect(['sonlar', 'algebra', 'tenglama', 'funksiyalar', 'analiz', 'geometriya', 'toplam'].map(perBlock)).toEqual([2, 11, 8, 3, 4, 14, 3]);
    expect(LAYOUT[0]).toMatchObject({ position: 1, block: 'sonlar', type: 'y1', difficulty: 'L1' });
    expect(LAYOUT[31]).toMatchObject({ position: 32, block: 'toplam', type: 'y1', difficulty: 'L3' });
    expect(LAYOUT[32]).toMatchObject({ position: 33, block: 'geometriya', type: 'y2', difficulty: 'L2' });
    expect(LAYOUT[44]).toMatchObject({ position: 45, block: 'toplam', type: 'o', difficulty: 'L3' });
  });

  it('index va count blok/tur bo\'yicha to\'g\'ri', () => {
    const geo = LAYOUT.filter((s) => s.block === 'geometriya' && s.type === 'y1');
    expect(geo.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(geo.every((s) => s.count === 7)).toBe(true);
    expect(slotRequests(3).every((r) => r.variant === 3)).toBe(true);
  });
});

describe('helpers', () => {
  it('rng deterministik va aralashtirish elementlarni saqlaydi', () => {
    expect(makeRng('x').int(1, 1000)).toBe(makeRng('x').int(1, 1000));
    expect(makeRng('x').int(1, 1000)).not.toBe(makeRng('y').int(1, 1000));
    expect(makeRng('s').shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    for (let i = 0; i < 200; i++) {
      const n = makeRng(String(i)).int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it('kasrlar va TeX', () => {
    expect(fAdd(frac(1, 2), frac(1, 3))).toEqual({ n: 5, d: 6 });
    expect(frac(2, -4)).toEqual({ n: -1, d: 2 });
    expect(texFrac(frac(-3, 6))).toBe('-\\frac{1}{2}');
    expect(texFrac(frac(4, 2))).toBe('2');
    expect(texBig(149600000)).toBe('149\\,600\\,000');
  });

  it('javob kaliti shakllari', () => {
    expect(keyForms(frac(3, 4))).toEqual(['3/4', '0.75']);
    expect(keyForms(frac(1, 3))).toEqual(['1/3']);
    expect(keyForms(frac(-5, 1))).toEqual(['-5']);
  });

  it('y1Options: aralashtiradi, noyoblikni ta\'minlaydi, yetmasa xato beradi', () => {
    const r = y1Options('7', ['6', '8', '9', '10'], makeRng('a'));
    expect(Object.values(r.options).sort()).toHaveLength(4);
    expect(r.options[r.correct]).toBe('7');
    expect(() => y1Options('7', ['7', '7', '8'], makeRng('a'))).toThrow(/kamida 3 ta noyob/);
    expect(numericDistractors(10, [9, 11, 12], makeRng('a'))).toEqual(['9', '11', '12']);
  });
});

const req: SlotRequest = { variant: 0, block: 'sonlar', type: 'y1', difficulty: 'L1', index: 0, count: 2, position: 1 };

const good = (over: Partial<QuestionSpec> = {}, opts?: { options?: Record<string, string> }): QuestionSpec => ({
  topic: 3,
  difficulty: 'L1',
  estSeconds: 60,
  key: { correct: 'B' },
  content: () => ({
    stem_md: '$12$ va $18$ sonlarining EKUBini toping.',
    payload: { options: { A: '$3$', B: '$6$', C: '$9$', D: '$36$', ...opts?.options } },
    solution_md: 'Umumiy bo\'luvchilar: $1,2,3,6$. Eng kattasi $6$.',
  }),
  ...over,
});

describe('checkQuestion (harness o\'zi xatolarni ushlaydimi)', () => {
  it('to\'g\'ri savolga muammo topmaydi', () => {
    expect(checkQuestion(good(), req)).toEqual([]);
  });

  it('takroriy variantlarni ushlaydi', () => {
    expect(checkQuestion(good({}, { options: { C: '$6$' } }), req).join('\n')).toMatch(/takrorlanadi/);
  });

  it('noto\'g\'ri TeX ni ushlaydi', () => {
    const bad = good({}, { options: { A: '$\\frac{1}{$' } });
    expect(checkQuestion(bad, req).join('\n')).toMatch(/KaTeX/);
  });

  it('blokka tegishli bo\'lmagan mavzu va noto\'g\'ri qiyinlikni ushlaydi', () => {
    const out = checkQuestion(good({ topic: 50, difficulty: 'L3' }), req).join('\n');
    expect(out).toMatch(/blokka .* tegishli emas/);
    expect(out).toMatch(/qiyinlik/);
  });

  it('kalit variantlar tuzilishiga mos kelmasa va tillar tuzilishi farq qilsa ushlaydi', () => {
    expect(checkQuestion(good({ key: { correct: 'E' } }), req).join('\n')).toMatch(/key/);
    const diff = good({
      content: (lang) => ({
        stem_md: '$12$ va $18$ sonlarining EKUBini toping.',
        payload: lang === 'ru' ? { options: { A: '1', B: '2', C: '3', D: '4' }, figure: undefined } : { options: { A: '$3$', B: '$6$', C: '$9$', D: '$36$' } },
        solution_md: 'Umumiy bo\'luvchilar: $1,2,3,6$. Eng kattasi $6$.',
      }),
    });
    expect(checkQuestion(diff, req)).toEqual([]); // y1 tuzilishi bir xil (ABCD): matn farqi xato emas
  });

  it('o\'tkazib yuborilgan tarjima / qoldiq matn / literal dollar', () => {
    const noTr = good({
      content: (lang) => {
        if (lang === 'kaa') throw new Error('tarjima yo\'q');
        return { stem_md: '$12$ va $18$ EKUB. Narxi 5 $ so\'m', payload: { options: { A: '1', B: '2', C: '3', D: '4' } }, solution_md: 'Yechim: undefined hisoblandi, javob $6$.' };
      },
    });
    const out = checkQuestion(noTr, req).join('\n');
    expect(out).toMatch(/\[kaa\].*content\(\) xato/);
    expect(out).toMatch(/undefined/);
    expect(out).toMatch(/"\$"/);
  });

  it('checkMath: display va inline formulalar', () => {
    expect(checkMath('$$\\frac{a}{b}$$ va $x^2$', 'w')).toEqual([]);
    expect(checkMath('$x^{2$', 'w')).not.toEqual([]);
  });
});
