import { describe, expect, it } from 'vitest';
import { sanitizeOpenInput } from '@/lib/exam/answer-state';
import { backspaceAt, insertAt } from '@/lib/exam/open-input';
import { numericEquals } from '@/lib/exam/normalize-answer';

describe('insertAt (ekran klaviaturasi)', () => {
  it("kursor o'rniga belgi qo'shadi va kursorni suradi", () => {
    expect(insertAt('', 0, 0, '7')).toEqual({ text: '7', caret: 1 });
    expect(insertAt('34', 1, 1, '/')).toEqual({ text: '3/4', caret: 2 });
    expect(insertAt('12', 2, 2, ',')).toEqual({ text: '12,', caret: 3 });
  });

  it("tanlangan oraliqni almashtiradi", () => {
    expect(insertAt('12345', 1, 4, '9')).toEqual({ text: '195', caret: 2 });
  });

  it('chegaradan tashqari indekslarni qirqadi', () => {
    expect(insertAt('5', 99, 120, '0')).toEqual({ text: '50', caret: 2 });
    expect(insertAt('5', -3, -1, '1')).toEqual({ text: '15', caret: 1 });
  });
});

describe('backspaceAt', () => {
  it('kursordan oldingi belgini o\'chiradi', () => {
    expect(backspaceAt('3/4', 2, 2)).toEqual({ text: '34', caret: 1 });
  });

  it("boshida hech narsa o'chirmaydi", () => {
    expect(backspaceAt('7', 0, 0)).toEqual({ text: '7', caret: 0 });
  });

  it("tanlangan oraliqni o'chiradi", () => {
    expect(backspaceAt('12345', 1, 4)).toEqual({ text: '15', caret: 1 });
  });
});

describe('ekran klaviaturasi belgilari javob formatiga mos', () => {
  it('0–9, vergul, kasr chizig\'i va minus sanitizerdan o\'tadi', () => {
    for (const ch of ['0', '5', '9', ',', '/', '-']) expect(sanitizeOpenInput(ch)).toBe(ch);
  });

  it('minus bilan yozilgan javob son sifatida o\'qiladi', () => {
    expect(numericEquals('-3/4', '−0,75')).toBe(true);
  });
});
