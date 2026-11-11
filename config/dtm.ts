// DTM (oliy ta'limga qabul) uchun Milliy sertifikat ballini hisoblash qoidalari.
//
// RASMIY (Vazirlar Mahkamasi 2024-yil 10-yanvardagi 17-son qarori, lex.uz):
//   - A+ va A: fan bo'yicha belgilangan maksimal ball
//   - B+, B, C+, C: sertifikat foiziga proporsional ball
//   - majburiy fanlarda: belgilangan eng yuqori ball (darajaga cheklov yozilmagan)
// TEKSHIRUV (2026-11-10, docs/rasmiy-manbalar.md "DTM tekshiruvi"):
//   - fan maksimallari 93 / 63 / 11, jami 189: Oliy ta'lim vazirligi buyrug'i haqidagi rasmiy xabarlarda (gazeta.uz 2025-03-13,
//     oliygoh.uz 2026-05-25); buyruq matnining o'zi lex.uz da topilmadi
//   - proporsional formula ball / 65 * maksimal: rasmiy matnda yo'q (qarorda faqat "umumiy ballga nisbatan foiz asosida proporsional");
//     Agentlik nomidan e'lon qilingan jadvallar (talimxabarlari.uz) va infoedu.uz natijalariga aynan mos (60 -> 92,31%, 55 -> 84,62%, 46 -> 70,77%)
//   - "ball / 75" (testmakon.uz) hech bir manbada tasdiqlanmadi, ishlatilmaydi
//   - yaxlitlash qoidasi rasmiy e'lon qilinmagan: 2 xonagacha ko'rsatamiz (lib/format.ts formatPoints)
//   - 2026-08-19: vazir o'rinbosari "maksimal ball mexanizmi ko'rib chiqilmoqda" degan (qaror yo'q): o'zgarishni kuzatib borish kerak
// Ular o'zgarsa faqat shu faylni tahrirlang.

export type DtmSubject = 'first' | 'second' | 'mandatory';

export const DTM_MAX: Record<DtmSubject, number> = { first: 93, second: 63, mandatory: 11 };

/** Shu va undan yuqori ballda (A, A+) maksimal ball beriladi; proporsional hisoblashda maxraj. */
export const DTM_FULL_SCORE = 65;

/** Sertifikat beriladigan eng past ball (C darajasi quyi chegarasi). */
export const DTM_MIN_SCORE = 46;
