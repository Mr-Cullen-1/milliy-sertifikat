// DTM (oliy ta'limga qabul) uchun Milliy sertifikat ballini hisoblash qoidalari.
//
// RASMIY (Vazirlar Mahkamasi 2024-yil 10-yanvardagi 17-son qarori, lex.uz):
//   - A+ va A: fan bo'yicha belgilangan maksimal ball
//   - B+, B, C+, C: sertifikat foiziga proporsional ball
//   - majburiy fanlarda: belgilangan eng yuqori ball (darajaga cheklov yozilmagan)
// UCHINCHI TOMON (rasmiy hujjatda to'liq yozilmagan, taxminiy):
//   - fan maksimallari 93 / 63 / 11 (infoedu.uz)
//   - proporsional formula: ball / 65 * maksimal (infoedu.uz; 65 = A darajasi quyi chegarasi)
// Ular o'zgarsa faqat shu faylni tahrirlang.

export type DtmSubject = 'first' | 'second' | 'mandatory';

export const DTM_MAX: Record<DtmSubject, number> = { first: 93, second: 63, mandatory: 11 };

/** Shu va undan yuqori ballda (A, A+) maksimal ball beriladi; proporsional hisoblashda maxraj. */
export const DTM_FULL_SCORE = 65;

/** Sertifikat beriladigan eng past ball (C darajasi quyi chegarasi). */
export const DTM_MIN_SCORE = 46;
