# Kontent: 15 variant (A–F: 270 savol; G–O: 405 savol) va mashq zaxirasi

## Qoida
Savollar **original**: haqiqiy imtihon savollari internetdan yoki "tushgan savollar"dan ko'chirilmagan. Faqat rasmiy mavzular ([docs/mavzular.md](mavzular.md)), qiyinlik darajalari va format ([docs/rasmiy-manbalar.md](rasmiy-manbalar.md)) bo'yicha parametrli shablonlar orqali yaratilgan.
Relizdan keyin mutaxassis tekshiruvidan o'tishi kerak (pastdagi ro'yxat).

## Qanday yaratiladi
- [content/gen/](../content/gen/): har blok uchun generator (`sonlar`, `algebra`, `tenglama`, `funksiyalar`, `analiz`, `toplam`, `geometriya` = planimetriya + stereometriya). Har bir savol parametrlardan **kod bilan** hisoblanadi (javob kaliti qo'lda yozilmagan), chalg'ituvchi variantlar tipik xatolardan hosil qilinadi, chizmalar (geometriya, statistika) SVG sifatida kod bilan chiziladi.
- [content/gen/layout.ts](../content/gen/layout.ts): 45 pozitsiya tartibi. 1–2 sonlar, 3–13 algebra, 14–19 tenglama, 20–21 funksiyalar, 22–23 analiz, 24–30 geometriya, 31–32 to'plam/ehtimollik (Y-1); 33–35 geometriya (Y-2); 36–45 O. Qiyinlik: 1–12 L1, 13–27 L2, 28–32 L3; Y-2 L2/L3/L3; O 36–38 L2, qolgani L3.
- Har savol 4 tilda: o'zbek (asosiy), rus, qoraqalpoq (lotin), ingliz. Raqamlar, kalit va variant harflari tillarda bir xil, faqat matn tarjima qilinadi.
- Shablonlar soni: sonlar 11, algebra 26 (21 L1 + 5 L2), tenglama/funksiyalar, analiz 19, to'plam 16, planimetriya 17, stereometriya 23.

## Avtomatik tekshiruvlar (`pnpm test`)
Har savol uchun: KaTeX (strict) formulalari yaroqli, literal `$` yo'q, `undefined/NaN` qoldig'i yo'q, 4 tilda matn va yechim bor, kalit payload'ga mos, tarjima tuzilishi bir xil, SVG xavfsiz, mavzu blokka tegishli, qiyinlik so'ralganiga teng. Har blok uchun javoblar **mustaqil usul** bilan qayta hisoblanadi (sonli integrallash, bissektsiya, to'g'ridan-to'g'ri sanash, determinant va h.k.). 6 variantda (matn+variantlar) takrorlanish yo'q. Har variant to'liq import sxemasidan o'tadi (45 savol, 32/3/10, bo'limlar 2/11/8/3/4/14/3).

## Variantlarni qayta yaratish va yuklash
    pnpm content:dump      # content/variants/variant-A..O.json ni yozadi
    pnpm content:seed      # bazaga yuklaydi va faqat A ni ochadi (idempotent)

JSON fayllarni admin paneldagi *Yuklash* orqali ham yuklash mumkin. Nashr etilgan mock/savol o'zgarmaydi: tuzatish kerak bo'lsa yangi variant yuklab, eskisini arxivlang.

## Mashq zaxirasi
Mock variantlardan (A–F = variant 0..5) **alohida** savol zaxirasi: `pool: 'practice'`. Xuddi shu parametrli generatorlar (`content/gen/pool.ts`) 45 pozitsiyalik haqiqiy tartib bilan variant raqamlari 6..45 uchun ishga tushiriladi. Savollar mockka hech qachon kirmaydi (bazada trigger to'sadi), import paytida darrov nashr etiladi. `external_id` = `gen-P006-01` ko'rinishida (variant raqami + pozitsiya), `source` = `gen:pool-v1`. Takrorlar (matn + variantlar bo'yicha) pool ichida ham, mock A–F bilan ham olib tashlanadi; xato bergan shablon o'rni o'tkazib yuboriladi. Natija deterministik.

    pnpm content:pool                      # content/pool/pool-001.json ... va summary.json (gitignore'da)
    pnpm content:pool:seed -- --dry-run    # faqat tekshiradi va sanaydi (tarmoqsiz)
    pnpm content:pool:seed                 # bazaga yuklaydi (50 tadan; external_id bo'yicha idempotent)

Joriy hajm (40 variant, `content/pool/summary.json`): 1711 savol (7 ta o'tkazib yuborilgan, 82 takror olib tashlangan). Bloklar: sonlar 80, algebra 437, tenglama 318, funksiyalar 119, analiz 150, geometriya 494, to'plam 113. Qiyinlik: L1 477, L2 753, L3 481; 103 mavzudan 94 tasi qamralgan. Qiyinlik bloklar tartibi bilan cheklangan: sonlar faqat L1, algebra asosan L1, tenglama/funksiyalar L2, to'plam L3. Ko'proq savol kerak bo'lsa `buildPool({ variants })` ni oshiring (mavjud `external_id` lar o'zgarmaydi).

## Yangi mock variantlar G–O (rasmiy joylashuv)
A–F (nashr etilgan, o'zgarmaydi) eski ishchi bo'lim diapazoni bo'yicha tuzilgan. **G–O** (9 ta, `content/gen/mock-official.ts`) esa Variant A tuzilishida (45 savol: 32 Y-1 / 3 Y-2 / 10 O, qiyinlik joylashuvi `layout.ts` dan) va **rasmiy bo'lim joylashuvida**: savol mavzusi shu slot bo'limining rasmiy elementidan bo'lishi shart (`config/elements.ts`, `officialBlocksOf`).
- Progressiya (56–58), matnli masala (42), foiz (8), nisbat (7), masshtab (105) faqat **Algebra** slotlarida (2.4); Analiz faqat hosila va integral (60–66) va hosilaning fizik ma'nosi (110); Sonlar faqat 1.x (1–6, 9–11); limit (59) rasmiy bo'yicha Funksiyalar elementiga tegishli, shuning uchun Analiz slotiga qo'yilmaydi.
- Slotni mavjud generatorlar bilan to'ldirish: rasmiy joylashuvga mos kelmagan yoki takror nomzod tashlanadi, keyingi urinish (variant raqami + tub qadam 17) olinadi. Algebra Y-1 ning 9–10-slotlariga (indeks 8, 9) oddiy 2.4 shablonlari aylantirib qo'yiladi (`mock-templates.ts`: progressiya, ish, harakat, masshtab; `sonlar`: nisbat, foiz); Analiz Y-1 ning 2-slotida 3 variantda (H, K, N) fizik ma'no (110).
- Savollar mashq zaxirasi (variantlar 6..45) va qo'shimcha shablonlar (`content/gen/extra`) bilan hamda A–F va o'zaro takrorlanmaydi (imzo bo'yicha, test tekshiradi). Bir variantda bo'lim/tur ichida mavzular iloji boricha takrorlanmaydi.
- Fayllar: `content/variants/variant-G.json … variant-O.json` (`pnpm content:dump`). `pnpm content:seed` ularni **qoralama** sifatida yuklaydi; nashr admin paneldan, mutaxassis tekshiruvidan keyin.
- Testlar: `tests/content/mock-official.test.ts` (tuzilish, rasmiy joylashuv, takrorlanmaslik, fayllar yangiligi), `tests/content/mock-templates-math.test.ts` (kiritilgan oddiy shablonlar javobi mustaqil usul bilan).
- **Mutaxassis tekshiruvidan o'tmagan.** Mavzu-element moslashtirish (config/elements.ts) taxminiy; G–O savollari mavjud generatorlar natijasi (ularning mustaqil testlari A–F parametrlarida yuritiladi).

## Relizdan keyin tekshirish ro'yxati (mutaxassis uchun)
1. **Yechimlar va kalitlar**: avtomatik tekshiruv yopiq-shakl bilan solishtiradi, lekin pedagogik to'g'rilik (savol qo'yilishi, bir ma'noli ekani, imtihon darajasiga mosligi) odam ko'zi bilan tekshirilishi kerak. Admin paneldagi variant tafsilotida har savol bo'yicha haqiqiy "to'g'ri %" ko'rinadi: keskin chetlanganlarni birinchi tekshiring.
2. **Qiyinlik**: L1/L2/L3 taqsimoti [docs/loyiha.md §5](loyiha.md) farazi; haqiqiy imtihon darajasiga kalibrovka beta natijalaridan keyin.
3. **Chizmalar**: o'lchamlar haqiqiy masshtabda emas (shakl turi va yorliqlar to'g'ri), ayrimlarida burchak sxematik (masalan bissektrisa chizmasida A=70°).
4. **Tarjimalar**: ru va en tekshirilsin; **qoraqalpoq (kaa) tarjimasi ona tili egasi tomonidan albatta tekshirilishi kerak**. Generatorlar kodida `// kaa: tekshirilsin` izohi bor. Shubhali atamalar:
   - arifmetika/algebra: bólim/alım (maxraj/surat), aǵza (had), uqsas aǵzalar, qospa ańlatpa, irracionallıq, sherek (chorak), jýiklew (yaxlitlash), dawırlı bólshek, EKUB/EKUK (eń úlken ulıwma bóliwshi / eń kishi ulıwma eselik), swm (so'm), procent
   - geometriya: sheńber/dóńgelek, teń jambaslı, jan tárep, orta sızıq, orayılıq múyesh, kesiwshi, urınba, xorda, biyiklik, tiykar, maydan, kópmúyeshlik, burıw; ayqas, kósher kesimi, jasawshı, cilindr, durıs tórtmúyeshli piramida, jan bet maydanı, tolıq bet maydanı, skalyar kóbeyme, dene
   - analiz/to'plam: úyirme (to'plam), tastıyıq (mulohaza), oyın kubigi, sheksiz kemeyiwshi geometriyalıq progressiya, tosattan, kóp ushın jiyilik, qatań teńsizlik, jup/taq
5. **Y-2 va O formati** rasmiy PDF bilan solishtirilsin ([docs/rasmiy-manbalar.md](rasmiy-manbalar.md)).

## Cheklovlar
- Bir variantda ayrim shablon 2 marta uchrashi mumkin (parametrlar har safar boshqa); bu 6 variantda takror savol bermaydi (test tekshiradi).
- Y-1 javoblari o'nli bo'lsa 2 xonagacha yaxlitlangan; O savollarning javoblari aniq (butun/oddiy kasr/chekli o'nli).
