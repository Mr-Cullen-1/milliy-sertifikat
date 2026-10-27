import { describe, expect, it } from 'vitest';
import { matchesAny, numericEquals, parseNumeric } from '../../lib/exam/normalize-answer';

describe('numericEquals', () => {
  it('kasr va o\'nli yozuvlarni teng deb biladi', () => {
    expect(numericEquals('3/4', '0,75')).toBe(true);
    expect(numericEquals('2', '4/2')).toBe(true);
  });

  it('bo\'sh joy va yunoncha minusga bardoshli', () => {
    expect(numericEquals(' -0.5 ', '−1/2')).toBe(true);
  });

  it('yaxlitlangan qiymatni aniq qiymatga teng deb bilmaydi', () => {
    expect(numericEquals('0.33', '1/3')).toBe(false);
  });
});

describe('parseNumeric', () => {
  it.each(['abc', '', '1/0', '1/2/3', '--1', '1,2,3'])('%j uchun null qaytaradi', (input) => {
    expect(parseNumeric(input)).toBeNull();
  });
});

describe('matchesAny', () => {
  it('qabul qilinadigan shakllardan biriga mos kelsa true', () => {
    expect(matchesAny('0,75', ['3/4'])).toBe(true);
    expect(matchesAny('1', ['3/4', '2'])).toBe(false);
  });

  it('bo\'sh javob yoki kalit uchun false', () => {
    expect(matchesAny(undefined, ['1'])).toBe(false);
    expect(matchesAny('1', undefined)).toBe(false);
    expect(matchesAny('', ['1'])).toBe(false);
  });
});
