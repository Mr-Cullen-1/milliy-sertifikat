import { describe, expect, it } from 'vitest';
import { mathFormatV1 } from '../../config/exam-format.math-v1';
import { parseAnswer, parseKey, scoringConfigSchema } from '../../lib/exam/schemas';

describe('scoringConfigSchema', () => {
  it('standart format konfiguratsiyasini qabul qiladi (JSON orqali o\'tgandan keyin ham)', () => {
    const viaJson = JSON.parse(JSON.stringify(mathFormatV1.scoring));
    expect(scoringConfigSchema.parse(viaJson)).toEqual(mathFormatV1.scoring);
  });

  it('shkala o\'smasa, darajalar o\'smasa yoki vazn manfiy bo\'lsa rad etadi', () => {
    const base = mathFormatV1.scoring;
    expect(() => scoringConfigSchema.parse({ ...base, scale: [[0, 0], [0, 75]] })).toThrow();
    expect(() => scoringConfigSchema.parse({ ...base, scale: [[0, 0]] })).toThrow();
    expect(() => scoringConfigSchema.parse({ ...base, levels: [...base.levels].reverse() })).toThrow();
    expect(() => scoringConfigSchema.parse({ ...base, y2Weight: -1 })).toThrow();
    expect(() => scoringConfigSchema.parse({ ...base, graceSec: 1.5 })).toThrow();
  });
});

describe('parseKey', () => {
  it('to\'g\'ri kalitlarni AnswerKey ga o\'tkazadi', () => {
    expect(parseKey('y1', { correct: 'C' })).toEqual({ type: 'y1', correct: 'C' });
    expect(parseKey('y2', { pairs: { '1': 'A', '2': 'F' } })).toEqual({ type: 'y2', pairs: { '1': 'A', '2': 'F' } });
    expect(parseKey('o', { a: ['3/4', '0.75'], b: ['-2'] })).toEqual({ type: 'o', a: ['3/4', '0.75'], b: ['-2'] });
    expect(parseKey('o', { b: ['5'] })).toEqual({ type: 'o', a: undefined, b: ['5'] });
  });

  it.each([
    ['y1', { correct: 'E' }],
    ['y1', { correct: 'a' }],
    ['y1', {}],
    ['y2', { pairs: {} }],
    ['y2', { pairs: { '1': 'G' } }],
    ['o', {}],
    ['o', { a: [] }],
    ['o', { a: ['abc'] }],
    ['o', { a: ['1/0'] }],
    ['y1', null],
  ] as const)('%s uchun %j rad etiladi', (type, raw) => {
    expect(() => parseKey(type, raw)).toThrow();
  });
});

describe('parseAnswer', () => {
  it('bo\'sh qiymat — javobsiz', () => {
    expect(parseAnswer('y1', null)).toBeUndefined();
    expect(parseAnswer('o', undefined)).toBeUndefined();
  });

  it('y1: bo\'sh joy va kichik harfga bardoshli, noto\'g\'ri shakl javobsiz', () => {
    expect(parseAnswer('y1', ' b ')).toBe('b');
    expect(parseAnswer('y1', 'E')).toBeUndefined();
    expect(parseAnswer('y1', { x: 1 })).toBeUndefined();
    expect(parseAnswer('y1', 42)).toBeUndefined();
  });

  it('y2: faqat yaroqli A–F tanlovlari qoladi', () => {
    expect(parseAnswer('y2', { '1': 'A', '2': 'z', '3': 5 })).toEqual({ '1': 'A' });
    expect(parseAnswer('y2', 'A')).toBeUndefined();
  });

  it('o: faqat bitta band to\'ldirilgan bo\'lsa ham javob yaroqli', () => {
    expect(parseAnswer('o', { a: '3/4' })).toEqual({ a: '3/4' });
    expect(parseAnswer('o', { b: '-2' })).toEqual({ b: '-2' });
    expect(parseAnswer('o', {})).toEqual({});
  });

  it('o: a/b satr bo\'lmasa e\'tiborsiz, uzun satr rad', () => {
    expect(parseAnswer('o', { a: '3/4', b: 7 })).toEqual({ a: '3/4', b: undefined });
    expect(parseAnswer('o', { a: 'x'.repeat(65) })).toEqual({ a: undefined, b: undefined });
    expect(parseAnswer('o', 'matn')).toBeUndefined();
  });
});
