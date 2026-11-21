# Appni original Milliy sertifikat loyihasiga moslashtirish

**Hujjat sanasi:** 2026-11-21  
**Asosiy loyiha va mezon:** Milliy sertifikat — Matematika.  
**Solishtirilgan app:** [Marra](https://marra-sat.alwaysdata.net/).  
**Maqsad:** appning kontenti, test tuzilishi, mashq funksiyasi, natijalari, oynalari va dizaynini original Milliy sertifikat loyihasiga moslashtirish.

Bu hujjat oldingi brauzer ko‘rigi va original loyiha fayllarining tahlilini birlashtiradi. App qaytadan ishlab chiqilmadi; yangi test urinishi boshlanmadi, javob yuborilmadi, hisob ma’lumotlari o‘zgartirilmadi. Ushbu Markdown hujjatini yaratishdan tashqari loyiha fayllariga o‘zgartirish kiritilmadi.

## 1. Asosiy qaror va dalillar chegarasi

**Original — Milliy sertifikat. App shu originalning imkoniyatlari va mazmunini saqlashi kerak.** SAT mahsulotining mavjud cheklovlari Milliy sertifikat testlarini soddalashtirishga sabab bo‘la olmaydi. Bir xil bo‘lish talabi savol turlari, ball hisoblash, mashq oqimlari, ekranlar, navigatsiya va vizual uslubni qamrab oladi. Texnologiya yoki ichki URL aynan bir xil bo‘lishi shart emas.

Quyidagi holat belgilari ishlatiladi:

| Belgi | Ma’nosi |
|---|---|
| **Tasdiqlangan farq** | Appning mavjud sahifasi yoki natijasida bevosita ko‘rildi; original manbasi bilan solishtirildi. |
| **Ko‘rilgan joylarda topilmadi** | Tekshirilgan navigatsiya va sahifalarda funksiya topilmadi. Bu uning app kodida mutlaqo yo‘qligini isbotlamaydi. |
| **Tekshirilmagan** | Yangi urinish yoki ma’lumot o‘zgarishini talab qilgani uchun amalda sinalmadi yoki tegishli panel ochilmadi. |
| **Moslik talabi** | Originalda mavjud xatti-harakat appda ham bo‘lishi kerak. |
| **Qo‘shimcha tavsiya** | Originaldagi imkoniyatdan tashqari yaxshilash; originalda tayyor funksiya sifatida talqin qilinmasin. |

Originalning mavjud kodi funksional mezon hisoblanadi. Eski reja hujjatlari va brandbookdagi **[Taklif]** bandlari avtomatik ravishda amalga oshirilgan funksiya hisoblanmaydi. Bu hisobot davlat imtihoni qoidalarining yangilangan huquqiy tekshiruvi emas; undagi format va baholash qiymatlari original loyiha konfiguratsiyasidir.

## 2. Eng muhim kamchiliklar

| ID | Appdagi holat | Originalga nisbatan kamchilik | Kerakli natija | Holat |
|---|---|---|---|---|
| K01 | Variant A: 41 savol, 150 daqiqa | Originaldagi 45 topshiriq va uch tur saqlanmagan | 32 Y-1 + 3 Y-2 + 10 O; jami 45 topshiriq | Tasdiqlangan farq |
| K02 | Moslashtirish topshiriqlarining bandlari alohida A–D savollarga aylangan | Umumiy A–F variantli uch bandli topshiriq yo‘qolgan | Har Y-2 bitta raqam ostida uch band va oltita umumiy variant bilan chiqishi | Tasdiqlangan farq |
| K03 | Variant A natijasida 10 ta ochiq topshiriq yo‘q | a/b qismlarini mustaqil kiritish va baholash yo‘qolgan | 36–45-topshiriqlar a/b maydonlari bilan tiklanishi | Tasdiqlangan farq |
| K04 | `$...$`, `\frac`, `\sqrt` kabi yozuvlar xom matn ko‘rinishida | Matematik ifoda o‘qish va yechim tahlili qiyin | Savol, variant va yechimlarda formulalar to‘liq render qilinishi | Tasdiqlangan farq |
| K05 | Masalan, 24-savolda romb rasmi o‘rniga `[Chizma: ...]` matni | Original SVG chizma yo‘qolgan | Chizma o‘lchamlari, belgilar va tavsifi bilan ko‘rsatilishi | Tasdiqlangan farq |
| K06 | Natija foiz va to‘g‘ri javoblar soni bilan cheklangan | Vaznli xom ball, taxminiy /75 ball va daraja ko‘rinmagan | Original hisoblash va daraja taqdimoti | Tasdiqlangan farq |
| K07 | Tahlilda Math va Reading & Writing, ikkinchisi 0/0 | Matematikaning yetti mazmun bo‘limi yo‘q | Yetti bo‘lim kesimidagi haqiqiy tahlil | Tasdiqlangan farq |
| K08 | “Sertifikatlar” filtri 0 natija; “SAT” filtri uchala testni ko‘rsatgan | Kategoriya va filtr natijasi mos emas | Milliy sertifikat variantlari to‘g‘ri ro‘yxatda chiqishi | Tasdiqlangan farq |
| K09 | Milliy sertifikat kartasida College Readiness, Math va Reading & Writing yozuvlari | Boshqa imtihon shabloni qolgan | Milliy sertifikat — Matematika nomi va mos tavsiflar | Tasdiqlangan farq |
| K10 | Mavzu, qiyinlik va rejim tanlanadigan mashq yo‘li topilmadi | Originaldagi asosiy tayyorgarlik funksiyasi foydalanuvchiga ochilmagan | To‘liq mashq moduli va barcha oynalari | Ko‘rilgan joylarda topilmadi |
| K11 | Umumiy xatolar daftari va doimiy saqlangan savollar bo‘limi topilmadi | Natijadan tashqari takrorlash vositalari yetishmaydi | Alohida Xatolar va Saqlangan savollar bo‘limlari | Ko‘rilgan joylarda topilmadi |
| K12 | Marra yashil uslubi, desktopda ham taxminan 520 px markaziy ustun | Originalning ranglari, komponentlari va keng ekran tuzilishiga mos emas | Original dizayn tizimi va responsive maketlar | Tasdiqlangan farq |

**41 savol qanday hosil bo‘lgan:** ko‘rilgan Variant A tuzilishi 32 ta yopiq savol + 3 ta moslashtirish savolining 9 ta alohida bandiga mos keladi. Natijada 32 + 9 = 41 bo‘lgan, 10 ta ochiq savol tushib qolgan. Bu appdan olingan `variant-a-exam.json` eksportiga mos keladi (fayl ushbu loyiha omborida yo‘q, shuning uchun bu loyiha kodi bilan solishtirib bo‘lmaydi); appning aynan qaysi import kodidan foydalangani tekshirilmagan.

## 3. Test tuzilishi: aynan saqlanishi kerak bo‘lgan mezon

### 3.1. To‘liq mock imtihon

| Tartib | Tur | Soni | Ko‘rinishi va javob kiritish |
|---|---|---:|---|
| 1–32 | Y-1 (`y1`) | 32 | A, B, C, D; bitta javob tanlanadi |
| 33–35 | Y-2 (`y2`) | 3 | Bitta umumiy shart, uchta band, umumiy A–F variantlar; har band uchun javob |
| 36–45 | O (`o`) | 10 | Ochiq topshiriq; a va b qismlari uchun alohida sonli javob |
| Jami | Uch tur | **45** | **150 daqiqa / 9000 soniya** |

Y-2 ning uch bandi savollar navigatorida uchta mustaqil topshiriqqa aylanmasligi kerak. Ochiq topshiriqlarni A–D tanlovga almashtirish ham originalga mos kelmaydi.

### 3.2. Yetti bo‘lim bo‘yicha taqsimot

| Bo‘lim kodi | Mazmun | Y-1 | Y-2 | O | Jami |
|---|---|---:|---:|---:|---:|
| `sonlar` | Sonlar | 2 | 0 | 0 | 2 |
| `algebra` | Algebraik ifodalar | 11 | 0 | 0 | 11 |
| `tenglama` | Tenglama va tengsizliklar | 6 | 0 | 2 | 8 |
| `funksiyalar` | Funksiyalar | 2 | 0 | 1 | 3 |
| `analiz` | Matematik analiz | 2 | 0 | 2 | 4 |
| `geometriya` | Geometriya | 7 | 3 | 4 | 14 |
| `toplam` | To‘plam, kombinatorika va ehtimollik yo‘nalishi | 2 | 0 | 1 | 3 |
| **Jami** | | **32** | **3** | **10** | **45** |

Savollar nomi va bo‘lim belgilari original lug‘atlar bilan olinadi. Erkin yozilgan “Math” barcha mavzularning o‘rnini bosmaydi.

### 3.3. Kontent va import

- Originalning A–O variant fayllari mavjud: 15 × 45 = 675 topshiriq. Bu fayllar mavjudligi barcha variantlar ishlab turgan bazada nashr qilinganini anglatmaydi.
- Appda tekshirilgan katalogda uchta test bor edi: Variant A, 4 savolli Sertifikat test, 30 savolli SAT Practice Test 01. Oxirgi ikkitasi originalning to‘liq matematika mock varianti o‘rnini bosmaydi.
- Import savol turi, tartibi, barqaror identifikatori, blok/mavzu kodi, qiyinligi, javob tuzilishi, yechim, tipik xato, chizma va tarjimalarni yo‘qotmasligi kerak.
- Barcha savol turlarini saqlagan namuna: [Variant A v2](../content/export/variant-A.v2.json). Moslashtirish tavsifi: [import formati](import-format.md).
- Appdan olingan `variant-a-exam.json` dagi 41 savolli soddalashtirilgan format to‘liq moslik uchun asos bo‘la olmaydi (bu fayl ushbu loyiha omborida yo‘q; asos faqat Variant A v2).
- v2 namunasini mavjud app importeriga yuklashning o‘zi yetarli emas: appning ma’lumot modeli, savol oynalari va baholashi uch turga mos bo‘lishi kerak.
- Import hujjatidagi qo‘shimcha metadata va original validator qabul qiladigan maydonlar alohida tekshiriladi. Hujjatda yozilgan har bir metadata maydoni original bazada saqlanadi, deb taxmin qilinmasin.
- Noto‘g‘ri formatdagi variant to‘liq imtihon sifatida nashr qilinmasligi, xato aniq ko‘rsatilishi kerak.

### 3.4. Baholash

| Tur/ko‘rsatkich | Originaldagi hisoblash |
|---|---|
| Y-1 L1/L2 | Standart 1,3 ball |
| Y-1 L3 | Standart 2,2 ball |
| Y-2 | Standart 2,2 ball; barcha juftliklar to‘g‘ri bo‘lganda |
| O: faqat a to‘g‘ri | 1,5 ball |
| O: faqat b to‘g‘ri | 1,7 ball |
| O: a va b to‘g‘ri | 3,2 ball |
| Alohida vazn | Y-1/Y-2 uchun kontentdagi individual vazn berilgan bo‘lsa original algoritmga muvofiq ishlatiladi |
| Yakuniy taxminiy ball | `xom ball / maksimal xom ball × 75`, originaldagi yaxlitlash bilan |
| Darajalar | C ≥ 46; C+ ≥ 50; B ≥ 55; B+ ≥ 60; A ≥ 65; A+ ≥ 70 |

**Originaldagi `phaseA-linear-v1` hisoblash taxminiy chiziqli shkala; Rasch modeli emas.** App natijani “taxminiy”, rasmiy sertifikat natijasi emasligini tushunarli ko‘rsatishi kerak. Oddiy to‘g‘ri javob foizi yordamchi statistika bo‘lishi mumkin, lekin /75 ballni almashtirmaydi.

Ochiq javoblarda originalning sonlarni normallashtirishi saqlanadi: masalan, `1/2`, `0.5`, `0,5` teng qiymatlar sifatida tekshiriladi. a va b natijalari alohida ko‘rinadi. To‘liq mock natijasini mashqdagi foizli natija bilan aralashtirmaslik kerak.

## 4. Barcha sahifa va oynalar xaritasi

URL lar originaldagi manbani topish uchun berilgan. Appda teng imkoniyatli ekran bo‘lishi kifoya.

| ID | Sahifa yoki oyna | Originaldagi vazifa | Appdagi kuzatuv va talab |
|---|---|---|---|
| E01 | Kirish/ro‘yxatga olish — `/start` | Ism-familiya, telefon, sinf, rozilik | Profil mavjud, ammo birlamchi ro‘yxatdan o‘tish sinalmagan. Originalning zarur maydonlari va rozilikni qamrab olish tekshirilsin. |
| E02 | Bosh sahifa — `/` | Salomlashish, oxirgi natija, asosiy bo‘limlarga yo‘llar | Mavjud, ammo mazmun va dizayn originalga moslashtirilsin. Mashq va boshqa asosiy yo‘llar ochiq bo‘lsin. |
| E03 | Imtihonlar — `/exams` | Mavjud mock variantlari, kirish holati | Katalog va qidiruv bor. Kategoriya xatosi tuzatilsin, 45 savolli variantlar berilsin. |
| E04 | Imtihon oldi qoidalari — `/exams/[id]` | Variant, 45 topshiriq, vaqt, qoidalar, boshlash | Alohida oqim tekshirilmagan. Originalga teng tushuntirish ekrani talab qilinadi. |
| E05 | Faol imtihon — `/attempts/[id]` | Taymer, savol, javob, progress, navigatsiya | Yangi urinish boshlanmagani uchun tekshirilmagan. 5-bo‘limdagi barcha talablar amal qiladi. |
| E06 | Mobil savollar paneli | 1–45 raqam, joriy/javobli/bo‘sh/belgilangan holat | Tekshirilmagan; originaldagi drawer vazifasi ta’minlansin. |
| E07 | Topshirishni tasdiqlash | Javobsiz va belgilangan savollar haqida ogohlantirish | Tekshirilmagan; topshirish tasdig‘i talab qilinadi. |
| E08 | Imtihon natijasi — `/attempts/[id]/result` | /75, daraja, xom ball, yetti blok tahlili | Mavjud, ammo faqat foiz/Math tuzilishi originalga teng emas. |
| E09 | Savollar tahlili oynasi | Raqamli grid, savol detali, chizma, javob, yechim, xato izohi | Accordion tahlil bor. Formulalar, chizmalar, uch tur va tez raqamli navigatsiya moslashtirilsin. |
| E10 | Mashq sozlash — `/practice` | Mazmun elementi, qiyinlik, rejim, son | Ko‘rilgan sahifalarda topilmadi; to‘liq ekran kerak. |
| E11 | Faol mashq — `/practice/[id]` | Tanlangan rejimda savollarni ishlash | Ko‘rilgan sahifalarda topilmadi; alohida oqim kerak. |
| E12 | Mashq javobini tekshirish oynasi | To‘g‘ri/xato/qisman, yechim va keyingi savol | Ko‘rilgan sahifalarda topilmadi; 6-bo‘limga muvofiq kerak. |
| E13 | Mashqni yakunlash tasdig‘i | Javobsiz savollar va yakunlash | Tekshirilmagan; alohida holat sifatida bajarilsin. |
| E14 | Mashq natijasi — `/practice/[id]/result` | To‘g‘ri/jami, foiz, yechimlar, yana mashq | Ko‘rilgan sahifalarda topilmadi; mock natijasidan ajratilsin. |
| E15 | Tarix — `/history` | Urinishlar, eng yaxshi/o‘rtacha ball, grafik, zaif mavzular | Natijalar ro‘yxati bor; original ko‘rsatkichlari va grafik bilan to‘ldirilsin. |
| E16 | Xatolar daftari — `/mistakes` | Urinishlar bo‘yicha yig‘ilgan xato savollar va izohlar | Bitta natijadagi Xatolar filtri bu bo‘lim o‘rnini bosmaydi. Alohida bo‘lim topilmadi. |
| E17 | Saqlangan savollar — `/saved` | Keyin ko‘rish uchun doimiy shaxsiy to‘plam | Natijadagi Belgilangan filtri mavjud; doimiy to‘plam ekanligi tasdiqlanmagan. Alohida imkoniyat kerak. |
| E18 | DTM kalkulyatori — `/dtm` | Sertifikat balli asosida original kalkulyator hisoblari | Ko‘rilgan sahifalarda topilmadi; original funksiyasi qamrab olinsin. |
| E19 | Profilni ko‘rish/tahrirlash | Originalda `/start` orqali ma’lumotlarni yangilash | Appda profil va tahrirlash tugmasi bor; maqsaddagi SAT matni moslashtirilsin. Tahrirlash sinalmagan. |
| E20 | Til tanlash | uz, ru, kaa, en interfeys va kontent | Ko‘rilgan sahifalarda topilmadi; to‘rt til uchun original mexanizmga teng imkoniyat kerak. |
| E21 | Pro oynasi/kirish cheklovi | Variant va yechimlarga kirish siyosati | Joriy hisobda 41 savol tahlili ochildi. Hisobning huquqi noma’lum; barcha foydalanuvchilarda cheklov yo‘q deb bo‘lmaydi. |
| E22 | Maxfiylik — `/privacy` | Ma’lumotlardan foydalanish va rozilik tushuntirishi | Tekshirilmagan; foydalanuvchi oqimida ochiq havola kerak. |
| E23 | Yuklanish, bo‘sh holat, xato va topilmadi | Sahifa/so‘rov holatini tushuntirish | Filtrdagi bo‘sh holat bor, lekin noto‘g‘ri kategoriya bilan chiqqan. Barcha oqimlar uchun tekshirilsin. |
| E24 | Admin panel va xizmat oynalari | Kontent, import, nashr, ishtirokchilar, urinishlar, audit | App admini tekshirilmagan. To‘liq loyiha mosligida 10-bo‘lim talab qilinadi. |

## 5. Faol imtihon oynasi talablari

Bu bo‘limdagi app xatti-harakatlari **tekshirilmagan**. Ular original kodidan olingan moslik mezonlaridir.

### Savol va javob maydoni

- Savol raqami, sharti, barcha formulalar va mavjud chizma birgalikda ko‘rsatiladi.
- Y-1: A–D tanlovlar va tanlangan javobning aniq holati.
- Y-2: umumiy shart, uch band, A–F variantlar; har band holati alohida.
- O: a/b maydonlari, son/kasr/manfiy qiymat kiritish; mobil uchun mos sonli klaviatura.
- Oldingi/keyingi savol va raqam orqali to‘g‘ridan-to‘g‘ri o‘tish.
- Savolni vaqtincha belgilash va belgini olib tashlash. Bu doimiy “Saqlangan savollar” funksiyasidan ajratiladi.

### Taymer, saqlash va yakunlash

- 150 daqiqalik taymer server vaqti bilan muvofiqlashadi; sahifa yangilanganda vaqt qayta boshlanmaydi.
- Originalda server bilan davriy sinxronlash va so‘nggi besh daqiqa ogohlantirishi bor.
- Vaqt tugashi avtomatik yakunlash oqimiga olib keladi.
- Har javob uchun saqlash, saqlanmagan o‘zgarishlar navbati, aloqa tiklanganda qayta yuborish va tiklanish mexanizmi bo‘lishi kerak.
- Saqlanayotgan/saqlangan/xato holati foydalanuvchiga tushunarli bo‘lsin.
- Topshirish oynasi yakunlashni tasdiqlash, ortga qaytish, javobsiz/belgilangan topshiriqlarni ko‘rishni ta’minlasin.
- Yakuniy natija server hisoblagan saqlangan javoblarga tayanadi; takror bosish bir urinishni ikki natijaga aylantirmasin.
- Test tugamaguncha javob kalitlari va yechimlar oddiy mijoz ma’lumotida ochilmasligi kerak.

### Ekran va boshqaruv

- Desktopda savol va navigator uchun keng ekran imkoniyati ishlatiladi.
- Mobil ekranda navigator alohida ochiladigan panelda; taymer va asosiy boshqaruvlar foydalanishga qulay joyda.
- Klaviatura orqali harf tanlash va strelkalar bilan o‘tish originaldagi qoidalarga mos bo‘lsin; matn kiritish bilan to‘qnashmasin.
- Uzoq shart, katta formula yoki klaviatura ochilishi tugmalarni foydalanib bo‘lmaydigan holatga olib kelmasin.

## 6. Mashq funksiyasi — to‘liq oqim

**Mock imtihonni qayta boshlash mashq funksiyasining o‘rnini bosmaydi.** Originaldagi mashq alohida sozlamalar, rejimlar, tekshirish oynasi va natija sahifasiga ega.

### 6.1. Mashq sozlash oynasi

| Tanlov | Originaldagi talab |
|---|---|
| Mazmun | Yetti bo‘limga guruhlangan 21 ta mazmun elementi |
| Mavjud savollar | Element va qiyinlik bo‘yicha mavjud son ko‘rinadi |
| Qiyinlik | Barchasi, L1, L2, L3 |
| Savol soni | 5, 10, 15, 20, 30; standart tanlov 10 |
| Rejim | Oddiy mashq, vaqtli mashq, imtihon rejimidagi mashq |
| Savol yetishmasa | Mavjud son va tushunarli ogohlantirish; 0 savolli tanlov bilan sessiya boshlanmaydi |
| Boshlash | Tanlovlar asosida alohida mashq sessiyasi yaratiladi |

Savollar zaxirasi mock variantlar kontentidan maqsadi bo‘yicha ajratiladi. Mazmun elementi va qiyinlik tanlovi haqiqiy savollar saralashiga ta’sir qilishi kerak.

### 6.2. Uchta rejim

| Rejim | Taymer | Javob qachon ochiladi? | Foydalanuvchi oqimi |
|---|---|---|---|
| `practice` — oddiy mashq | Yo‘q | “Tekshirish”dan so‘ng | Javob → tekshirish → izoh → keyingi savol |
| `timed` — vaqtli mashq | Bor | “Tekshirish”dan so‘ng | Vaqt ichida javob → izoh → keyingi savol |
| `exam` — imtihon rejimi | Bor | Mashq yakunlanganda | Javoblar → yakunlash → umumiy natija va tahlil |

Originalda vaqtli rejimlar uchun **bir savolga 180 soniya** hisoblanadi: 10 savolga 30 daqiqa. Bu to‘liq mockning 150 daqiqalik qoidasidan alohida.

### 6.3. Faol mashq oynasi

- Tanlangan mazmun elementi, rejim, savol tartibi va progress ko‘rinadi.
- Y-1/Y-2/O rendererlaridan tegishli turga qarab foydalaniladi; formula va chizma saqlanadi.
- Taymer faqat vaqtli rejimlarda chiqadi.
- Oddiy va vaqtli mashqda “Tekshirish”; imtihon rejimida yakunlashgacha yechim yashirin.
- Savollar navigatsiyasi, belgilash, oldingi/keyingi va yakunlash boshqaruvlari mavjud bo‘lishi kerak.
- So‘rov ketayotganida tugma holati aniq; xatoda qayta urinish mumkin.

### 6.4. Javobni tekshirish oynasi

Originalda bu yuqoridan ochiladigan, kontentga mos balandlikdagi oyna (`RevealSheet`). Balandligi ekran balandligining 62 foizidan oshmaydi, uzun yechim ichkarida aylantiriladi.

Oynada quyidagilar bo‘lishi kerak:

1. **To‘g‘ri / Noto‘g‘ri / Qisman to‘g‘ri** holati.
2. Noto‘g‘ri yoki qisman javobda to‘g‘ri javobni tushuntirish.
3. Mavjud yechim va tipik xato izohi, render qilingan formulalar bilan.
4. Ochiq topshiriqning a/b natijalarini ajratish.
5. Yopish va “Keyingi”; oxirgi savolda “Yakunlash”.
6. Kirish cheklovi bo‘lsa, tushunarli Pro holati.

### 6.5. Yakunlash va mashq natijasi

- Yakunlashdan oldin javobsiz savollar soni va tasdiqlash oynasi.
- Natijada to‘g‘ri/jami, foiz, tanlangan mavzu/element, savollar tahlili.
- Savol bo‘yicha kiritilgan javob, to‘g‘ri javob, a/b holati, yechim, tipik xato va chizma.
- “Yana mashq” sozlash sahifasiga olib boradi.
- Mashq foizi avtomatik ravishda to‘liq mockning sertifikat darajasiga aylantirilmaydi.
- Originalda bepul foydalanuvchi uchun mashqning dastlabki besh savoli yechimlari ochiladi. Huquqlar ayni kirish siyosatiga mos ishlashi kerak.

## 7. Natija, tarix, xatolar va saqlash

### Natija va savollar tahlili

Appda mavjud natijalar ro‘yxati, sarflangan vaqt, to‘g‘ri/xato/javobsiz sonlar, Tahlil/Javoblar tablari va javob izohlari bor. Ular saqlanadigan foydali imkoniyatlar, ammo originalning quyidagi qismlari bilan to‘ldirilishi kerak:

- /75 taxminiy ball, daraja va vaznli xom ball.
- Yetti mazmun bo‘limi bo‘yicha ball va natija.
- 1–45 raqamli tahlil navigatori; kerakli savolga uzoq scrollsiz o‘tish.
- Savol matni/chizmasi, o‘quvchi javobi, to‘g‘ri javob va yechim, mavjud tipik xato.
- Y-2 ning uch bandi va O ning a/b qismlarini yo‘qotmasdan tahlil qilish.
- Originaldagi savol tafsilotini alohida oynada ko‘rishga teng imkoniyat.

Appdagi “Xatolar” filtri javobsiz savollarni ham chiqardi. Bu avtomatik hisoblash xatosi deb baholanmaydi, lekin yorliq mazmunni aniq aytishi kerak: “Xato va javobsiz” yoki alohida filtrlar — **qo‘shimcha UX tavsiyasi**.

### Tarix

- Originalda yakunlangan mock urinishlari, eng yaxshi/o‘rtacha ball va oxirgi 12 natija grafigi mavjud.
- Zaif mavzular uchun yetarli javob kuzatuvi bo‘lishi hisobga olinadi; original minimal kuzatuv chegarasidan foydalanadi.
- Appda 4 savolli testdagi 100% va Variant A dagi 0% umumiy 50% o‘rtacha ko‘rsatkichga birlashtirilgan edi. Bu arifmetik jihatdan xato emas, ammo turli hajm va maqsaddagi testlar tayyorgarlikni teng o‘lchamaydi.
- Milliy sertifikat mock ko‘rsatkichlari bir xil shkala va formatda berilsin. SAT, namuna test va mashq statistikasi bilan aralashtirilmasin.
- Mock va mashq tarixini bitta to‘liq panelga birlashtirish — **qo‘shimcha tavsiya**; originalda tayyor birlashtirilgan tarix deb ko‘rsatilmasin.

### Xatolar daftari

Originalning alohida bo‘limi urinishlardan yig‘ilgan xato savollarni qayta ko‘rish uchun. Bitta natijadagi xato accordionlari yetarli emas. Savol, yechim va tipik xato izohlarini ko‘rish imkoniyati saqlanadi.

Xatodan bevosita yangi mashq boshlash, avtomatik shaxsiy reja va oraliqli takrorlash originalda to‘liq tayyor funksiyalar emas; ular **qo‘shimcha tavsiya**.

### Saqlangan savollar

Doimiy saqlash va faol urinishdagi vaqtincha belgilash alohida tushunchalar. Originalga mos ravishda foydalanuvchi savolni saqlashi, shaxsiy to‘plamidan qayta ochishi va saqlashdan olib tashlashi kerak. Appdagi “Belgilangan” filtri doimiy to‘plam o‘rnini bosishi tasdiqlanmagan.

## 8. UX/UI va original dizaynga moslik

### 8.1. Dizayn manbasi

Original mezon: [dizayn hujjati](design.md), [brandbook](brandbook/brandbook.md), [dizayn tokenlari](../app/globals.css) va original komponentlar. Brandbookdagi “Manba” va “Taklif” bandlari ajratib qo‘llanadi.

| Element | Originaldagi asos | Appdagi farq / talab |
|---|---|---|
| Mahsulot nomi | Milliy sertifikat — Matematika | Marra/SAT shablon matnlari original mahsulot nomi va mazmuniga moslashtirilsin |
| Asosiy rang | To‘q sariq `#E8590C` | Ko‘rilgan yashil asosiy palitra originalga teng emas |
| Aksent | Binafsha `#4B2FD0` | Tanlov, havola va ikkilamchi urg‘ular original tokenlar bilan |
| Fon va matn | Sahifa `#F3F1FB`, matn `#1E1B39` | Appning fon/matn tizimi originalga moslashtirilsin |
| Holatlar | Yashil to‘g‘ri, qizil xato, oltin belgi/ogohlantirish | Holatlar rang bilan birga matn yoki belgi orqali ham tushunarli bo‘lsin |
| Komponentlar | Yumaloq kartalar, qalin pastki qirra, bosiladigan tugma ko‘rinishi | Kartalar, tanlovlar, tugmalar, tablar va modallar bir tizimda |
| Tipografika va tasvirlar | Original shriftlar, ikonka va art manbalari | Appning mustaqil uslubi o‘rniga originaldagi ierarxiya va aktivlar asos qilinsin |
| Desktop | Keng kontent, tegishli joylarda ikki ustun/navigator | Doimiy tor mobil ustun bilan cheklanmasin |
| Mobil | Moslashuvchan kontent, pastki navigatsiya va savollar paneli | Asosiy bo‘limlar va boshqaruvlar bir xil mazmunda ochilsin |

### 8.2. Ko‘rilgan UX holatlari

- Appning yashil-kulrang uslubi o‘z ichida izchil; tugmalar va pastki tablar tushunarli. Biroq bu original dizaynga mos degani emas.
- Imtihon nomi bo‘yicha qidiruv ishladi.
- Toza brauzer tabida 390 × 844 ko‘rinishda tekshirilgan sahifalarda yaqqol gorizontal toshish kuzatilmadi. Bu barcha ekranlar va haqiqiy telefonlarda to‘liq test o‘tkazilganini anglatmaydi.
- Bosh sahifadagi katta banner foydalanuvchining asosiy amallarini pastga suradi. “Imtihon” va “Mashq” yo‘llari ustuvor bo‘lishi kerak.
- Natijadagi katta dekorativ foiz bloki tahlilni pastga suradi; /75 ball, daraja va keyingi kerakli amal ixcham ko‘rinsin.
- 41 savolli uzun accordion ro‘yxatida tez raqamli o‘tish ko‘rinmadi; originaldagi savollar gridiga teng boshqaruv kerak.
- “Mathga ko‘proq e’tibor bering” tavsiyasi matematika ichidagi zaif mavzuni aniqlamaydi. Originaldagi blok/mavzu tahlili asos qilinsin.
- Desktopda bo‘sh yon maydonlar ko‘p; savol, chizma, navigatsiya va tahlilga joy ajratish kerak.

### 8.3. Har bir oqimda tekshiriladigan holatlar

Yuklanish, bo‘sh ro‘yxat, tarmoq xatosi, saqlanmagan javob, yakunlash davom etayotgani, ruxsat cheklovi, sessiya tugashi va topilmagan sahifa alohida tushunarli bo‘lsin. Klaviatura fokusi, modalni yopish, uzun matn/formula, kichik ekran va ochilgan mobil klaviatura bilan foydalanish qabul tekshiruviga kiritiladi.

## 9. Profil, til, kirish huquqi va qo‘shimcha bo‘limlar

| Yo‘nalish | Original / moslik talabi | App bo‘yicha cheklov |
|---|---|---|
| Profil | Ism-familiya, telefon, sinf, rozilik, til | Mavjud profil ko‘rildi; maydon tahriri yoki ro‘yxatdan o‘tish sinalmagan |
| Kirish | Original o‘quvchi uchun mehmon sessiya ishlatadi; standart student email/parol kirishi yo‘q | Appda email/parolni tiklash UI bor. Bu o‘zi kamchilik emas; funksional maqsad va natijalar saqlanishi muhim |
| Til | O‘zbek, rus, qoraqalpoq, ingliz | Til tanlash topilmadi; originaldagi qoraqalpoq tarjimalari ham ekspert tekshiruvini talab qiladi |
| Pro | Original UI da variant/yechimlarga huquq va bepul dastlabki besh tahlil chegarasi bor | Hozirgi hisob huquqi noma’lum; cheklovlar barcha hisob turlarida alohida tekshiriladi |
| To‘lov | Originalda Pro taqdimoti mavjud; to‘liq ishlaydigan to‘lov tizimi isbotlanmagan | Yangi to‘lov integratsiyasi originalda tayyor majburiy funksiya deb yozilmaydi |
| DTM | Original kalkulyatorning kiritish, natija va izohi | Appda topilmadi; originalga mos hisoblash kerak, amaldagi tashqi qoidalar bu auditda qayta tasdiqlanmagan |
| Dark mode | Appda kalit ko‘rindi | Ishlashi sinalmagan; originalga moslikning o‘rnini bosadigan ustunlik emas |

Originalning mehmon hisobi brauzer cookie siga bog‘liq va qurilmalararo oddiy qayta kirish cheklangan. Appdagi haqiqiy hisob tizimini shu cheklovga ataylab tushirish talab qilinmaydi; originalning funksional mazmuni saqlangan holda ishonchli hisob va tarix saqlanishi davom etishi mumkin.

## 10. Admin va kontent boshqaruvi

App admin paneli ko‘rilmagan. Shuning uchun quyidagilar “appda yo‘q” degan hukm emas, **to‘liq loyiha mosligi uchun tekshiruv ro‘yxati**:

- Admin kirishi va admin/muharrir vakolatlari.
- Savollar ro‘yxati va barcha uch turdagi savol tafsilotini ko‘rish.
- JSON import: format, turlar, javob kalitlari, mavzu, chizma va kontentni tekshirish.
- Variantlarni qoralama holatda ko‘rish, nashr qilish va arxivlash.
- Ishtirokchilar, urinishlar, tegishli statistika va Pro huquqlarini boshqarish.
- Admin amallari audit jurnali.
- Ishtirokchi va admin ma’lumotlariga kirishni ajratish.
- Savollar ko‘rinishidagi ma’lumot bilan maxfiy javob kalitini ajratish; yakunlanmagan urinishda yechimni ochmaslik.

Originalda savollarni ko‘rish va JSON import bor; to‘liq vizual savol yaratish/tahrirlash muharriri tayyor, deb hisoblanmasin. Texnologik stekni aynan ko‘chirish shart emas, lekin funksiyalar va ruxsatlar bir xil natija berishi kerak.

## 11. Originaldan ko‘r-ko‘rona ko‘chirilmasligi kerak bo‘lgan cheklovlar

Original asosiy mezon bo‘lsa ham, undagi quyidagi holatlar appga xato sifatida takrorlanmasligi kerak. Bular original kodini o‘qishdan chiqqan kuzatuvlar; bu ish davomida amalda test qilinmadi.

| Holat | Oqibati | Appga ko‘chirishda talab |
|---|---|---|
| `isAnswered` ko‘p qismli savolda biror band to‘lsa javobli deb hisoblaydi | Qisman to‘lgan Y-2/O to‘liq javobli kabi ko‘rinishi mumkin | Qisman va to‘liq holatni aniq ajratish — yaxshilash talabi |
| Oddiy (`practice`) va vaqtli (`timed`) mashqda javob faqat “Tekshirish” bosilganda serverga yoziladi; tekshirilmagan kiritma brauzer holatida qoladi (`practice-runner.tsx`: kechiktirilgan saqlash faqat `exam` rejimida ishlaydi) | Yangilash, tarmoq uzilishi, vaqt tugashi yoki yakunlashda hali tekshirilmagan kiritma jim yo‘qoladi | Qoralama saqlanishi (yechimni ochmasdan) yoki aniq ogohlantirish bo‘lishi |
| Mashqning `exam` rejimida javoblar 500 ms dan keyin `check: false` bilan saqlanadi, ammo saqlash xatosi faqat xabar chiqaradi: yakunlash baribir davom etadi (`flush()` xatoni yutadi) | Saqlanmagan javob bilan natija chiqishi xavfi | Saqlash muvaffaqiyati yakunlashdan oldin tekshirilsin; muvaffaqiyatsiz bo‘lsa yakunlash to‘xtasin va qayta urinish taklif qilinsin |
| Mashqdagi bayroq belgilarining faqat joriy holatda saqlanishi | Yangilashda belgilashlar yo‘qolishi mumkin | Doimiy saqlashdan ajratilgan holda tiklanish siyosati aniq bo‘lsin |
| Kontentni sig‘dirish uchun masshtabni keskin kamaytirish | Matn va bosish joylari maydalanishi mumkin | O‘qiluvchanlikni saqlagan scroll/reflow; faqat ekran ichiga sig‘ishi yetarli emas |
| Mehmon sessiyasi cookie bilan cheklangan | Cookie yo‘qolsa tarixga odatiy qayta kirish yo‘q | Mavjud yaxshiroq hisob tizimi saqlanishi mumkin |
| Ayrim Pro reklama matnlari qat’iy qiymatlar bilan yozilgan | Kontent soni/narx joriy holatga mos kelmasligi mumkin | Eskirgan son va tijoriy va’dalar tekshirmasdan ko‘chirilmasin |

Bu bandlar asosiy 45 savolli format, mashq oqimi va original dizayn talabini o‘zgartirmaydi; maqsad ularni ishonchli amalga oshirishdir.

## 12. Ishlarni bajarish ketma-ketligi

| Bosqich | Ishlar | Tugash mezoni |
|---|---|---|
| 1 — Asosiy test mosligi | K01–K07: uch tur, 45 savol, formulalar/chizmalar, vaznli hisoblash, yetti blok | Variant A kontenti va baholashi original bilan mos; yopiq, moslashtirish va ochiq savollar to‘liq ko‘rinadi |
| 2 — Faol imtihon ishonchliligi | E04–E09: qoidalar, taymer, saqlash, navigator, topshirish, natija/tahlil | Ruxsat berilgan test muhitida to‘liq urinish va uzilish/tiklanish ssenariylari o‘tadi |
| 3 — Mashq | E10–E14: element, qiyinlik, son, uch rejim, tekshirish oynasi, natija | Har bir rejimning boshidan oxirigacha oqimi originalga mos |
| 4 — Qolgan funksiyalar | Tarix/grafik, xatolar, saqlanganlar, DTM, tillar, profil, huquqlar | Barcha original bo‘limlar appdan ochiladi va haqiqiy ma’lumot bilan ishlaydi |
| 5 — Vizual tenglik | Original rang/shrift/komponentlar, mobil va desktop, SAT matnlarini tozalash | Ekranlar original dizayn tizimi bilan bir xil mahsulot sifatida ko‘rinadi |
| 6 — Admin va yakuniy qabul | Import, nashr, rollar, audit; barcha qabul ssenariylari | Funksional, kontent va UI ro‘yxatida ochiq majburiy band qolmaydi |

Katalogdagi kategoriya xatosi va SAT matnlarini tozalash birinchi bosqich bilan birga bajarilishi mumkin. Biror bosqich bu hujjat bilan bajarilgan deb hisoblanmaydi.

## 13. Qabul qilish checklisti

Quyidagi kataklar kelajakdagi ishlab chiqish va tekshiruv uchun. Hozircha bajarilgan deb belgilanmagan. Yangi urinish va ma’lumot o‘zgartiruvchi sinovlar faqat bunga ruxsat berilgan test hisobida/muhitida bajariladi.

### Kontent va baholash

- [ ] Variant A 45 topshiriqdan iborat, raqamlar 1–45.
- [ ] 32 Y-1, 3 Y-2, 10 O saqlangan; yetti blok taqsimoti originalga teng.
- [ ] Y-2 uch band va umumiy A–F variantlar bilan bitta savol sifatida chiqadi.
- [ ] Ochiq savollar a/b javoblarini alohida qabul qiladi va baholaydi.
- [ ] `1/2`, `0.5`, `0,5` kabi teng javoblar original kabi tekshiriladi.
- [ ] Savol, variant, yechim va tipik xatodagi formulalar xom LaTeX ko‘rinishida chiqmaydi.
- [ ] Variant A dagi 14 ta chizma mavjud va o‘qiladi; matnli o‘rinbosarga aylantirilmagan.
- [ ] Test ma’lumotlari uchun xom ball, maksimum, /75, yaxlitlash va daraja original algoritm bilan teng.
- [ ] 46/50/55/60/65/70 chegaralarida darajalar to‘g‘ri.
- [ ] Natija “taxminiy” deb ko‘rsatiladi; Rasch yoki rasmiy sertifikat natijasi deb taqdim etilmaydi.

### Imtihon oqimi

- [ ] Qoidalar ekrani 45 topshiriq va 150 daqiqani to‘g‘ri ko‘rsatadi.
- [ ] Javob almashtirish, oldingi/keyingi va raqamli navigatsiya ishlaydi.
- [ ] Taymer yangilashda qayta boshlanmaydi; oxirgi besh daqiqalik holat va vaqt tugashi ishlaydi.
- [ ] Aloqa uzilishi/tiklanishida javoblar yo‘qolmaydi; saqlash xatosi yashirilmaydi.
- [ ] Navigator qisman javobli, bo‘sh, to‘liq va belgilangan holatlarni tushunarli beradi.
- [ ] Topshirish tasdig‘i va bekor qilish ishlaydi; takror yuborish natijani buzmaydi.
- [ ] Savol kalitlari/yechimlar imtihon davomida oshkor bo‘lmaydi.

### Mashq oqimi

- [ ] Yetti bo‘limdagi 21 mazmun elementi va mavjud savollar soni ko‘rinadi.
- [ ] Barchasi/L1/L2/L3 va 5/10/15/20/30 tanlovlari ishlaydi.
- [ ] Bo‘sh yoki yetarli bo‘lmagan zaxira tushunarli boshqariladi.
- [ ] Oddiy mashq taymersiz, vaqtli mashq taymerli va darhol tekshirish bilan ishlaydi.
- [ ] Imtihon rejimidagi mashq yakunlashgacha javobni ochmaydi.
- [ ] Vaqtli mashqda umumiy vaqt savol soni × 180 soniya.
- [ ] To‘g‘ri/xato/qisman tekshirish oynasi, yechim va Keyingi/Yakunlash ishlaydi.
- [ ] Mashqni yakunlash, natija tahlili va qayta sozlashga o‘tish ishlaydi.
- [ ] Tekshirilmagan kiritma va saqlash xatosi sabab javob jim yo‘qolmaydi.

### Sahifalar va UX/UI

- [ ] Milliy sertifikat kartalari to‘g‘ri kategoriyada; SAT shablon matnlari olib tashlangan.
- [ ] Bosh sahifa, imtihon, mashq, tarix, xatolar, saqlanganlar va DTM yo‘llari mavjud.
- [ ] Natijada yetti blok tahlili, savollar gridi va alohida savol tafsiloti mavjud.
- [ ] Tarix grafigi va bir xil formatdagi ball statistikasi mavjud.
- [ ] Doimiy saqlash va urinish ichidagi belgilash alohida ishlaydi.
- [ ] To‘rt til va uzun tarjimalar maketni buzmaydi.
- [ ] Profil, rozilik/maxfiylik va Pro huquqlari original vazifalarni qamrab oladi.
- [ ] Original brend nomi, ranglar, shriftlar, kartalar, tugmalar va modal uslublari qo‘llangan.
- [ ] Mobil 390 × 844 hamda keng desktopda asosiy amallar o‘qiladi va ochiq.
- [ ] Uzoq formula/chizma, ochiq klaviatura va modal fokusi bilan boshqaruv ishlaydi.
- [ ] Admin import/nashr/rollar/audit jarayonlari original imkoniyatlariga mos.

Originalda avtomatik testlar bor, jumladan kontent, ball, javob normallashtirish, saqlash navbati, baza va UI tekshiruvlari. Ayrim UI testlari statik HTMLni tekshiradi; ular haqiqiy brauzerdagi to‘liq oqimni isbotlamaydi. App kodi va test to‘plami taqdim etilmagan, shu sabab uning avtomatik test qamroviga baho berilmagan. Ushbu ishda test/build/live skriptlar ishga tushirilmagan.

## 14. Manbalar va tekshiruv cheklovlari

| Yo‘nalish | Original manba |
|---|---|
| Format va darajalar | [config/exam-format.math-v1.ts](../config/exam-format.math-v1.ts) |
| Ball hisoblash va sonli javoblar | [scoring.ts](../lib/exam/scoring.ts), [normalize-answer.ts](../lib/exam/normalize-answer.ts) |
| Imtihon oynasi | [exam-runner.tsx](../components/exam/exam-runner.tsx), [question-view.tsx](../components/exam/question-view.tsx) |
| Javob turlari | [answer-y1.tsx](../components/exam/answer-y1.tsx), [answer-y2.tsx](../components/exam/answer-y2.tsx), [answer-o.tsx](../components/exam/answer-o.tsx) |
| Navigator va topshirish | [navigator.tsx](../components/exam/navigator.tsx), [questions-drawer.tsx](../components/exam/questions-drawer.tsx), [submit-dialog.tsx](../components/exam/submit-dialog.tsx) |
| Formulalar va chizmalar | [markdown.tsx](../components/math/markdown.tsx), [figure.tsx](../components/exam/figure.tsx) |
| Saqlash va javob holati | [save-queue.ts](../lib/exam/save-queue.ts), [answer-state.ts](../lib/exam/answer-state.ts) |
| Mashq | [config.ts](../lib/practice/config.ts), [practice-setup.tsx](../components/practice/practice-setup.tsx), [practice-runner.tsx](../components/practice/practice-runner.tsx), [reveal-sheet.tsx](../components/practice/reveal-sheet.tsx) |
| Tahlil | [review-grid.tsx](../components/exam/review-grid.tsx) |
| Tarix, xatolar, saqlanganlar | [history](../app/history/page.tsx), [mistakes](../app/mistakes/page.tsx), [saved](../app/saved/page.tsx) |
| DTM | [calculator.tsx](../components/dtm/calculator.tsx) |
| Navigatsiya | [nav-links.ts](../components/nav-links.ts) |
| Import | [import-schema.ts](../lib/content/import-schema.ts), [import-format.md](import-format.md), [Variant A v2](../content/export/variant-A.v2.json) |
| Kirish va admin | [auth.md](auth.md), [admin.md](admin.md) |
| Dizayn | [globals.css](../app/globals.css), [design.md](design.md), [brandbook.md](brandbook/brandbook.md) |

**Appda ko‘rilgan:** bosh sahifa, katalog/qidiruv/kategoriya filtrlari, mavjud natijalar, Variant A savollari tahlili va profil. Desktop hamda 390 × 844 brauzer ko‘rinishi tekshirildi. Shaxsiy profil qiymatlari bu hujjatga kiritilmadi.

**Appda tekshirilmagan:** yangi urinish, faol test taymeri, javoblarni saqlash, offline tiklanish, topshirish, yangi mashq sessiyasi, profilni o‘zgartirish, parolni tiklash, dark mode ishlashi, admin va server/API implementatsiyasi.

Mobil ko‘rish kengaytmasi ichida paydo bo‘lgan 404 holati appning tasdiqlangan xatosi ro‘yxatiga kiritilmadi: alohida toza tabdagi tekshiruvda mavjud natija sahifalari ochildi.

**Yakuniy qabul mezoni:** app original Milliy sertifikatning 45 savolli matematika imtihonini, uch rejimli mashqini, tahlil va yordamchi bo‘limlarini kontent yo‘qotishsiz taqdim etadi; ekranlar original dizayn tizimiga mos; tekshirilmagan bandlar alohida sinovdan o‘tmaguncha “tayyor” deb belgilanmaydi.
