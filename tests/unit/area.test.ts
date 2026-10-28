import { describe, expect, it } from 'vitest';
import { PARTICIPANT_COOKIE, areaOf, cookieOptionsFor } from '@/lib/supabase/area';

describe('sessiya hududlari', () => {
  it("/admin va uning ichki yo'llari admin hududi, qolganlari ishtirokchi", () => {
    for (const p of ['/admin', '/admin/login', '/admin/exams/abc']) expect(areaOf(p)).toBe('admin');
    for (const p of ['/', '/exams', '/attempts/1/result', '/administrator', '/start']) expect(areaOf(p)).toBe('app');
  });

  it("admin standart cookie nomini, ishtirokchi alohida nomni ishlatadi", () => {
    expect(cookieOptionsFor('admin')).toBeUndefined();
    expect(cookieOptionsFor('app')).toEqual({ name: PARTICIPANT_COOKIE });
    expect(cookieOptionsFor(null)).toEqual({ name: PARTICIPANT_COOKIE });
  });
});
