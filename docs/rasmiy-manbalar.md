# Rasmiy qoidalar: nima tasdiqlangan, nima yo'q

Tekshirilgan sana: 2026-10-27 (internetdan tadqiqot). Belgilar: **[R]** rasmiy hujjat, **[U]** uchinchi tomon manbasi.
Rasmiy spetsifikatsiya PDF'ining o'zi to'g'ridan-to'g'ri o'qilmadi, shuning uchun "rasmiy" deb faqat lex.uz qarori belgilandi.

## Tasdiqlangan
| Fakt | Manba |
|---|---|
| 45 topshiriq, 150 daqiqa; 1–32 Y-1, 33–35 Y-2, 36–45 O | [U] infoedu.uz (spetsifikatsiya), oliygoh.uz |
| Y-1: to'g'ri javob 1,3 yoki 2,2 ball; Y-2: 2,2; O: a 1,5 / b 1,7 / ikkalasi 3,2; noto'g'ri javob uchun ball ayirilmaydi | [U] oliygoh.uz, infoedu.uz (2023 tahri; amaldagi tahrirda alohida ball yozilmagan) |
| Bo'limlar bo'yicha topshiriqlar soni (2/11/8/3/4/14/3, jami 45) | [U] infoedu.uz |
| Rasch modeli, 75 ballik shkala, daraja chegaralari (A+ 70, A 65, B+ 60, B 55, C+ 50, C 46; 46 dan past sertifikat yo'q) | [R]+[U] lex.uz, infoedu.uz |
| DTM: A+ va A maksimal ball; B+, B, C+, C sertifikat foiziga proporsional; majburiy fanlarda eng yuqori ball | **[R]** Vazirlar Mahkamasi 2024-yil 10-yanvardagi 17-son qarori (lex.uz/mact/-6749986) |
| Natija test tugagandan 21 ish kunigacha e'lon qilinadi; apellyatsiya 5 ish kuni; sertifikat 3 yil amal qiladi | **[R]** lex.uz |

## Tasdiqlanmagan (faraz sifatida ishlatilgan)
| Nima | Hozirgi qaror | Qayerda |
|---|---|---|
| **Y-2 aniq tuzilishi** (nechta band va variant, qisman ball bormi) | **Har bir Y-2 savolida 3 band + 6 variant (A–F), hammasi to'g'ri bo'lsa 2,2.** Rasmiy namuna boshqacha ko'rinadi, pastdagi "Y-2 tekshiruvi" bo'limiga qarang | `lib/exam/payload.ts`, `lib/exam/scoring.ts` |
| **O javob formati** (kasr/o'nli, yaxlitlash, birlik, minus, vergul/nuqta) | butun, oddiy kasr (`3/4`) va o'nli (`0,75`) son jihatidan teng deb qabul qilinadi; yaxlitlash qilinmaydi | `lib/exam/normalize-answer.ts` |
| Qiyinlik taqsimoti | Y-1: 1–12 L1, 13–27 L2, 28–32 L3 (docs/loyiha.md §5 farazi) | `content/gen/layout.ts` |
| Kalkulyator/qoralama qog'ozi qoidasi | kalkulyator taqiqlangan deb ko'rsatiladi | intro sahifasi |
| **DTM maksimallari 93 / 63 / 11** | uchinchi tomon ([U] infoedu.uz); rasmiy hujjatda to'liq yo'q | `config/dtm.ts` |
| **DTM proporsional formula "ball ÷ 65 × maksimal"** | [U] infoedu.uz (misol: B=55 → 78,69); lex.uz faqat "proporsional" deydi | `config/dtm.ts` |
| 103 ta ishchi mavzu | rasmiy emas, 7 ta rasmiy bo'lim ichida o'zimiz tuzgan taksonomiya | `docs/mavzular.md` |

Zid ma'lumotlar: oliygoh.uz teg sahifasida "75 ball va undan yuqorida 100%" deyilgan (bu 65+ A qoidasiga zid, ishonchsiz deb hisoblandi); 2024-yil 1-martgacha berilgan sertifikatlar uchun eski tizim (86 va undan yuqori maksimal) amal qilmaydi.

## Y-2 tekshiruvi (2026-11-10): raqamlash va tuzilish

Savol: moslashtirish bandlari 0, 1, 2 deb raqamlanadimi (testmakon.uz shunday ko'rsatadi) yoki 1, 2, 3 mi?

**Topilgan (bitta rasmiy namuna asosida, PDF matni ajratib olingan, sahifa rasmi ko'rilmagan):**
- **[R]** Baholash agentligining "Matematika fanidan namunaviy test topshiriqlari" (dtm.uz/page/namuna_m; nusxa: static.oliygoh.uz/uploads/4/matem.pdf, rus tilida: matem_ru.pdf). Blok sarlavhasi: "Topshiriqlar (33-35) va javob variant (A-F) larini o'zaro moslashtiring."
- Blokda **bitta umumiy shart** (6 m uzunlikdagi silindr shaklidagi o'tin, undan eng katta to'g'ri to'rtburchakli ustun yasaladi) va **uchta alohida topshiriq: 33, 34, 35**, har biri **[2,2 ball]**. Uchalasi uchun **bitta umumiy variantlar ro'yxati A–F** (6 ta; 3 tasi to'g'ri, 3 tasi chalg'ituvchi).
- **0/1/2 raqamlash rasmiy namunada yo'q.** Bandlar topshiriq raqamlari bilan (33, 34, 35) belgilanadi. testmakon dagi "0–2" faqat shu saytning o'z belgilashi bo'lishi mumkin; hech qaysi rasmiy matnda uchramadi.
- [U] infoedu.uz: Y-2 ("Moslashtirish (33-35)") barcha topshiriqlari geometriyadan.

**Xulosa:** bizdagi raqamlash (band 1, 2, 3) rasmiy belgilashga zid emas va o'zgartirilmadi. Lekin **tuzilish farqi bor** (tasdiqlash kerak):
- Rasmiy namunada 33, 34, 35 uchta alohida topshiriq bo'lib, bitta umumiy shartni va bitta umumiy A–F ro'yxatini bo'lishadi; har topshiriq bitta band (bitta javob harfi), 2,2 ball.
- Bizda 33, 34, 35 har biri o'z sharti va 3 bandi bilan alohida moslashtirish savoli (jami 9 band), hammasi to'g'ri bo'lsa 2,2 ball.

Tasdiqlanmagani: bu bitta namuna, haqiqiy varaqlar farq qilishi mumkin (variantlar soni va h.k.); blok formati spetsifikatsiyada rasm sifatida, shuning uchun matn qidiruvi bilan tekshirib bo'lmaydi; variant bir marta ishlatilishi mumkinmi (namuna 3 ta to'g'ri + 3 ta ishlatilmaydigan variantga mos). Agar rasmiy format tasdiqlansa, o'zgartiriladigan joylar: `lib/exam/payload.ts` (Y-2 sxemasi), `lib/exam/scoring.ts`, `content/gen/*` (33–35 generatorlari), `components/exam/answer-y2.tsx` va natija/tahlil ko'rinishlari. Bu yirik o'zgarish, shuning uchun qaror foydalanuvchida.

**Qaror (2026-11-10): bizning tuzilish saqlanadi** (har Y-2 savoli o'z sharti va 3 bandi bilan). Rasmiy namunadan farq ma'lum va ataylab qoldirilgan; rasmiy format keyinchalik qayta ko'rib chiqilishi mumkin.

## Rasmiy tasdiq uchun eng ishonchli keyingi qadam
Baholash agentligining rasmiy kanali (@BaholashUz) yoki sayti orqali spetsifikatsiya PDF/rasmlarini olib, Y-2 tuzilishini, O javob qoidalarini va qiyinlik taqsimotini tasdiqlash. Tasdiqlangach faqat `lib/exam/payload.ts`, `lib/exam/normalize-answer.ts` va generatorlar tuzatiladi; format konfiguratsiyada (`config/exam-format.math-v1.ts`).
