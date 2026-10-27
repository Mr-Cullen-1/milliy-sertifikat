# Kontent: 6 variant (270 savol)

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
    pnpm content:dump      # content/variants/variant-A..F.json ni yozadi
    pnpm content:seed      # bazaga yuklaydi va faqat A ni ochadi (idempotent)

JSON fayllarni admin paneldagi *Yuklash* orqali ham yuklash mumkin. Nashr etilgan mock/savol o'zgarmaydi: tuzatish kerak bo'lsa yangi variant yuklab, eskisini arxivlang.

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
