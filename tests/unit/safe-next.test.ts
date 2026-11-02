import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/safe-next';

describe('safeNext', () => {
  it("ko'rsatilmasa yoki bosh sahifa bo'lsa imtihonlar ro'yxatiga", () => {
    expect(safeNext(undefined)).toBe('/exams');
    expect(safeNext(null)).toBe('/exams');
    expect(safeNext('/')).toBe('/exams');
  });

  it("ilova ichidagi aniq yo'lni saqlaydi", () => {
    expect(safeNext('/exams/abc')).toBe('/exams/abc');
    expect(safeNext('/history')).toBe('/history');
  });

  it("tashqi manzil, //host va /start ga yo'naltirmaydi", () => {
    for (const v of ['https://evil.example', '//evil.example', 'javascript:alert(1)', '/start', '/start?next=/']) expect(safeNext(v)).toBe('/exams');
  });
});
