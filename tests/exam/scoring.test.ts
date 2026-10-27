import { describe, expect, it } from 'vitest';
import { mathFormatV1 } from '../../config/exam-format.math-v1';
import { levelFor } from '../../lib/exam/levels';
import { scoreAttempt, scoreItem, toScaled, type ScorableItem } from '../../lib/exam/scoring';

const cfg = mathFormatV1.scoring;

const y1: ScorableItem = { questionId: 'q', type: 'y1', difficulty: 'L3' };
const y2: ScorableItem = { questionId: 'q', type: 'y2', difficulty: 'L2' };
const open: ScorableItem = { questionId: 'q', type: 'o', difficulty: 'L3' };

describe('scoreItem y1', () => {
  const key = { type: 'y1', correct: 'B' } as const;

  it('qiyinlikka qarab 1,3 yoki 2,2 beradi', () => {
    expect(scoreItem(y1, 'b', key, cfg)).toEqual({ score: 2.2, max: 2.2, correct: true });
    expect(scoreItem({ ...y1, difficulty: 'L1' }, 'B', key, cfg).score).toBe(1.3);
  });

  it('muallif vazni konfigdan ustun', () => {
    expect(scoreItem({ ...y1, weight: 1.3 }, 'B', key, cfg).score).toBe(1.3);
  });

  it('noto\'g\'ri va bo\'sh javobga 0', () => {
    expect(scoreItem(y1, 'A', key, cfg).score).toBe(0);
    expect(scoreItem(y1, undefined, key, cfg).score).toBe(0);
  });
});

describe('scoreItem y2', () => {
  const key = { type: 'y2', pairs: { '1': 'A', '2': 'C', '3': 'F' } } as const;

  it('hamma band to\'g\'ri bo\'lsagina 2,2', () => {
    expect(scoreItem(y2, { '1': 'A', '2': 'C', '3': 'F' }, key, cfg).score).toBe(2.2);
    expect(scoreItem(y2, { '1': 'A', '2': 'C', '3': 'E' }, key, cfg).score).toBe(0);
  });
});

describe('scoreItem o', () => {
  const key = { type: 'o', a: ['0.75', '3/4'], b: ['-2'] } as const;

  it('a, b va ikkalasi uchun alohida ball', () => {
    expect(scoreItem(open, { a: '3/4', b: '-2' }, key, cfg).score).toBe(3.2);
    expect(scoreItem(open, { a: '0,75' }, key, cfg).score).toBe(1.5);
    expect(scoreItem(open, { a: '1', b: '−2' }, key, cfg).score).toBe(1.7);
    expect(scoreItem(open, { a: '1', b: '1' }, key, cfg).score).toBe(0);
  });

  it('maksimal ball kalitdagi bandlarga bog\'liq', () => {
    expect(scoreItem(open, {}, key, cfg).max).toBe(3.2);
    expect(scoreItem(open, {}, { type: 'o', a: ['5'] }, cfg).max).toBe(1.5);
    expect(scoreItem(open, {}, { type: 'o', b: ['5'] }, cfg).max).toBe(1.7);
  });
});

describe('toScaled', () => {
  it('chiziqli shkala 0..75', () => {
    expect(toScaled(0, cfg.scale)).toBe(0);
    expect(toScaled(0.5, cfg.scale)).toBe(37.5);
    expect(toScaled(1, cfg.scale)).toBe(75);
    expect(toScaled(2, cfg.scale)).toBe(75);
  });

  it('bo\'lakli-chiziqli nuqtalarni hisobga oladi', () => {
    expect(toScaled(0.5, [[0, 0], [0.5, 46], [1, 75]])).toBe(46);
  });
});

describe('levelFor', () => {
  it.each([
    [45.9, null],
    [46, 'C'],
    [49.9, 'C'],
    [50, 'C+'],
    [54.9, 'C+'],
    [55, 'B'],
    [60, 'B+'],
    [65, 'A'],
    [69.9, 'A'],
    [70, 'A+'],
    [75, 'A+'],
  ])('%d -> %s', (scaled, level) => {
    expect(levelFor(scaled, cfg.levels)).toBe(level);
  });
});

describe('scoreAttempt', () => {
  it('to\'liq to\'g\'ri variant 75 ball beradi', () => {
    const y1Key = { type: 'y1', correct: 'A' } as const;
    const y2Key = { type: 'y2', pairs: { '1': 'A' } } as const;
    const oKey = { type: 'o', a: ['1'], b: ['2'] } as const;
    const results = [
      ...Array.from({ length: 20 }, () => scoreItem({ ...y1, difficulty: 'L1' }, 'A', y1Key, cfg)),
      ...Array.from({ length: 12 }, () => scoreItem(y1, 'A', y1Key, cfg)),
      ...Array.from({ length: 3 }, () => scoreItem(y2, { '1': 'A' }, y2Key, cfg)),
      ...Array.from({ length: 10 }, () => scoreItem(open, { a: '1', b: '2' }, oKey, cfg)),
    ];
    const total = scoreAttempt(results, cfg);
    expect(total).toEqual({ raw: 91, maxRaw: 91, scaled: 75 });
    expect(levelFor(total.scaled, cfg.levels)).toBe('A+');
  });

  it('bo\'sh natija 0 beradi', () => {
    expect(scoreAttempt([], cfg)).toEqual({ raw: 0, maxRaw: 0, scaled: 0 });
  });
});

describe('mathFormatV1', () => {
  const blocks = Object.values(mathFormatV1.blueprint);
  const sum = (t: 'y1' | 'y2' | 'o') => blocks.reduce((s, b) => s + b[t], 0);

  it('rasmiy 45 = 32 + 3 + 10', () => {
    expect([sum('y1'), sum('y2'), sum('o')]).toEqual([32, 3, 10]);
  });

  it('bloklar bo\'yicha 2/11/8/3/4/14/3', () => {
    expect(blocks.map((b) => b.y1 + b.y2 + b.o)).toEqual([2, 11, 8, 3, 4, 14, 3]);
  });

  it('bo\'limlar diapazoni 1..45 ni to\'liq qoplaydi', () => {
    const covered = mathFormatV1.sections.reduce((s, x) => s + (x.to - x.from + 1), 0);
    expect(covered).toBe(45);
  });
});
