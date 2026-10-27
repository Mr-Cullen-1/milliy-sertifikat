import { z } from 'zod';
import { GRADES, type GradeValue } from '../config/participant';

// Kamida ikki so'z (ism + familiya); harflar, defis va o'zbek apostroflari (o', g', o‘, g‘) ruxsat.
const NAME_RE = /^\p{L}[\p{L}'’ʻʼ`.-]*(?:\s+\p{L}[\p{L}'’ʻʼ`.-]*)+$/u;

export const normalizeName = (s: string): string => s.normalize('NFC').trim().replace(/\s+/g, ' ');

/** "90 123 45 67", "+998 (90) 123-45-67", "998901234567" -> "+998901234567"; yaroqsiz bo'lsa ham "+raqamlar" qaytaradi. */
export function normalizePhone(s: string): string {
  let digits = s.replace(/\D/g, '');
  if (digits.length === 9) digits = `998${digits}`;
  return `+${digits}`;
}

// Xato xabarlari lug'at kalitlari (i18n): server amali ularni foydalanuvchi tiliga o'giradi.
export const participantSchema = z.object({
  fullName: z
    .string()
    .transform(normalizeName)
    .pipe(z.string().min(1, 'start.errors.name').max(100, 'start.errors.name').regex(NAME_RE, 'start.errors.name')),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^\+998\d{9}$/, 'start.errors.phone')),
  grade: z.custom<GradeValue>((v) => typeof v === 'string' && GRADES.some((g) => g.value === v), {
    error: 'start.errors.grade',
  }),
  /** Shaxsiy ma'lumotlarni qayta ishlashga rozilik */
  consent: z.literal(true, { error: 'start.errors.consent' }),
});

export type ParticipantInput = z.input<typeof participantSchema>;
export type ParticipantData = z.output<typeof participantSchema>;
