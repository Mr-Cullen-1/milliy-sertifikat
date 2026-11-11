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
| **DTM maksimallari 93 / 63 / 11** | vazirlik buyrug'i haqidagi rasmiy xabarlar bilan tasdiqlangan [U/yangiliklar]; buyruq matni topilmadi ("DTM tekshiruvi" bo'limi) | `config/dtm.ts` |
| **DTM proporsional formula "ball ÷ 65 × maksimal"** | Agentlik jadvallari va infoedu.uz ga mos [U]; rasmiy matn faqat "foiz asosida proporsional" deydi, bo'luvchi va yaxlitlash yo'q | `config/dtm.ts` |
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

## DTM tekshiruvi (2026-11-10)

**Rasmiy matn [R]** (Vazirlar Mahkamasi 2024-yil 10-yanvardagi 17-son qarori, lex.uz/docs/6749986):
- A+ va A: fan uchun belgilangan maksimal ball.
- B+, B, C+, C: "sertifikatdagi umumiy ballga nisbatan foiz asosida ... tabaqalashtirilgan (proporsional) ball". **Raqam, bo'luvchi va yaxlitlash qoidasi yozilmagan.**
- Majburiy fanlar bo'yicha: eng yuqori ball (sertifikatga ega abituriyentga).

**Maksimallar 93 / 63 / 11, jami 189** (1-fan 30 savol × 3,1; 2-fan 30 × 2,1; majburiy fan 10 × 1,1): Oliy ta'lim, fan va innovatsiyalar vazirligi buyrug'i haqidagi rasmiy xabarlarda keltirilgan [U/yangiliklar]: gazeta.uz/oz/2025/03/13/test, oliygoh.uz (2026-05-25: 2026/27 qabulida o'zgarmadi). Buyruq matnining o'zi lex.uz da topilmadi.

**Formula `ball / 65 × maksimal`** [U]: rasmiy matnda yo'q, lekin Agentlik nomidan e'lon qilingan jadval (talimxabarlari.uz/75392: 60 ball → 92,31%, 55 → 84,62%, 46 → 70,77%) va infoedu.uz (60 → 85,84; 55 → 78,69; 46 → 65,81) aynan shunga mos. Bizning `config/dtm.ts` shunday hisoblaydi: **o'zgarish kerak emas**.

**Testmakon "ball ÷ 75" va "92/85/77/71% har daraja uchun"**: hech bir manbada tasdiqlanmadi. 92/85/77/71% aslida daraja quyi chegaralari (60/65, 55/65, 50/65, 46/65), doimiy foiz emas. "÷ 75" ishlatilmaydi (masalan 68 ball = A = to'liq 93).

**Topilgan va tuzatilgan xato:** kalkulyator `points` ni 2 xonaga yaxlitlab (85,85), keyin ekranda yana 1 xonaga yaxlitlardi (85,9). Hech bir manba 85,9 ko'rsatmaydi (haqiqiy qiymat 85,846). Endi 2 xonagacha ko'rsatiladi (`formatPoints`, 85,85). Yaxlitlash qoidasi rasmiy e'lon qilinmagan.

**Kuzatish kerak:** vazir o'rinbosari (2026-08-19, talimxabarlari.uz/77327) maksimal ball mexanizmi "ko'rib chiqilmoqda" degan, qaror yo'q. 2025-oktabr 3515-1 qo'shma buyrug'i eski (2024-mart oldi) sertifikat qoidalarini takrorlaydi ("86 va undan yuqori" va "60–85,9"): Rasch davridagi sertifikatlarga tegishli emas. O'tkazish (transfer) uchun "93 × p% + 11" formulasi qabulga tegishli emas va shubhali.

## Rasmiy spetsifikatsiya bilan taqqoslash (2026-11-10)

Manba: "Matematika fanidan Milliy sertifikat imtihoni spetsifikatsiyasi" (2023-yil 8-fevral tahri), oliygoh.uz/post/matematika-spetsifikatsiyasi da 12 ta rasm sifatida [U-host, rasmiy mazmun]; asl PDF baholash.uz / dtm.uz dan olinmadi. Namuna test: static.oliygoh.uz/uploads/4/matem.pdf [R].

**Mos keladi:** 45 topshiriq, 150 daqiqa; 32 Y-1 + 3 Y-2 + 10 O; bo'limlar bo'yicha 2/11/8/3/4/14/3 va tur taqsimoti (Sonlar 2/0/0, Algebra 11/0/0, Tenglama 6/0/2, Funksiya 2/0/1, Analiz 2/0/2, Geometriya 7/3/4, To'plam 2/0/1) to'liq mos.

**Rasmiy "fan mazmuni tarkibi" (21 mazmun elementi):** 1.1 natural sonlar; 1.2 sonlar ustida amallar (kompleks sonlar bilan); 2.1 daraja va ildiz; 2.2 trigonometriya asoslari; 2.3 ko'rsatkichli va logarifmik funksiya; 2.4 ifodalarning shaklini almashtirish (foiz, matnli masalalar, proporsiya, masshtab, ketma-ketliklar va progressiyalar, algebraik kasrlar, modul); 3.1 tenglamalar; 3.2 tengsizliklar; 4.1 funksiyalar (limit ham); 5.1 to'plam, mulohaza, mantiq; 5.2 ma'lumotlar tahlili; 5.3 kombinatorika; 5.4 ehtimol; 5.5 modellashtirish; 6.1 hosila; 6.2 boshlang'ich funksiya va integral; 7.1 shakl o'lchovlari; 7.2 planimetriya; 7.3 fazoda to'g'ri chiziq va tekislik; 7.4 fazoviy jismlar; 7.5 koordinatalar va vektorlar.

**Farqlar (bizning 103 ishchi mavzu bilan):**
- Yetishmaydi: kompleks sonlar; masshtab; sonli tengsizliklar xossalari; radian va nuqtani burish; ikki o'zgaruvchili tengsizliklar; grafik va taqribiy yechish; hosilaning fizik ma'nosi, normal tenglamasi; mantiq (konversiya, inversiya, kontrapozitsiya, predikat, kvantor, sofizm); standart chetlanish; modellashtirish turlari; Fales va uch perpendikulyar teoremalari; proyeksiyalar; Eyler teoremasi; muntazam ko'pyoqlar; shar segmenti/sektori/qatlami; sfera tenglamasi; kollinear/komplanar vektorlar, bazis bo'yicha yoyish; kesmani nisbatda bo'lish.
- Rasmiy ro'yxatda aniq yo'q: 41 (parametrli tenglamalar), 53 (teskari trig. funksiyalar), 56 (ketma-ketlik limiti), 82 (burish/gomotetiya), 100 (shartli ehtimollik).
- **Joylashuv farqi:** rasmiyda ketma-ketliklar va progressiyalar 2.4 (Algebraik shakl almashtirishlar) ichida, bizda Analiz bo'limida (57/58); rasmiy Analiz faqat hosila va integral; funksiya limiti rasmiyda Funksiyalar ichida; matnli masalalar rasmiyda 2.4 da, bizda Tenglama bo'limida.

**Ball tuzilishi (2023 tahri, jadval):** jami 100 ball: Y-1 1,3 ball (10 ta: 1, 5, 6, 10, 12, 16, 18, 20, 24, 25-topshiriqlar) yoki 2,2 ball (22 ta); Y-2 har biri 2,2; O har topshiriq 3,2 (a 1,5 + b 1,7). Bizda Y-1 1–27 pozitsiya 1,3 va 28–32 pozitsiya 2,2 (jami xom ball 84,7). **Farq bor**, [docs/loyiha.md](loyiha.md) dagi "qiyinlik 1–12 L1, 13–27 L2, 28–32 L3" farazi rasmiy naqshga mos emas (rasmiyda 1,3-ballik topshiriqlar aralash joylashgan, 31–32 esa 2,2). Infoedu: amaldagi tahrirda alohida ball yozilmagan.

**Spetsifikatsiyada yo'q:** kognitiv darajalar foizi (faqat ikki daraja ta'riflangan: quyi va yuqori), O javob formati qoidalari (kasr/o'nli, yaxlitlash, birlik, ishora), kalkulyator/qoralama qoidasi. Namunada yaxlitlash kerak bo'lsa shartda aytiladi (masalan "π = 3 deb oling").

## Rasmiy tasdiq uchun eng ishonchli keyingi qadam
Baholash agentligining rasmiy kanali (@BaholashUz) yoki sayti orqali spetsifikatsiya PDF/rasmlarini olib, Y-2 tuzilishini, O javob qoidalarini va qiyinlik taqsimotini tasdiqlash. Tasdiqlangach faqat `lib/exam/payload.ts`, `lib/exam/normalize-answer.ts` va generatorlar tuzatiladi; format konfiguratsiyada (`config/exam-format.math-v1.ts`).
