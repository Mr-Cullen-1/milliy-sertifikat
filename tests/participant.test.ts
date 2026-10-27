import { describe, expect, it } from 'vitest';
import { normalizePhone, participantSchema } from '../lib/participant';

const valid = { fullName: 'Ali Valiyev', phone: '+998 90 123 45 67', grade: '11', consent: true as const };

describe('normalizePhone', () => {
  it.each([
    ['+998 90 123 45 67', '+998901234567'],
    ['90 123 45 67', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['+998 (90) 123-45-67', '+998901234567'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe('participantSchema', () => {
  it('to\'g\'ri ma\'lumotni normallashtirib qabul qiladi', () => {
    const r = participantSchema.parse({ ...valid, fullName: '  Ali   Valiyev ' });
    expect(r).toEqual({ fullName: 'Ali Valiyev', phone: '+998901234567', grade: '11', consent: true });
  });

  it.each(["Ali Valiyev", "G'ayrat O'ralov", 'Gʻayrat Oʻralov', 'Anna-Mariya Karimova', "Madina Ismoilova Bahodir qizi"])(
    'ism qabul qilinadi: %s',
    (fullName) => {
      expect(participantSchema.safeParse({ ...valid, fullName }).success).toBe(true);
    },
  );

  it.each(['', 'Ali', '   ', 'Ali 123', '12345 67890', 'Ali@Valiyev', 'x'.repeat(101) + ' y'])('ism rad etiladi: %j', (fullName) => {
    const r = participantSchema.safeParse({ ...valid, fullName });
    expect(r.success).toBe(false);
  });

  it.each(['', '123', '+99890123456', '+7 900 123 45 67', 'telefon', '+998 90 123 45 678'])('telefon rad etiladi: %j', (phone) => {
    expect(participantSchema.safeParse({ ...valid, phone }).success).toBe(false);
  });

  it.each(['', '7', '12', 'abc'])('sinf rad etiladi: %j', (grade) => {
    expect(participantSchema.safeParse({ ...valid, grade }).success).toBe(false);
  });

  it('har bir maydon uchun alohida xabar qaytaradi', () => {
    const r = participantSchema.safeParse({ fullName: '', phone: '', grade: '', consent: false });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(new Set(r.error.issues.map((i) => i.path[0]))).toEqual(new Set(['fullName', 'phone', 'grade', 'consent']));
  });

  it("rozilik bo'lmasa rad etiladi, xabar lug'at kaliti", () => {
    const r = participantSchema.safeParse({ ...valid, consent: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('start.errors.consent');
  });

  it('bitirgan qabul qilinadi', () => {
    expect(participantSchema.safeParse({ ...valid, grade: 'bitirgan' }).success).toBe(true);
  });
});
