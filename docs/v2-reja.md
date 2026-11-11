# V2 reja: testmakon.uz bilan solishtirish asosida

Sana: 2026-11-10. Holat: **reja (qaror kutilmoqda)**; 7-bo'lim UI bandlarining bajarilgani 7.9 jadvalida.

## 1. Maqsad va manba

V1 (joriy holat: CLAUDE.md, docs/loyiha.md) Milliy sertifikat matematika bo'yicha to'liq mock imtihon platformasi. V2 uchun testmakon.uz ning **faqat DTM va Milliy sertifikat matematika** qismi o'rganildi va bizda yo'q imkoniyatlar ro'yxati tuzildi.

Ishonchlilik bo'yicha eslatma:
- Ma'lumot 6 ta ochiq sahifadan olingan (bosh sahifa, /milliy-sertifikat/, /dtm-test/, /tests/practice/matematika/, /subscriptions/pricing/, /tests/). Matn model orqali ajratib olingan, aniq raqamlar qo'lda tekshirilmagan.
- `/certificate/matematika/` (ularning 49 ta matematika varianti) ochilmagan: ularning savol soni, taymeri va ball hisobi noma'lum.
- Ularning o'zida ziddiyatlar bor: matematika savollari 1286 va 1124; bepul mashq "birinchi 3 ta test" va "to'liq bepul". Qaror qilishdan oldin jonli sayt qo'lda tekshirilsin.
- Biz ularning savollarini, matnlarini yoki dizaynini ko'chirmaymiz (loyiha kelishuvi: faqat original kontent).

## 2. Bizda yo'q imkoniyatlar (to'liq ro'yxat)

### Mashq va kontent
| # | Imkoniyat | Ularda | Bizda |
|---|---|---|---|
| 1 | Mavzu bo'yicha mashq | 14 mavzu, 1124 savol; savol soni 5–200, qiyinlik (oson/o'rta/qiyin/barchasi), rejim (oddiy / vaqt bilan / imtihon), aralash | Yo'q, faqat to'liq 45 talik variant |
| 2 | Tezkor test, Savol banki | Bor | Yo'q |
| 3 | Hajm | 49 ta matematika varianti | 6 ta variant (270 savol) |
| 4 | Saqlangan savollar | Bor | Yo'q |
| 5 | Kutubxona | 17 ta matematika darsligi, PDF to'plamlar | Yo'q |

### DTM
| # | Imkoniyat | Ularda | Bizda |
|---|---|---|---|
| 6 | DTM simulyatsiya | 5 fan, 90 savol, 3 soat, 189 ball | Faqat kalkulyator (/dtm) |
| 7 | Sertifikatlarim | Foydalanuvchi sertifikatini qo'shadi, simulyatsiyada shu fan bloki o'tkaziladi va ball qo'shiladi | Yo'q |
| 8 | Universitet vositalari | O'tish ballari 2026, katalog (104 OTM, 3415 yo'nalish), o'tish bali tekshirgichi, hududlar, kesimlar, tavsiya, GPA kalkulyator | Yo'q |

### AI
| # | Imkoniyat | Ularda | Bizda |
|---|---|---|---|
| 9 | AI Mentor (chat), AI Ustoz | Bor | Yo'q |
| 10 | AI tahlil | Zaif mavzular foizlar bilan, tushuntirish | Qisman: eng past natijali mavzular ro'yxati bor, tushuntirish yo'q |
| 11 | O'quv reja | Shaxsiy reja | Yo'q |

### Raqobat
| # | Imkoniyat | Ularda | Bizda |
|---|---|---|---|
| 12 | Reyting | Umumiy, maktab/tuman/viloyat bo'yicha | Yo'q |
| 13 | Duellar, turnirlar, musobaqalar | 1v1, haftalik turnir, sovrinlar | Yo'q |
| 14 | O'yinlar, Respublika sinovi | Bor | Yo'q |

### Akkaunt va savdo
| # | Imkoniyat | Ularda | Bizda |
|---|---|---|---|
| 15 | Akkaunt | Telegram orqali kirish, profil | Login yo'q (mehmon hisob, docs/auth.md) |
| 16 | To'lov | 1 hafta 15 000, 1 oy 40 000, 3 oy 75 000, 6 oy 135 000 so'm (3 va 6 oyda 90 000 / 180 000 ham ko'rinadi, ehtimol eski narx); Payme/Click; chek orqali; promo-kod | Pro tugmasi bor, to'lov yo'q (`profiles.is_pro` qo'lda beriladi) |
| 17 | Bepul sinovlar | O'quv reja va xato javoblar 2×, AI tahlil 1× | Tahlilda 5 ta bepul |

### Atrofdagi narsalar
| # | Imkoniyat | Ularda | Bizda |
|---|---|---|---|
| 18 | Telegram bot va kanal | Sanalar, natijalar haqida xabar | Yo'q |
| 19 | Kontent sahifalar | Yangiliklar, qo'llanmalar, 2026 sanalari, natijalar qachon chiqadi, FAQ (SEO) | Faqat /privacy |
| 20 | Interfeys | Mobil pastki panel (tungi rejim 2026-11-10 da rejadan chiqarilgan) | Pastki panel bajarilgan |
| 21 | O'zbek kirill tili | Bor | Yo'q (uz-lotin, ru, kaa, en bor) |

### Qisman bor
- Xatolar daftari: bor (bizda 5 ta tahlil bepul).
- DTM kalkulyator: bor, lekin formulalar farq qiladi (bizda ÷65 va 93/63/11, ularda "ball ÷ 75"). Bu rasmiy manba bilan tekshirilishi kerak (docs/rasmiy-manbalar.md).

### Bizda bor, ularda ko'rinmadi
Qoraqalpoq va ingliz tillari, natijalar doim "taxminiy" deyilishi, tab-almashtirish logi, suv belgisi, to'liq admin paneli, JSON import, server taymeri, original kontent generatorlari.

## 3. Takliflangan bosqichlar

Tartib: imtihon platformasining asosiy qiymatiga eng yaqin va eng arzon narsalardan boshlab. Bu taklif, qaror emas.

### Bosqich 1: kontent va mashq (eng katta foyda, mavjud bazaga tayanadi)
1. **Mavzu bo'yicha mashq.** Savollar bazada allaqachon mavzuga bog'langan (docs/mavzular.md: 7 bo'lim, 103 ishchi mavzu). Qo'shiladigan narsalar: mavzu va savol soni tanlash, qiyinlik, "oddiy / vaqt bilan / imtihon" rejimi, natija va tahlil.
2. **Variantlar sonini ko'paytirish** 6 dan 15+ gacha (docs/loyiha.md da rejalashtirilgan). `content/gen/*` generatorlari, javoblar kod bilan hisoblanadi, mutaxassis tekshiruvi shart.
3. **Saqlangan savollar** (belgilab qo'yib keyin ko'rish).
4. Mobil navigatsiya (bajarilgan). Tungi rejim rejadan chiqarilgan (2026-11-10).

### Bosqich 2: DTM
5. **DTM kalkulyatorni tekshirish va to'g'rilash.** ÷65 va ÷75 farqini rasmiy manbalar bilan aniqlash. Natija noto'g'ri bo'lsa, foydalanuvchiga yolg'on ball ko'rsatamiz, shuning uchun bu 6-bandgacha bajarilsin.
6. **DTM simulyatsiya** (5 fan, 90 savol) uchun avval qaror kerak: faqat matematika loyihasi doirasida qolamizmi (Q1 ga qarang). Aks holda boshqa fanlar kontenti kerak bo'ladi.
7. **Sertifikatni qo'shish** (faqat 6-band qilinsa ma'noli).

### Bosqich 3: tahlil va shaxsiylashtirish
8. **Zaif mavzular sahifasi** (foiz va tavsiya, mavjud statistikaga tayanadi).
9. **O'quv reja:** zaif mavzular va imtihon sanasiga qarab qoidalar asosidagi reja (AI siz ham mumkin).
10. **AI Mentor / tushuntirish** (LLM). Narxi, noto'g'ri foydalanishdan himoya (limit) va javob to'g'riligi alohida baholanadi (4-bo'lim, Q2).

### Bosqich 4 (akkaunt, login, to'lov) va Bosqich 5 (reyting, musobaqa, Telegram, SEO sahifalar, universitet vositalari, kirill tili): **REJADAN CHIQARILGAN** (2026-11-10)
Foydalanuvchi qarori: bu bosqichlar umuman kerak emas. Loyiha loginsiz ichki platforma bo'lib qoladi, savdo va ijtimoiy qatlam qilinmaydi. 2-bo'limdagi tegishli bandlar (12–19, 21) bajarilmaydi.

## 4. Qarorlar (kutilmoqda)

| # | Savol | Variantlar |
|---|---|---|
| Q1 | Doira: faqat matematika yoki DTM ning boshqa fanlari ham? | (a) faqat matematika, DTM simulyatsiya yo'q; (b) DTM da faqat matematika bloki; (c) ko'p fanli (kontent hajmi bir necha barobar) |
| Q2 | AI mentor kerakmi va qaysi model/byudjet? | Yo'q / qoidalar asosidagi reja / LLM |
| Q3 | Login qo'shilsinmi? | **Yo'q** (Bosqich 4 rejadan chiqarilgan) |
| Q4 | Savdo qilinadimi? | **Yo'q** (Bosqich 4 rejadan chiqarilgan) |
| Q5 | Mavzu mashqi bepul/Pro chegarasi | Masalan: hamma mavzu ochiq, tahlil 5 ta bepul (hozirgi mantiq bilan mos) |

> **Qolgan ishlar (2026-11-10):** Bosqich 1 (mavzu bo'yicha mashq, 1D mock variantlarni 15 taga yetkazish), Bosqich 2 (DTM kalkulyatorni rasmiy qoidaga keltirish), Bosqich 3 (zaif mavzular, o'quv reja). Qo'shimcha talab: barcha savol/test/mock rasmiy DTM yoki Bilimni baholash agentligi metodikasiga asoslanishi, mutaxassis tekshiradi (8-bo'lim).

## 5. Xavflar

- **Kontent:** ko'p savol = tekshiruv yuki. Har yangi variant mutaxassis tekshiruvidan o'tishi kerak (docs/content.md). Nashr etilgan savol o'zgarmaydi: xato topilsa yangi variant yuklanadi.
- **Rasmiy ma'lumotlar:** DTM/Milliy sertifikat qoidalari va ballari o'zgarishi mumkin, uchinchi tomon raqamlari tasdiqlanmagan (docs/rasmiy-manbalar.md). Natijalar doim "taxminiy".
- **Ko'chirish:** raqobatchi savollari, matnlari va dizayni ko'chirilmaydi.
- **AI:** noto'g'ri yechim berishi mumkin. Matematika tushuntirishida bu jiddiy xavf, savol kaliti (kod bilan hisoblangan javob) bilan tekshirib turish kerak.

## 6. Birinchi qadam (taklif)

1. Q1–Q5 qarorlarini belgilash.
2. DTM kalkulyator formulasini rasmiy manbalar bilan tekshirish (bosqich 2, 5-band): kichik, lekin to'g'rilik uchun muhim.
3. Mavzu bo'yicha mashq (bosqich 1, 1-band): eng katta foyda, mavjud bazaga tayanadi.
4. `/certificate/matematika/` sahifasini ko'rib, ularning matematika mock formati (taymer, ball hisobi, savol soni) bilan o'zimizniki taqqoslanadi.

## 7. Aniq reja: imtihon va natija interfeysi (UI)

Manba: testmakon.uz bilan desktop va mobil (iPhone 16, 393×852) skrinshotlarini solishtirish, 2026-11-10. Holat: **7.9 jadvalida belgilangan bandlar bajarilgan, qolganlari reja**. Hammasi uchun qoida: **scrollsiz imtihon ekrani** (1440×900 va 1366×680) buzilmaydi, mobilda esa vertikal joy tejaladi. Pro mantig'iga tegilmaydi.

### 7.1 Joriy mobil holat (kod bo'yicha)
- Sarlavha **ikki qatorli** ([exam-runner.tsx](../components/exam/exam-runner.tsx)): 1-qator nom + "Kalkulyator taqiqlangan" (ekranda "Kalkulyator taqi…" kesilib qoladi) + taymer + Topshirish; 2-qator progress + "Saqlandi" + til. Balandligi taxminan 110px, ularniki taxminan 60px.
- "Barcha savollar" `<details>` sifatida savol kartasi **ostida**: ochilganda sahifa pastga cho'zilib scroll paydo bo'ladi.
- Pastki panel: Orqaga | Belgilash | Keyingi.
- Natija kartasi (yashil) mobilda taxminan 290px: sarlavha, maqtov matni, xom ball, "TAXMINIY DARAJA" + katta "≈ 0 / 75", izoh.
- Savollar tahlili sahifaning eng pastida (bo'limlar kartasidan keyin).

### 7.2 Mobil imtihon ekrani (1-ustuvorlik)

**UI-1. Sarlavhani bitta qatorga keltirish.** Mobilda: [nom] [taymer] [Topshirish]; ostida ingichka (taxminan 4px) progress chizig'i. "Saqlandi" matni o'rniga kichik belgi (nuqta/galochka), matn faqat "Saqlanmoqda…" va "Oflayn" holatlarida chiqadi. "Kalkulyator taqiqlangan" va til almashtirgich yon panelga (UI-2) ko'chadi. Qabul mezoni: sarlavha balandligi ≤ 64px; taymer ogohlantirishlari (`warn5`, `finishing`) avvalgidek ko'rinadi.

**UI-2. "Barcha savollar" yon panelga.**
- Pastki panelda uch teng tugma: **Orqaga | ⊞ (javob berilgan/45 nishoni bilan) | Keyingi**. `<details>` olib tashlanadi.
- ⊞ bosilganda panel **o'ng tomondan** ochiladi (desktopda savollar paneli ham o'ngda, shuning uchun bir xil). Orqa fon umumiy modal uslubida (kuchli blur). Yopilishi: tashqarisiga bosish, Esc, savolni tanlash. Native `<dialog>` ishlatiladi (fokus tuzog'i tayyor), kirish animatsiyasi `prefers-reduced-motion` ga hurmat bilan.
- Panel ichida: imtihon nomi, "150 daqiqa", "Kalkulyator taqiqlangan", til almashtirgich, bo'limlar bo'yicha guruhlangan raqamlar (UI-6), legenda. Eni `min(86vw, 360px)`, ichida kerak bo'lsa scroll.
- Takrorlanishni oldini olish: progress soni faqat ⊞ nishonida (sarlavhada son yo'q, faqat chiziq).
- Desktopdagi o'ng panel o'zgarmaydi; ikkalasi bitta `Navigator` komponentidan foydalanadi.

**UI-3. Belgilash savol kartasining yuqori o'ng burchagiga (bayroq belgisi).**
- Faqat ikonka (`Flag`), 44×44px bosish maydoni, belgilanganda to'ldirilgan/oltin rang, `aria-pressed` va `aria-label` saqlanadi. Pastki paneldan olib tashlanadi.
- Qaror Q6: faqat mobilda yoki hamma o'lchamda? Tavsiya: **hamma o'lchamda bir xil**. Desktopda karta yuqori o'ng burchagi bo'sh, joy yemaydi, pastki panel esa yengillashadi.

**UI-14 (ixtiyoriy). Savol sarlavhasi chiplari mobilda bir qatorda.** Hozir "1-topshiriq · Yopiq test · Sonlar va amallar" ikki qatorga o'tadi. Mobilda mavzu nomi yashiriladi (rasmiy imtihonda ham mavzu ko'rsatilmaydi), faqat "1-topshiriq · Yopiq test" qoladi.

### 7.3 Natija sahifasi (1-ustuvorlik)

**UI-4. Yashil kartani mobilda ikki barobar past qilish** (taxminan 290px dan ≤ 145px gacha).
- Tuzilma: 1-qatorda chapda sarlavha (taxminan 22–24px), o'ngda "≈ 0 / 75" va daraja nishoni; 2-qatorda xom ball; 3-qatorda maqtov matni bitta qatorda (kesiladi). Ajratuvchi chiziq va katta "TAXMINIY DARAJA" sarlavhasi olib tashlanadi, o'rniga ≈ belgisi yonida kichik "taxminiy" yozuvi (natija doim taxminiy: loyiha qoidasi).
- Daraja berilmaganda ("46 balldan past") matn qisqa bo'lib, shu karta ichida qoladi.
- Desktop: karta allaqachon bir qatorli, faqat balandligi tekshiriladi (maqsad: u ham ≤ 130px).
- Fayl: [result/page.tsx](../app/attempts/%5BattemptId%5D/result/page.tsx).

**UI-5. "Savollar tahlili ↓" tugmasi.** Kartadan keyin (mobilda), pastga qaragan strelka bilan; bosilganda tahlil bo'limiga (`#review`) silliq o'tadi (`<a href>`, JS shart emas; sticky sarlavha uchun `scroll-margin-top`; `prefers-reduced-motion` da silliq o'tish o'chiriladi). **Desktopda ko'rsatilmaydi** (`lg:hidden`), chunki u yerda tahlil o'ng ustunda allaqachon ko'rinib turadi. Topshirgandan keyin avtomatik ochiladigan 1-savol oynasi yopilgach, tugma ko'rinadi.

### 7.4 Desktop va umumiy (2-ustuvorlik)

**UI-6. Navigatorda bo'limlar sarlavhalari** (1-qism · Yopiq test 1–32, 2-qism · Moslashtirish 33–35, 3-qism · Ochiq javob 36–45) va legendada **"Joriy"** belgisi. Desktop panel balandligi cheklangan (1366×680), shuning uchun sarlavhalar bir qatorli bo'lishi va scrollsiz sig'ishi tekshiriladi. Mobil panel (UI-2) ham shu komponentdan foydalanadi.

**UI-7. Klaviatura.** Y-1: A–D javob; Y-2: faol bandga A–F; ←/→ savollar orasida; yozish maydonida (O) o'chiriladi. "Belgilash" uchun harfli tugma biriktirilmaydi (F varianti Y-2 da band). Pastki panelda faqat desktopda: "Klaviatura: A–D javob, ←→ navigatsiya" (Q6 hal bo'lib, belgilash kartaga ko'chsa, shu joy bo'shaydi).

**UI-8. Y-2 va O uchun bir qatorli ko'rsatma.** Y-2: "Bandlarga mos javobni (A–F) tanlang"; O: hozirgi `answers.openRule` qoidasi saqlanadi. Y-1 uchun alohida bo'lim kartasi **qo'shilmaydi** (joy yeydi).

**UI-9. O (ochiq javob) uchun telefon kiritishi.** `inputMode="decimal"` (raqamli klaviatura) + bir qatorli chiplar: **`−`**, **`/`** (kerak bo'lsa `,`). Chiplar kursor o'rniga qo'shadi va `sanitizeOpenInput` orqali o'tadi. π, √, x², ° **qo'shilmaydi**: rasmiy O javob formati faqat son (docs/rasmiy-manbalar.md).

**UI-10. Topshirish oynasida uch son:** javob berilgan / javobsiz / belgilangan (ularda shunday). Hozirgi ixcham oyna va tugmalar saqlanadi.

### 7.5 Tekshirish va qarorlar (3-ustuvorlik)

- **UI-11.** Y-2 bandlari raqamlanishi: ularda 0, 1, 2; bizda 1, 2, 3. Rasmiy imtihon formatiga qarab to'g'rilanadi (hozircha manbada tasdiq yo'q).
- **UI-12. Mobil pastki navigatsiya paneli** (imtihondan tashqari sahifalar uchun): Imtihonlar | Natijalarim | Xatolar daftari | DTM, hozirgi hamburger menyuni almashtiradi. Qaror Q7. Ularda 6 ta bo'lim (Bosh, AI, Test, O'yin, Avto, Profil), bizda 4 ta bo'lishi kifoya.
- **UI-13.** iPhone pastki chizig'i uchun `env(safe-area-inset-bottom)` va `viewport-fit=cover` ni tekshirish; haqiqiy qurilmada ko'rish.
- **UI-15. 7 kunlik o'quv reja sahifasi** (3-bosqich, 9-band bilan birga): vertikal qadamlar chizig'i, har qadamda "savol soni · taxminiy daqiqa", oxirgi qadam "Nazorat testi: 45 savol, 150 daqiqa", "Xatolar ustida ishlash" qadami, "Imtihongacha N kun" hisoblagichi (imtihon sanasi rasmiy manbadan olinadi; testmakon dagi 23–24-noyabr tasdiqlanmagan). Reja zaif mavzulardan qoidalar asosida tuziladi (AI shart emas).

### 7.6 Ataylab OLINMAYDIGAN narsalar
Y-1 uchun bo'lim kartasi (mobil joyni yeydi), ogohlantirish ikonkasi va "Keyinroq davom etish" (bizda taymer serverda, vaqt to'xtamaydi), π/√/x²/° paneli, ularning yorqin yashil "Yakunlash" tugmasi, hamburger + logo sarlavhasi, AI/O'yin/Avto bo'limlari, har joydagi "Premium" qulf nishonlari, scroll qilinadigan sahifa va ustma-ust javoblar.

### 7.7 Qabul tekshiruvi (har bir UI bandi uchun)
393×852 (iPhone 16), 1440×900 va 1366×680: Y-1, Y-2 va O savollarida scrollsiz (desktop) / ortiqcha vertikal joysiz (mobil); 4 tilda matn sig'adi (ru va kaa uzunroq); `pnpm typecheck`, `lint`, `test`, `build`; tests/ui dagi tegishli testlar yangilanadi.

### 7.8 Ochiq qarorlar
| # | Savol | Tavsiya |
|---|---|---|
| Q6 | Bayroq (belgilash) faqat mobilda kartaga ko'chadimi yoki hamma o'lchamda? | Hamma o'lchamda |
| Q7 | Mobil pastki navigatsiya paneli (UI-12) kerakmi? | Keyinroq, 1-ustuvorlik bandlaridan keyin |

### 7.9 Bajarilgan (2026-11-10, kodda; commit qilinmagan)

| Band | Holat | Izoh |
|---|---|---|
| UI-1 sarlavha | Bajarildi | Mobilda bitta qator + ingichka progress; balandlik 72px dan 64px ga tushdi (brauzerda o'lchandi). "Saqlandi" = yashil nuqta, "Saqlanmoqda" = yonib-o'chuvchi nuqta, faqat oflayn/vaqt tugashida matn |
| UI-2 yon panel | Bajarildi | O'ng tomondan ochiladigan `<dialog>`, orqa fon blur; ichida nom, "Kalkulyator taqiqlangan", til, bo'limli savollar, legenda. "150 daqiqa" qo'shilmadi (runner davomiylikni bilmaydi) |
| UI-3 bayroq | Bajarildi (hamma o'lchamda, Q6 tavsiyasi) | Karta yuqori o'ng burchagida, 44px (desktopda 40px); pastki paneldan olib tashlandi |
| UI-4 yashil karta | Bajarildi, **brauzerda ko'rilmadi** | Natija sahifasi bazani talab qiladi. Mobil grid tuzilishi kodda; haqiqiy balandlik (maqsad ≤ 150px) qo'lda tekshirilsin |
| UI-5 "Savollar tahlili ↓" | Bajarildi, **brauzerda ko'rilmadi** | `<a href="#review">` + silliq o'tish, faqat mobilda |
| UI-6 navigator bo'limlari, "Joriy" | Bajarildi | 1366×680 da ham panel scrollsiz sig'adi (sarlavha "Savollar" balandlik < 760px da yashiriladi) |
| UI-7 klaviatura | Bajarildi | Y-1: A–D; Y-2: A–F faol bandga; ←/→; yozish maydonida va ochiq oynada o'chiq; `e.code` ishlatiladi (kirill klaviaturada ham ishlaydi). Brauzerda sinaldi |
| UI-8 ko'rsatma | Bajarildi | Y-2: bir qatorli "Har bir bandga mos variantni (A–F) tanlang." O: avvalgi qoida banneri |
| UI-9 O kiritish | Bajarildi (rejadan farq) | Foydalanuvchi talabi bo'yicha to'liq ekran klaviaturasi (0–9, `,`, `/`, `−`, ⌫), `inputMode="none"`; faqat sensorli ekranda; telefonda pastki panel ustida mahkamlangan. Brauzerda sinaldi (`7/4` yozildi) |
| UI-10 topshirish oynasi | Bajarildi | Uch son: javob berilgan / javobsiz / belgilangan; ixcham o'lcham saqlandi |
| UI-11 Y-2 raqamlash | Tekshirildi | Raqamlash o'zgartirilmadi; **tuzilish farqi topildi**, docs/rasmiy-manbalar.md "Y-2 tekshiruvi" |
| UI-13 safe-area | Bajarildi, **qurilmada ko'rilmadi** | `viewport-fit=cover` + `env(safe-area-inset-bottom)` |
| UI-14 chiplar | Bajarildi | Mobilda mavzu nomi yashirin |
| UI-12 pastki navigatsiya | Qilinmadi | Q7 qarori kutilmoqda |
| UI-15 o'quv reja | Qilinmadi | 3-bosqich |

Tekshiruv: `pnpm typecheck`, `lint`, `test` (yangi testlar: navigator bo'limlari, bayroq, Y-2 ko'rsatma, ekran klaviaturasi funksiyalari). Imtihon ekrani haqiqiy Chrome (headless, CDP) da: 393×852 (mobil, sensorli), 1440×900 va 1366×680; Y-1, Y-2, O savollari scrollsiz (desktop), yon panel, topshirish oynasi, klaviatura va ekran klaviaturasi ishlashi ko'rildi.

## 8. Qabul qilingan qarorlar (2026-11-10)

| # | Qaror |
|---|---|
| Q1 | **Faqat matematika.** DTM ning boshqa fanlari va ko'p fanli DTM simulyatsiya qilinmaydi (DTM kalkulyator qoladi) |
| Q6 | Bayroq hamma o'lchamda savol kartasi burchagida (bajarilgan) |
| Q7 | **Mobil pastki navigatsiya paneli kerak** (UI-12 tasdiqlandi): Imtihonlar, Natijalarim, Xatolar daftari, DTM; imtihon ekranida ko'rsatilmaydi |
| Y-2 | **Bizning tuzilish saqlanadi** (docs/rasmiy-manbalar.md) |
| Bosqich 4, 5 | **Kerak emas**: login, to'lov, reyting, musobaqa, Telegram, SEO sahifalar, universitet vositalari, kirill tili qilinmaydi (2026-11-10) |
| Kontent talabi | Barcha savol, test va mocklar rasmiy DTM yoki Bilimni baholash agentligi tasdiqlagan metodika/manbalarga asoslanadi; Variant A etalon; yangi kontentni mutaxassis tekshiradi va natijani foydalanuvchi beradi (2026-11-10) |
| Mock variantlar soni | 15 taga yetkaziladi (hozir 6) |

## 9. Bosqich 1 tayyorlik tekshiruvi (2026-11-10)

Bazadagi savollar (faqat o'qildi): **270 ta, hammasi nashr etilgan** (Y-1 192, Y-2 18, O 60; qiyinlik L1 72 / L2 114 / L3 84), hammasida yechim bor.

| Bo'lim | Savol |
|---|---|
| Sonlar va amallar | 12 |
| Algebraik shakl almashtirishlar | 66 |
| Tenglama va tengsizliklar | 48 |
| Funksiyalar | 18 |
| Matematik analiz asoslari | 24 |
| Geometriya | 84 |
| To'plam, ehtimollik, modellashtirish | 18 |

Mavzular (103 ta): savoli bor 94, savolsiz 9; mavzudagi savol soni min 1 / median 3 / max 9; **10 va undan ko'p savolli mavzu yo'q**, 5+ savolli 16 ta, 2 va undan kam 47 ta.

**Xulosa:** mavzu bo'yicha mashq (1-band) hozirgi bankda ishlamaydi: mashq uchun mavzuga o'rtacha 3 savol. Bo'lim darajasida (7 ta) ishlaydi, lekin bu savollar mock variantlarda ham bor: mashqda kalit va yechimni ko'rgan o'quvchi keyin shu savolni mockda uchratadi. Shuning uchun mashq uchun **alohida (mockka kirmaydigan) savollar zaxirasi** kerak, ya'ni 2-band (kontentni ko'paytirish) amalda 1-bandning sharti.

Generatorlar (`content/gen/`) parametrli shablonlar (jami taxminan 112 shablon: sonlar 11, algebra 26, analiz 19, to'plam 16, planimetriya 17, stereometriya 23 va boshqalar), parametrlari o'zgartirilsa har shablondan ko'plab turli savol chiqadi: shuning uchun bo'lim va mavzu darajasida zaxirani ko'paytirish mumkin. Shablonlar soni 103 mavzuni to'liq qoplamaydi: mavzu bo'yicha mashq uchun yetishmagan mavzularga yangi shablonlar yozish kerak. Mutaxassis tekshiruvi (docs/content.md) har yangi savol turiga zarur.

### Taklif qilingan Bosqich 1 tartibi
- **1A (bankka bog'liq emas):** mobil pastki navigatsiya paneli (UI-12), saqlangan savollar.
- **1B (birinchi navbatda kontent):** mashq zaxirasini yaratish: alohida `pool` (mockka kirmaydi), avval bo'lim darajasida har bo'limda kamida ~60–100 savol, keyin mavzu darajasiga.
- **1C (1B dan keyin):** mavzu/bo'lim bo'yicha mashq (savol soni, qiyinlik, rejim, natija).
- **1D:** mock variantlar sonini 6 dan ko'paytirish (1B generatorlari bilan bir ish, alohida seed).

### Mashq qurilishidan oldin hal qilinadigan savollar
| # | Savol | Tavsiya |
|---|---|---|
| Q8 | Mashq savollari mock variantlardan alohida zaxiradami? | Ha, alohida |
| Q9 | Mashq birligi: bo'limmi (7) yoki mavzu (103)? | Birinchi bo'lim, zaxira o'sgach mavzu |
| Q10 | Oddiy mashqda javob darrov ko'rsatiladimi (to'g'ri javob va yechim)? | Ha (mashq = o'rganish); "imtihon rejimi"da oxirida |

### Bosqich 1A bajarilishi (2026-11-10, kodda; commit qilinmagan)

Qabul qilingan: Q8 (mashq zaxirasi mockdan alohida), Q9 (avval bo'lim, keyin mavzu), Q10 (oddiy mashqda javob darrov, imtihon rejimida oxirida).

| Band | Holat | Izoh |
|---|---|---|
| Mobil pastki navigatsiya (UI-12) | **Bajarildi** | `components/bottom-nav.tsx`: Imtihonlar, Natijalarim, Xatolar daftari, DTM; md dan kichik ekranda; hamburger menyu olib tashlandi; imtihon ekranida yo'q. `/dtm` da mobil va desktopda brauzerda tekshirildi |
| Saqlangan savollar | **Bajarildi, baza migratsiyasi qo'llanmagan** | `supabase/migrations/20261110100000_saved_questions.sql` (jadval + 3 funksiya, PGlite testlari o'tdi). Tahlil oynasi (natija va xatolar daftari) sarlavhasida yer belgisi; `/saved` sahifasi; "Xatolar | Saqlangan" yorliqlari. Migratsiya bulut bazaga qo'llanmaguncha saqlash tugmasi xato matnini ko'rsatadi, sahifalar ishlayveradi. Brauzerda ko'rilmadi (kirish va baza kerak) |
| Tungi rejim | **Rejadan chiqarilgan** (2026-11-10) | Hozircha kerak emas |

### Bosqich 1B va 1C bajarilishi (2026-11-10)

Supabase: REST va Postgres ulanishi ishlaydi. Yangi 3 ta migratsiya (`20261110100000` saqlangan savollar, `20261110110000` pool, `20261110120000` mashq) foydalanuvchi tomonidan SQL editor orqali qo'llangan (`supabase/manual/2026-11-10-apply.sql`; tarix uchun `...record-history.sql`). Mashq zaxirasi yuklangan: 1711 savol.

| Band | Holat | Izoh |
|---|---|---|
| 1B mashq zaxirasi | **Bajarildi, bazaga yuklangan (1711 savol)** | `content/gen/pool.ts`, `pnpm content:pool` (fayllarga) va `pnpm content:pool:seed`. 1711 savol (sonlar 80, algebra 437, tenglama 318, funksiyalar 119, analiz 150, geometriya 494, toplam 113), 94/103 mavzu, qiyinlik L1 477 / L2 753 / L3 481; 7 slot generator xatosi sabab o'tkazildi. Mock variantlar A–F o'zgarmagan. Tanlangan matematik mustaqil tekshiruvlar (`*-math.test.ts`) pool uchun yurgizilmagan |
| 1C mashq rejimi | **Bajarildi; baza oqimi real Supabase'da sinalgan** | `/practice` (bo'lim, qiyinlik, rejim, savollar soni), `/practice/[id]` (mashq ekrani), `/practice/[id]/result`. Rejimlar: oddiy (taymersiz, javob darrov), vaqt bilan (savolga 3 daqiqa, javob darrov), imtihon (taymer, natija oxirida). Tekshirish va kalit faqat serverda. Yechim: dastlabki 5 tasi hamma uchun, qolgani Pro. Saqlash tugmasi mashqdan ham ishlaydi. Pastki navigatsiyaga 5-bo'lim "Mashq" qo'shildi |
| Mavzu bo'yicha mashq (Q9) | Keyingi bosqich | Hozir faqat bo'lim darajasida; 9 mavzuda savol yo'q |

Tekshiruv: baza sinovlari (PGlite) mashq va pool uchun; jonli testlar (`pnpm test:live`, real Supabase, `tests/live/practice.live.test.ts`): zaxira, boshlash, kalit faqat tekshirgandan keyin ochilishi, qulf, imtihon rejimi, yakunlash, saqlash, ruxsatlar, boshqa foydalanuvchidan yashirinligi; sinov ma'lumoti o'chirilgan (qolgan sinov foydalanuvchisi 0). Interfeys: sozlash va mashq ekrani Chrome'da (bazasiz sinov sahifasi) ko'rilgan. Brauzerda to'liq real oqim (guest sessiya bilan) va natija sahifasi hali qo'lda ko'rilmagan.

## 10. Mavzu bo'yicha mashq va 15 mock variant (2026-11-10 qarorlari)

**Qarorlar (foydalanuvchi):**
- Mashq savollari mock variantlardan **alohida zaxirada** (mock savollari mashqqa kirmaydi).
- Mavzu bo'yicha mashq **rasmiy 21 mazmun elementi** bo'yicha (config/elements.ts); bizning 103 ishchi mavzu ularga bog'lanadi, rasmiyda bor lekin bizda yo'q mavzular uchun yangi mavzular (104–121) va yangi savollar yoziladi.
- Mock variantlar **15 taga** yetkaziladi: A–F o'zgarmaydi; G–O yangi, **Variant A tuzilishida** (qiyinlik joylashuvi, 45 savol, 32/3/10); bo'lim tasnifi **rasmiyga moslashtiriladi** (progressiya, matnli masala, foiz, nisbat Algebra slotlarida; Analiz faqat hosila va integral; Sonlar faqat 1.x).
- Barcha yangi kontentni mutaxassis tekshiradi, natijani foydalanuvchi beradi; tekshiruvgacha "tasdiqlangan" deb atalmaydi.

**Bajarildi (kodda):**
- config/elements.ts: 21 rasmiy element, 103 mavzuning elementlarga moslashtirilishi (taxminiy), 18 yangi mavzu (104–121), `topicAllowedInBlock` (ishchi diapazon YOKI rasmiy joylashuv).
- Baza (qo'llash kerak, `supabase/manual/2026-11-10-elements-apply.sql` + `...-elements-record-history.sql`): `content_elements`, `topic_elements`, yangi mavzular; mashq elementlar bo'yicha (`start_practice` bo'lim yoki element kodi, `get_practice_element_stats`).
- Interfeys: /practice 21 element (7 bo'lim bo'yicha guruhlangan), mashq va natija sarlavhalarida element nomi (4 tilda; kaa tarjimasi tekshirilmagan).
- DTM kalkulyator: ikki marta yaxlitlash xatosi tuzatildi; qoidalar tekshirildi (docs/rasmiy-manbalar.md "DTM tekshiruvi").
- Bor testlar rasmiy 7 bo'limga solishtirildi: A–F ning 270 savolidan 17 tasi rasmiy bo'lim tasnifiga mos emas (A da bitta: #23 progressiya Analiz slotida).

**Bajarildi (2026-11-11, agentsiz):** qo'shimcha shablonlar: 21 elementning hammasida 241 shablon (≈9500 savol), har biriga mustaqil matematik tekshiruv; G–O mock variantlar (content/gen/mock-official.ts, content/variants/variant-G..O.json, qoralama) rasmiy joylashuvda, A–F va mashq zaxirasi bilan takrorlanmaydi.

**Eski ro'yxat (bajarilgan):** qo'shimcha shablonlar (content/gen/extra: sonlar+algebra, tenglama+funksiya+analiz, to'plam+ma'lumotlar, geometriya) mustaqil matematik tekshiruvlar bilan; mavjud 1711 mashq savoli uchun mustaqil tekshiruvlar; G–O mock variantlar (rasmiy tasnif).

**Qolgan:** natijalarni birlashtirish (pool + extra yuklash, G–O yuklash), mutaxassis tekshiruvi (matematika, qoraqalpoq tarjimasi, mavzu-element moslashtirish), kerak bo'lsa rasmiy ball naqshiga moslash (hozir Variant A bilan bir xil, qaror: A etalon).
