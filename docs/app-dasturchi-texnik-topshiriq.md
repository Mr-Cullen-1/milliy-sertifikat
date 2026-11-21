# Texnik topshiriq: appni Milliy sertifikat originaliga moslashtirish

**Versiya:** 1.0  
**Sana:** 2026-11-21  
**Ijrochi:** app dasturchisi / ishlab chiqish jamoasi  
**Asos:** [App va Milliy sertifikat taqqoslash hujjati](app-milliy-sertifikat-taqqoslash.md)

## 1. Vazifa va majburiy mezon

Appda original **Milliy sertifikat — Matematika** loyihasining test formati, mashq funksiyasi, ekranlari, baholashi, kontenti va dizaynini ta’minlash.

**Original Milliy sertifikat asosiy mezon hisoblanadi.** Appning mavjud SAT formati sabab savollarni soddalashtirish, ochiq topshiriqlarni chiqarib tashlash yoki moslashtirishni alohida A–D savollarga aylantirish mumkin emas.

Mezonlar quyidagi tartibda qo‘llanadi:

1. Ushbu topshiriqdagi aniq talablar va qabul mezonlari.
2. Originaldagi joriy konfiguratsiya, baholash va funksional kod.
3. Original dizayn tokenlari, komponentlari va brandbookdagi **Manba** bandlari.
4. Taqqoslash hujjatidagi kuzatuvlar va dalillar.

Brandbookdagi **Taklif** bandlari va eski rejalardagi amalga oshirilmagan funksiyalar majburiy scope’ga avtomatik kirmaydi. Texnologiya, baza tuzilishi va URL nomlari original bilan aynan bir xil bo‘lishi shart emas; funksional natija va foydalanuvchi tajribasi mos bo‘lishi kerak.

Appning ichki kodi va faol test jarayoni auditda tekshirilmagan. Bunday funksiyalarni yo‘q deb taxmin qilish o‘rniga, mavjud implementatsiyani quyidagi qabul mezonlari bilan tekshirish va yetishmagan qismini bajarish kerak.

## 2. Ustuvorlik va topshirish tartibi

| Ustuvorlik | Ma’nosi | Vazifalar |
|---|---|---|
| **P0 — birinchi navbat** | Testning mazmuni, hisoblash va javoblarning saqlanishini to‘g‘ri qilish. Bu bandlarsiz Milliy sertifikat imtihoni ishga tayyor emas. | TT-01–TT-07 |
| **P1 — asosiy foydalanuvchi funksiyalari** | To‘liq mashq oqimi, original UI va asosiy o‘quvchi bo‘limlari. | TT-08–TT-14 |
| **P2 — to‘liq moslikni yakunlash** | DTM, admin boshqaruvining qolgan qismlari va yakuniy qabul. P2 ham majburiy; uni bajarishsiz loyiha to‘liq topshirilgan hisoblanmaydi. | TT-15–TT-17 |
| **Keyingi bosqich — ixtiyoriy** | Originaldan tashqari mahsulot rivojlantirish. Ushbu topshiriqning majburiy qismiga kirmaydi. | 8-bo‘lim |

**Bajarish ketma-ketligi:** TT-01 → TT-02/03 → TT-04/05 → TT-06. TT-07 va dizayn asoslari TT-08 birinchi bosqich bilan parallel bajarilishi mumkin. Mashq TT-09/10 umumiy savol, render, baholash va saqlash qismlariga tayanadi. TT-17 uchun dalillar har bir vazifa davomida yig‘iladi.

## 3. P0 — imtihonning to‘g‘ri ishlashi

### TT-01. Ma’lumot modeli va yo‘qotishsiz import

**Muammo:** ko‘rilgan Variant A 41 ta bir turdagi savolga aylangan; 10 ochiq topshiriq yo‘qolgan.  
**Bog‘liqlik:** yo‘q. **Audit bandlari:** K01–K03.

**Bajarilsin:**

- App modeli `y1`, `y2`, `o` turlarini saqlasin; tur bo‘yicha payload va javob kaliti tekshirilsin.
- To‘liq mock: 1–32 Y-1; 33–35 Y-2; 36–45 O; jami 45; davomiylik 9000 soniya.
- Bo‘lim taqsimoti tekshirilsin: sonlar 2, algebra 11, tenglama 8, funksiyalar 3, analiz 4, geometriya 14, to‘plam yo‘nalishi 3. Turlar bo‘yicha batafsil taqsimot asosiy taqqoslash hujjatining 3.2-bo‘limida.
- Barqaror savol ID, tartib, blok, mavzu/mazmun elementi bilan bog‘lanish, qiyinlik, vazn, matn, payload, kalit, yechim, tipik xato, chizma va tarjimalar saqlansin.
- Mock kontenti va mashq zaxirasi maqsadi bo‘yicha ajratilsin. Mashq to‘plamiga 45 savolli mock cheklovi qo‘llanmasin.
- [Variant A v2](../content/export/variant-A.v2.json) tayanch namuna bo‘lsin; appdan olingan `variant-a-exam.json` dagi 41 savolli eksport asos qilib olinmasin (bu fayl original loyiha omborida yo‘q).
- Noto‘g‘ri import savol raqami/maydoni va sababi bilan rad etilsin; qisman yuklangan to‘liq mock nashr qilinmasin.
- Takror import dublikat yaratmasin. Kontent yangilanishi mavjud yakunlangan urinish mazmuni va ballini o‘zgartirmasin: versiyalash yoki teng himoya ishlatilsin.
- Eski 41 savolli Variant A natijalari o‘z tarixiy formati bilan saqlansin. Ular yangi 45 savolli variantga majburan bog‘lanmasin va qayta hisoblanmasin.
- Original A–O kontenti importga tayyorlansin; katalogga faqat nashr holati va kirish huquqiga mos variantlar chiqarilsin.

**Qabul mezonlari:**

1. Variant A importidan keyin 45 savol, 32/3/10 tur va 14 chizma mavjud; matn, kalit va yechimlar yo‘qolmagan.
2. Shu faylni qayta import qilish yangi dublikat variant/savollar yaratmaydi.
3. 44 savolli mock, noto‘g‘ri Y-2 payload yoki mos kelmagan javob kaliti aniq xato beradi.
4. Eski 41 savolli natija ochilganda o‘sha urinishdagi savollar va avvalgi natija saqlanadi.

### TT-02. Uch turdagi savol oynalari

**Bog‘liqlik:** TT-01. **Audit bandlari:** K02–K03, E05–E06.

**Bajarilsin:**

- **Y-1:** shart/chizma va A–D variantlar; bitta tanlov, tanlovni almashtirish.
- **Y-2:** bitta raqam ostida umumiy shart, uchta band va umumiy A–F variantlar; har band javobi alohida saqlansin. Band ID lariga bog‘lansin, faqat massiv indeksiga tayanmasin.
- **O:** a va b uchun alohida javob maydoni; manfiy son, kasr, nuqta/vergul bilan son kiritish; mobil klaviaturada kerakli belgilar mavjud bo‘lsin.
- Oldingi/keyingi, 1–45 navigator, joriy savol va vaqtincha belgilash ishlasin.
- Ko‘p qismli savolda bo‘sh, qisman to‘ldirilgan va to‘liq javobli holatlar ajratilsin. Belgilangan holat javobning to‘liqligini yashirmasin.
- Bir xil savol komponentlari mock, mashq va natija tahlilida mazmunni bir xil ko‘rsatsin.

**Qabul mezonlari:** 33-savolning uch bandi navigator savollar sonini oshirmaydi; 36-savolda a/b mustaqil kiritiladi; savollar orasida yurib qaytganda javoblar saqlanadi; faqat a kiritilgan savol “to‘liq” deb belgilanmaydi.

### TT-03. Formula va chizmalarni tiklash

**Bog‘liqlik:** TT-01. **Audit bandlari:** K04–K05.

**Bajarilsin:**

- Markdown va matematik yozuvni savol, variantlar, Y-2 bandlari, yechim va tipik xato matnlarida render qilish.
- `$...$` va `$$...$$` ifodalarini kasr, ildiz, daraja, indeks va boshqa original belgilar bilan chiqarish.
- SVG chizmalar, o‘lchamlar, belgilar va tavsifni ko‘rsatish; `[Chizma: ...]` matni bilan almashtirmaslik.
- SVG/Markdown orqali bajariladigan skript yoki xavfli tashqi kontentni qabul qilmaslik; xavfsiz sanitizatsiya original import qoidalariga mos bo‘lsin.
- Uzun formula va chizmalar uchun o‘qiladigan o‘lcham, zarur bo‘lsa ichki scroll/kattalashtirish; sahifa butunlay yon tomonga chiqib ketmasin.

**Qabul mezonlari:** Variant A dagi formulali savol, 24-savol rombi va uch turdagi yechimlar mobil/desktopda to‘g‘ri ko‘rinadi; foydalanuvchiga xom `\frac`, `\sqrt` yoki dollar chegaralari chiqmaydi; chizma matnlari kesilmaydi.

### TT-04. Serverda baholash va /75 natija

**Bog‘liqlik:** TT-01. **Audit bandlari:** K06.

**Bajarilsin:** original [scoring.ts](../lib/exam/scoring.ts), [format konfiguratsiyasi](../config/exam-format.math-v1.ts) va [normalize-answer.ts](../lib/exam/normalize-answer.ts) bilan bir xil hisoblashni ta’minlash.

| Holat | Ball |
|---|---:|
| Y-1 L1 yoki L2 to‘g‘ri | 1,3 |
| Y-1 L3 to‘g‘ri | 2,2 |
| Y-2 barcha uch juftlik to‘g‘ri | 2,2 |
| Y-2 biror juftlik xato/bo‘sh | 0 |
| O faqat a to‘g‘ri | 1,5 |
| O faqat b to‘g‘ri | 1,7 |
| O ikkala qism to‘g‘ri | 3,2 |
| Xato yoki javobsiz | 0 |

- Y-1/Y-2 uchun individual vazn berilgan bo‘lsa original algoritmdagidek qo‘llansin.
- Xom ball va maksimal ball savollar asosida hisoblansin. `/75 = xom / maksimal × 75`; yaxlitlash original bilan bir xil bo‘lsin.
- Darajalar: 46 C; 50 C+; 55 B; 60 B+; 65 A; 70 A+. 46 dan pastda sertifikat darajasi berilmasin.
- Ochiq javoblar son jihatidan tekshirilsin: `1/2 = 0.5 = 0,5`. Noto‘g‘ri yoki nol maxrajli ifoda to‘g‘ri javobga aylanmasin.
- Natija serverda hisoblanadi; mijoz yuborgan tayyor ball/daraja qabul qilinmaydi.
- Yaxlitlash, daraja aniqlash, ochiq javobni o‘qish va kechikish imkoni (grace) qoidalarining aniq qiymatlari 7.1-bo‘limda; ular shu vazifaning qabul testlariga kiradi.
- Natijada **“Taxminiy natija — rasmiy sertifikat bali emas”** mazmuni bo‘lsin. `phaseA-linear-v1` Rasch modeli deb nomlanmasin.

**Qabul mezonlari:** barcha jadval holatlari, individual vazn, sonli ekvivalentlar va daraja chegaralarining osti/ustini qamrab olgan testlar original bilan bir xil natija beradi. Barcha javoblar xato bo‘lsa 0; barchasi to‘g‘ri bo‘lsa 75. a/b natijasi alohida qaytariladi.

### TT-05. Urinish, taymer, saqlash va yakunlash

**Bog‘liqlik:** TT-01/02/04. **Audit bandlari:** E04–E07; appdagi mavjud holati tekshirilmagan.

**Bajarilsin:**

- Boshlashdan oldin variant, 45 topshiriq, 150 daqiqa va original qoidalarni ko‘rsatish.
- Urinish uchun egasi, kontent/format versiyasi, server boshlanish/tugash vaqti va status saqlansin.
- Taymer server deadline’iga tayansin; qayta ochish/refresh vaqtni qayta boshlamasin. Davriy sinxronlash va besh daqiqa qolgandagi ogohlantirish bo‘lsin.
- Har o‘zgarishni saqlash navbatiga qo‘yish, xatoda qayta yuborish va tiklash; “Saqlanmoqda / Saqlandi / Saqlanmadi” holatlari.
- Kech kelgan eski so‘rov yangi javobni bosib ketmasin; server tasdig‘idan keyingina navbat tozalansin.
- Qo‘lda topshirishda saqlanmagan javoblar avval yuborilsin. Xato bo‘lsa “yakunlandi” deb ko‘rsatilmasin; qayta urinish mumkin bo‘lsin.
- Tasdiqlash oynasida bo‘sh, qisman va belgilangan savollar soni hamda “Davom ettirish / Topshirish” amallari chiqsin.
- Vaqt tugaganda server yakunlashni nazorat qilsin. Deadline/grace chegaralari original finalize qoidalariga mos bo‘lsin; offline holat yangi cheksiz javob berish vaqtini yaratmasin. Qabul qilinmagan kech javoblar yashirilmasin.
- Takror yakunlash bitta natijani qaytarsin; yakunlangan javoblar oddiy tahrirga yopilsin.
- Foydalanuvchi faqat o‘z urinishiga kira olsin. Mock davomida kalit/yechimlar mijozga yuborilmasin.

**Qabul mezonlari:** test muhitida refresh, vaqt tugashi, aloqa uzilishi/tiklanishi, tez javob almashtirish, saqlash xatosi va ikki marta topshirish sinaladi. Yakuniy ball server qabul qilgan javoblarga teng; boshqa foydalanuvchi urinishiga kirish rad etiladi. Testlar ishlab turgan foydalanuvchi tarixida bajarilmaydi.

### TT-06. Natija va savollar tahlili

**Bog‘liqlik:** TT-02/03/04/05. **Audit bandlari:** K06–K07, E08–E09.

**Bajarilsin:**

- Asosiy blok: taxminiy /75 ball, daraja, xom/maksimal ball, sarflangan vaqt va javob statistikasi.
- Yetti bo‘lim kesimida natija; Milliy sertifikat ichida “Reading & Writing 0/0” chiqarilmasin.
- 1–45 raqamli grid va savol tafsiloti oynasi: shart, chizma, o‘quvchi javobi, to‘g‘ri javob, yechim, tipik xato.
- Y-2 bandlari va O a/b natijalari alohida ko‘rsatilsin; qisman ball butunlay xato natija bilan aralashtirilmasin.
- Filtrlar aniq nomlansin: javobsiz savollar xato filtriga kirsa, uning nomi buni bildirsin.
- Bepul/Pro holatlari TT-14 bilan uyg‘un bo‘lsin; ma’lumot cheklovi serverda qo‘llansin.

**Qabul mezonlari:** istalgan savolga grid orqali o‘tiladi; uchala tur tafsiloti to‘liq va formula/chizmalar bilan ochiladi; ekrandagi umumiy ball va bo‘limlar summasi server natijasiga mos.

### TT-07. Milliy sertifikat katalogi va mahsulot matnlari

**Bog‘liqlik:** TT-01. **Audit bandlari:** K08–K09.

**Bajarilsin:**

- Milliy sertifikat kategoriyasi haqiqiy Milliy sertifikat variantlarini chiqarsin; SAT filtri ularga mos kelmasa, ularda chiqarmasin.
- Variant kartasida nom, Matematika yo‘nalishi, 45 topshiriq, 150 daqiqa va kirish holati bo‘lsin.
- Milliy sertifikat sahifalari/profil maqsadidan College Readiness, Math and Reading & Writing, SAT tayyorgarligi kabi mos kelmagan shablon matnlarini almashtirish.
- Katalogdagi qidiruv va kategoriya birgalikda ishlasin; bo‘sh natija noto‘g‘ri ma’lumotni yashirish uchun ishlatilmasin.
- Bosh sahifada Imtihon va Mashq asosiy amallar bo‘lsin; oxirgi Milliy sertifikat natijasi tegishli /75 formatda berilsin.
- Eski SAT/test ma’lumotlari o‘chirib yuborilmasin; Milliy sertifikat statistikasi va katalogidan turiga qarab ajratilsin.

**Qabul mezonlari:** Variant A Milliy sertifikat filtrida chiqadi; qidiruv+filtr to‘g‘ri ishlaydi; kartada 45/150 ko‘rsatiladi; tegishli sahifalarda SAT shablon matnlari qolmaydi.

## 4. P1 — mashq, oynalar va asosiy bo‘limlar

### TT-08. Original dizayn tizimi va navigatsiya

**Bog‘liqlik:** dastlab yo‘q, yakuniy ekran tekshiruvi qolgan vazifalarga bog‘liq. **Audit bandlari:** K12, E02/E06/E09/E23.

**Bajarilsin:**

- [Original CSS tokenlari](../app/globals.css), [dizayn hujjati](design.md) va [brandbook](brandbook/brandbook.md) asosida komponentlar birlashtirilsin.
- Nom: Milliy sertifikat — Matematika. Asosiy rang `#E8590C`, aksent `#4B2FD0`, sahifa `#F3F1FB`, matn `#1E1B39`; qolgan ranglar ham original tokenlardan olinsin.
- Original shriftlar, ikonka/art manbalari, yumaloq kartalar, qalin pastki qirrali tugmalar, tanlangan/xato/to‘g‘ri holatlar moslashtirilsin.
- Asosiy navigatsiya: Imtihonlar, Mashq, Tarix, Xatolar, DTM. Saqlangan savollar, Profil va Tilga ko‘rinadigan kirish yo‘li bo‘lsin.
- Desktopda tor mobil ustun o‘rniga originalga mos keng maket, imtihonda savol+navigator; mobilga mos drawer va pastki navigatsiya.
- Tahlil modali originaldagi taxminan 80% ekran balandligidagi oynaga, mobil savollar drawer’i esa o‘ngdan ochiladigan panelga moslashtirilsin.
- Yuklanish, bo‘sh holat, tarmoq xatosi, ruxsat cheklovi va sessiya tugashi matnlari bo‘lsin.
- Modal fokusi, yopish tugmasi/Esc, klaviatura navigatsiyasi ishlasin. Uzoq matnni ko‘rish uchun butun interfeys haddan tashqari kichraytirilmasin.

**Qabul mezonlari:** 390×844 va 1440×900 ko‘rinishlarda bosh sahifa, katalog, test, mashq va tahlil original bilan yonma-yon tekshiriladi; rang/shrift/komponentlar mos; tugmalar klaviatura ortida qolmaydi va sahifa gorizontal toshmaydi. Ishlayotgan brauzer appida ham tekshirilsin; faqat mobil simulyator kengaytmasi dalil bo‘lmasin.

### TT-09. Mashq sozlash va uch rejim

**Bog‘liqlik:** TT-01–TT-05, TT-08. **Audit bandlari:** K10, E10–E11.

**Bajarilsin:**

- Asosiy navigatsiyadan ochiladigan alohida Mashq sozlash oynasi.
- Yetti bo‘limga guruhlangan 21 mazmun elementi; har element/qiyinlik uchun haqiqiy mavjud savollar soni.
- Qiyinlik: Barchasi/L1/L2/L3. Savol soni: 5/10/15/20/30; standart 10.
- Yetarli savol bo‘lmasa mavjud son bilan ogohlantirish va tanlovni tuzatish yo‘li; 0 savolda boshlash bloklansin. Foydalanuvchiga bildirmasdan boshqa mavzu/qiyinlikdan to‘ldirilmasin.
- Har sessiyada tanlangan element, qiyinlik, son, rejim va tartib saqlansin.

| Rejim | Vaqt | Tekshirish va yechim |
|---|---|---|
| `practice` | Taymersiz | Foydalanuvchi “Tekshirish”ni bosganda |
| `timed` | Savol soni × 180 soniya | Foydalanuvchi “Tekshirish”ni bosganda |
| `exam` | Savol soni × 180 soniya | Yakunlangandan keyin |

- Faol mashqda savol, progress, rejim, kerakli taymer, navigatsiya, belgilash va yakunlash amallari.
- Uchala savol turi va formula/chizma rendereridan foydalanish.
- Qoralama saqlash va javobni tekshirish alohida amallar bo‘lsin: qoralama saqlash yechimni ochmasin. Tekshirilmagan kiritma refresh/yakunlashda jim yo‘qolmasin.
- Mashqning `exam` rejimida kalit va yechimlar yakunlashgacha yuborilmasin; boshqa rejimlarda faqat tegishli javob tekshirilgach va huquq doirasida ochilsin.

**Qabul mezonlari:** har rejim uchun kamida bitta to‘liq sessiya; savollar tanlangan element/qiyinlikka mos; 10 savolli vaqtli sessiya 30 daqiqa; oddiy mashqda taymer yo‘q; `exam` rejimida oraliq yechim ochilmaydi. Sozlamadagi va real sessiyadagi savol soni bir xil.

### TT-10. Mashq tekshirish oynasi, yakunlash va natija

**Bog‘liqlik:** TT-09. **Audit bandlari:** E12–E14.

**Bajarilsin:**

- “Tekshirish”dan keyin yuqoridan ochiladigan oyna: To‘g‘ri/Noto‘g‘ri/Qisman to‘g‘ri, kerakli to‘g‘ri javob, yechim va tipik xato.
- a/b natijalarini alohida berish; formulalar to‘liq render qilinsin.
- Oyna kontentga mos, maksimum 62% ekran balandligida; uzun yechim ichkarida scroll qilinsin. Yopish, Keyingi, oxirgi savolda Yakunlash.
- Yakunlash tasdig‘i bo‘sh/qisman javoblarni ko‘rsatsin. Saqlash xatosida muvaffaqiyatli yakunlangandek davom etilmasin.
- Natija: mazmun elementi, to‘g‘ri/jami, foiz, savollar gridi va tafsilotlari, “Yana mashq”.
- Mashq foizi to‘liq mock /75 bali yoki sertifikat darajasi sifatida taqdim etilmasin.

**Qabul mezonlari:** to‘g‘ri, xato va qisman javob uchun uch holat; uzun yechim va Pro cheklovi; Keyingi/Yakunlash; bekor qilish va saqlash xatosi sinaladi. “Yana mashq” sozlash oynasiga olib boradi.

### TT-11. Tarix, o‘sish grafigi va zaif mavzular

**Bog‘liqlik:** TT-04/06/07. **Audit bandlari:** E15.

**Bajarilsin:** yakunlangan mocklar ro‘yxati, sana/variant/ball/daraja va natijaga o‘tish; eng yaxshi/o‘rtacha /75 ball; oxirgi 12 natija grafigi; originalning kuzatuv chegaralari bilan zaif mavzular tahlili.

**Qabul mezonlari:** 4 savolli testning 100 foizi yoki eski SAT natijasi Milliy sertifikat /75 statistikasiga qo‘shilmaydi; ro‘yxatdagi natija kartasi to‘g‘ri urinishni ochadi; ma’lumot yetarli bo‘lmasa soxta zaif mavzu chiqarilmaydi. Bo‘sh tarix tushunarli holat bilan chiqadi.

### TT-12. Xatolar daftari va saqlangan savollar

**Bog‘liqlik:** TT-06, TT-14. **Audit bandlari:** K11, E16–E17.

**Bajarilsin:**

- Urinishlardan yig‘iladigan alohida Xatolar bo‘limi; originaldagi tanlash/guruhlash qoidalariga mos savol, yechim va tipik xato tafsilotlari.
- Alohida Saqlangan savollar to‘plami; savolni saqlash/olib tashlash va keyin qayta ochish.
- Doimiy saqlashni urinish ichidagi bayroq bilan aralashtirmaslik. Ma’lumot foydalanuvchi hisobiga bog‘lansin.
- Bitta savolni qayta saqlash dublikat yaratmasin; saqlash javob kalitini muddatidan oldin ochmasin.

**Qabul mezonlari:** turli urinishdagi xatolar bitta bo‘limdan ochiladi; saqlangan savol refreshdan keyin qoladi; olib tashlash ishlaydi; boshqa foydalanuvchi to‘plami ko‘rinmaydi; faol testdagi bayroq doimiy to‘plamga avtomatik qo‘shilmaydi.

### TT-13. Profil, rozilik va to‘rt til

**Bog‘liqlik:** TT-08 va mavjud hisob tizimi. **Audit bandlari:** E01/E19/E20/E22.

**Bajarilsin:**

- Ism-familiya, telefon, sinf va rozilikni original maqsadiga mos yig‘ish/tekshirish; maxfiylik sahifasiga havola.
- Profil tahriri mavjud urinishlarning egasini yoki tarixini o‘zgartirmasin.
- uz/ru/kaa/en tanlash, tanlovni saqlash; savol/variant/yechim va interfeysni original tarjimalar bilan ko‘rsatish.
- Tarjima yo‘q joydagi original fallback qoidasi saqlansin; bo‘sh matn chiqmasin. Qoraqalpoq matnlari uchun ekspert tekshiruvi zarurligi topshirish hisobotida qayd etilsin.
- Mavjud ishonchli login/parol tizimini originalning cookie bilan cheklangan mehmon hisobiga tushirish talab etilmaydi.

**Qabul mezonlari:** profilning zarur maydonlari tekshiriladi; roziliksiz aylanib o‘tish serverda ham oldi olinadi; til almashtirilganda javob ID lari/qiymatlari o‘zgarmaydi va uzun tarjima ekranni buzmaydi; profil yangilangandan keyin tarix saqlanadi.

### TT-14. Bepul/Pro kirish siyosati

**Bog‘liqlik:** TT-01/06/10/12. **Audit bandlari:** E21.

**Bajarilsin:**

- Originalga mos bepul variant belgisi va Pro talab qilinadigan kontentga kirishni ta’minlash.
- Mock va mashq tahlilidagi dastlabki besh savolning bepul yechim chegarasi, qolgan tafsilotlarga Pro nazorati.
- UI qulf/modal bilan birga server/API cheklovi; yashirilgan yechimlar oddiy foydalanuvchiga javob payloadida ketmasin.
- Huquq tugashi yoki o‘zgarishida original siyosatga mos holat; sotib olish va’dasi mavjud ishlaydigan yo‘lga mos bo‘lsin.
- Originaldagi eskirishi mumkin bo‘lgan narx/kontent sonini tekshirmasdan qattiq yozib qo‘ymaslik. To‘liq to‘lov integratsiyasi ushbu vazifaga avtomatik kirmaydi.

**Qabul mezonlari:** bepul va Pro test hisoblarida UI va bevosita API tekshiriladi; bepul hisob cheklangan yechimni ololmaydi, Pro hisob ruxsat etilganini ochadi; joriy audit hisobidagi ochiq 41 savol barcha hisoblarga siyosat sifatida ko‘chirilmaydi.

## 5. P2 — to‘liq moslik va topshirish

### TT-15. DTM kalkulyatori

**Bog‘liqlik:** TT-04/08. **Audit bandlari:** E18.

**Bajarilsin:** original [kalkulyator](../components/dtm/calculator.tsx) va tegishli hisoblash funksiyasidagi kiritish, tekshirish, natija va izohlarni appga ko‘chirish. Bu moslik vazifasida tashqi qoidalarni o‘zboshimchalik bilan yangilamaslik.

**Qabul mezonlari:** original bilan bir xil kirish qiymatlarida bir xil natija; daraja chegaralari va noto‘g‘ri qiymatlar tekshirilgan; kalkulyator asosiy navigatsiyadan ochiladi. Amaldagi rasmiy qoidalarga moslik alohida tekshiruv bo‘lsa, versiya/manba alohida qayd qilinadi.

### TT-16. Admin va kontent hayot sikli

**Bog‘liqlik:** TT-01/14. **Audit bandlari:** E24. Importning asosiy ishlashi TT-01 doirasida P0 da bajariladi.

**Bajarilsin:** admin/muharrir rollari; savol ro‘yxati va uch turdagi preview; import natijasi va xatolari; draft → published → archived oqimi; ishtirokchi/urinish/statistika; Pro huquqlarini boshqarish va audit jurnali.

**Original xatti-harakati:** muharrir (`editor`) JSON import va ko‘rishni bajara oladi; mock nashr/arxivlash/qayta ochish va audit jurnali faqat adminga (`admin`) ochiq.

**Qabul mezonlari:** muharrir import/ko‘rish vakolati bilan cheklanadi va admin nashr huquqini ololmaydi; nashr/arxiv katalogga to‘g‘ri ta’sir qiladi; eski urinishlar ochilishi buzilmaydi; muhim admin amallarida kim/qachon/nima o‘zgartirgani qayd qilinadi. Oddiy foydalanuvchi admin API ga kira olmaydi.

To‘liq vizual savol muharriri originalda tayyor funksiya deb talab qilinmaydi; JSON import va ko‘rish originalga moslik uchun asosdir.

### TT-17. Integratsion tekshiruv va topshirish paketi

**Bog‘liqlik:** barcha majburiy vazifalar.

**Bajarilsin:**

- Kontent, scoring, normalizatsiya, deadline, saqlash navbati, takror so‘rovlar va ruxsatlar uchun mazmunli avtomatik testlar.
- Test muhitida to‘liq mock, uch xil mashq, natija/tarix/xatolar/saqlash, til va bepul/Pro ssenariylarini boshidan oxirigacha tekshirish.
- Mobil va desktopda ekran/oyna holatlarini tekshirish. Faqat statik HTML yoki screenshot funksional tekshiruv o‘rnini bosmasin.
- Har TT uchun bajarilgan ish, test natijasi va dalil havolasini taqdim qilish.
- Eski ma’lumotlar saqlanishini tekshirish, migratsiya ketma-ketligi va muammo chiqsa ortga qaytish tartibini topshirish.

**Topshiriladigan materiallar:** ishlaydigan test muhiti/build; manba koddagi o‘zgarishlar; migratsiya/import yo‘riqnomasi; test hisoblarining rollari va foydalanish ko‘rsatmasi; avtomatik va qo‘lda test hisoboti; barcha ekranlardan dalillar; ma’lum cheklovlar ro‘yxati. Maxfiy kalit/parollar hisobotga yozilmasin.

**Qabul mezoni:** P0/P1/P2 vazifalarining qabul tekshiruvlari bajarilgan, bloklovchi xato qolmagan, 6-bo‘limdagi barcha ekranlar ochiladi. “Tekshirilmagan” yoki faqat maket ko‘rinishidagi funksiya “tayyor” deb belgilanmaydi.

## 6. Majburiy ekranlar va oynalar ro‘yxati

| Ekran/oyna | Mas’ul vazifa |
|---|---|
| Kirish / birlamchi profil va rozilik | TT-13 |
| Bosh sahifa | TT-07/08 |
| Imtihonlar katalogi va qidiruv | TT-07 |
| Imtihon oldi qoidalari | TT-05 |
| Y-1, Y-2, O faol test oynalari | TT-02/03/05 |
| Mobil savollar drawer’i | TT-02/08 |
| Imtihonni topshirish tasdig‘i | TT-05 |
| Imtihon natijasi va yetti bo‘lim tahlili | TT-06 |
| Savollar gridi va tafsilot modali | TT-06/08 |
| Mashq sozlash | TT-09 |
| Oddiy / vaqtli / imtihon mashq oynalari | TT-09 |
| Mashq javobi tekshirish oynasi | TT-10 |
| Mashqni yakunlash tasdig‘i | TT-10 |
| Mashq natijasi va savollar tahlili | TT-10 |
| Natijalar tarixi va grafik | TT-11 |
| Xatolar daftari | TT-12 |
| Saqlangan savollar | TT-12 |
| Profil tahriri, til tanlash, maxfiylik | TT-13 |
| Pro cheklovi va tushuntirish oynasi | TT-14 |
| DTM kalkulyatori | TT-15 |
| Admin xizmat ekranlari | TT-16 |
| Yuklanish / bo‘sh / xato / sessiya tugashi | TT-05/08 va tegishli oqim |

## 7. Ma’lumot almashish va ishlab chiqish qoidalari

Quyidagilar mantiqiy shartnoma; endpoint va jadval nomlarini ijrochi app arxitekturasiga mos tanlaydi:

| Ma’lumot/amal | Majburiy xatti-harakat |
|---|---|
| Savolning ochiq ma’lumoti | ID/versiya, tartib, tur, mavzu, matn, turga mos payload, chizma, til; faol imtihonda kalit/yechim yo‘q |
| Y-1 javobi | Tanlangan A–D qiymati |
| Y-2 javobi | Band ID → A–F xaritasi; bitta savolga tegishli |
| O javobi | a/b qiymatlari alohida; foydalanuvchi kiritmasi saqlanib, tekshirishda normallashtiriladi |
| Javobni saqlash | Urinish egasi/statusi/deadline tekshiriladi; eski so‘rov yangi qiymatni almashtirmaydi; server tasdig‘i bor |
| Mashq qoralamasi | Javob saqlanadi, avtomatik ravishda yechim ochilmaydi |
| Mashqni tekshirish | Rejim va huquq tekshiriladi, tegishli feedback qaytadi |
| Yakunlash | Bir marta hisoblangan barqaror natija; takror so‘rov bir xil natijani qaytaradi |
| Natijani olish | Foydalanuvchi huquqi, kontent versiyasi va bepul/Pro cheklovi saqlanadi |
| Saqlangan savollar | Foydalanuvchiga tegishli to‘plam; javob kalitini muddatidan oldin ochmaydi |

Originaldagi ma’lum zaifliklar ko‘chirilmaydi: qisman javobni to‘liq sanash, saqlash muvaffaqiyatsiz bo‘lsa ham yakunlash (originalda mashqning `exam` rejimida), tekshirilmagan mashq javobini jim yo‘qotish (originalda `practice`/`timed` rejimlarida: javob faqat “Tekshirish”da serverga yoziladi) va UI bilan yashirib serverdan yechimni berib yuborish. Bu himoyalar funksional moslikni ishonchli bajarish talabidir.

### 7.1. Original aniq qoidalari (kodni o‘qimasdan bajarish uchun)

Quyidagilar original kodidan (`lib/exam/*`, `config/exam-format.math-v1.ts`, `supabase/migrations/…_exam_engine.sql`) olingan aniq qiymatlar. Natija originalnikidan farq qilmasligi uchun appda xuddi shunday bajarilsin. Bu bandlar yuqoridagi TT-04 va TT-05 qabul testlarining bir qismi.

**Hisoblash va yaxlitlash**

| Qoida | Aniq xatti-harakat |
|---|---|
| Xom ball | Savollar ballari yig‘indisi **1 xonagacha** yaxlitlanadi (masalan, 1,3 + 2,2 + 1,5 = 5,0). Maksimal xom ball ham shunday yig‘iladi. |
| `/75` ball | `xom / maksimal × 75`, natija **1 xonagacha** yaxlitlanadi (`Math.round(x × 10) / 10`). |
| Daraja | Daraja **yaxlitlangan** `/75` ball bo‘yicha aniqlanadi: 49,96 → 50,0 → C+. 46,0 dan past bo‘lsa daraja yo‘q (bo‘sh), “C dan past” kabi sun’iy daraja yozilmaydi. |
| Maksimal ball (O) | Savolning maksimumi **javob kalitiga** qarab belgilanadi: kalitda faqat a bo‘lsa 1,5; faqat b bo‘lsa 1,7; ikkalasi bo‘lsa 3,2. Maksimum Y-1 uchun savol vazni yoki qiyinlik standarti (1,3 / 2,2), Y-2 uchun vazn yoki 2,2. |
| O ning to‘g‘riligi | Ikki bandli savolda “to‘g‘ri” = a va b ikkalasi to‘g‘ri; bir bandli savolda shu band to‘g‘ri. a/b natijasi alohida qaytariladi. |
| Y-1 / Y-2 solishtirish | Y-1: bo‘sh joylar olib tashlanadi, katta-kichik harf farqlanmaydi (`b` = `B`). Y-2: kalitdagi **har bir** band ID uchun harf mos kelishi shart (katta-kichik harf farqlanmaydi); bittasi xato yoki bo‘sh bo‘lsa, savol 0 ball. |

**Ochiq javobni (O) o‘qish va solishtirish**

- Kalitda bir nechta qabul qilinadigan shakl bo‘ladi (masalan, `["21/4", "5.25"]`); javob **shulardan biriga son jihatidan teng** bo‘lsa to‘g‘ri.
- Solishtirish aniq ratsional sonlarda (katta butun sonlar bilan), suzuvchi nuqtasiz: `1/2`, `0.5`, `0,5`, `2/4` teng.
- Barcha bo‘shliqlar (jumladan qattiq bo‘shliq) olib tashlanadi; `−` (U+2212) va `–` (en dash) oddiy minus deb o‘qiladi. Minus faqat boshida bo‘lishi mumkin (`-3/4` to‘g‘ri, `3/-4` yaroqsiz).
- O‘nlik ajratgich nuqta ham, vergul ham; `.5` va `,5` qabul qilinadi.
- Kasr: faqat **bitta** `/`; surat va maxraj ishorasiz o‘nlik son; maxraj nol bo‘lsa javob yaroqsiz (to‘g‘ri deb hisoblanmaydi).
- Qo‘llab-quvvatlanmaydi (yaroqsiz, 0 ball): aralash son (`1 1/2` — bo‘shliq olib tashlangani uchun `11/2` bo‘lib qoladi, shuning uchun kiritishda bunday yozuvga yo‘l qo‘ymaslik yoki ogohlantirish tavsiya etiladi), foiz belgisi, daraja/ildiz, ilmiy yozuv (`1e3`), uchta va undan ortiq `/`.
- Kiritish maydoni faqat raqam, `.`, `,`, `-`, `−`, `/` va bo‘shliqni qabul qiladi, uzunligi **64 belgidan** oshmaydi. Mobil ekran klaviaturasida shu belgilar bo‘lishi kerak.

**Muddat, saqlash va yakunlash**

| Qoida | Aniq qiymat |
|---|---|
| Muddat manbai | Faqat server (`deadline_at`, baza soati). Brauzer taymeri faqat ko‘rsatadi; har server javobidan soat siljishi yangilanadi. |
| Kechikish imkoni (grace) | Javob **muddatdan keyin 5 soniyagacha** qabul qilinadi (`graceSec = 5`, formatda sozlanadi). Undan keyin “muddat o‘tdi” xatosi. |
| Yopilgan urinish | Holati `in_progress` bo‘lmasa saqlash “urinish yopilgan” xatosi bilan rad etiladi. |
| Javob hajmi | Bitta javob qiymati JSON ko‘rinishida **2000 baytdan** oshmasin; undan katta qiymat rad etiladi. |
| Savol egaligi | Javob faqat shu mock tarkibidagi savolga yoziladi; boshqa savol ID si rad etiladi. |
| Taymer ko‘rinishi | Ogohlantirish **oxirgi 5 daqiqada**; 1 soniyadan kam qolsa ham `00:01` ko‘rsatiladi, `00:00` faqat muddat tugaganda. |
| Saqlash navbati | Har savol uchun faqat eng so‘nggi qiymat yuboriladi (birlashtirish); o‘zgarishdan **600 ms** keyin yuboriladi; yuborilayotganda kelgan yangi o‘zgarish yo‘qolmaydi. |
| Aloqa uzilishi | Navbat brauzer xotirasida saqlanadi; qayta urinish **1, 2, 4, 8, 15 s** (keyin 15 s ga qadar takrorlanadi); internet qaytganda darhol yuboriladi. |
| Server rad etishi | “Urinish yopilgan/muddat o‘tdi” bo‘lsa navbat to‘xtaydi va tozalanadi; “yaroqsiz qiymat” bo‘lsa shu yozuv tashlanib, qolganlari davom etadi. |
| Yakunlash | Urinish bir marta yopiladi; qayta chaqirish holatni o‘zgartirmaydi. Muddat o‘tgan bo‘lsa topshirilgan vaqt = `deadline_at` va sabab `timeout`; qo‘lda topshirilsa vaqt = hozirgi server vaqti va sabab `user`. Muddat o‘tganini sahifa ochilganda tekshirib yopish (lazy finalize) faqat server soati bo‘yicha amalga oshadi. |
| Ball yozish | Ball bir marta yoziladi (ikkinchi yozish rad etiladi); natija javoblar va kalitlardan serverda hisoblanadi. Kalit buzuq bo‘lsa jim 0 ball berilmaydi, xato qaytariladi. |
| Javob ochiqligi | Mock davomida kalit hech qachon mijozga qaytmaydi; yechim va tipik xato faqat topshirilgandan keyin qaytadi. |

**Eslatma:** original bu qoidalarning hammasini bajaradi, lekin 7-bo‘limdagi “ko‘chirilmaydigan zaifliklar” (mashqning `exam` rejimida saqlash xatosiga qaramay yakunlash va h.k.) bundan mustasno: ular appda to‘g‘ri bajarilishi kerak.

Amaldagi hisoblar, tarix va kontentni ommaviy o‘chirish bu topshiriq tarkibiga kirmaydi. Sinovlar ajratilgan test hisoblari/muhitida bajariladi. Ushbu hujjat yozilishi appga o‘zgartirish kiritilganini yoki productionga chiqarilganini anglatmaydi.

## 8. Majburiy scope’dan tashqari

Quyidagilar alohida keyingi topshiriq bilan bajarilishi mumkin; ular hozirgi majburiy funksiyalarni almashtirmaydi:

- Sun’iy intellekt asosida shaxsiy tayyorgarlik rejasi.
- Xatolarni oraliqli takrorlash va xatodan avtomatik yangi mashq tuzish.
- Mock va mashq tarixini yagona kengaytirilgan analitika paneliga birlashtirish.
- Yangi to‘lov provayderi yoki to‘liq vizual savol yaratish muharriri.
- Originaldan tashqari yangi imtihon turlari, gamifikatsiya va dark mode kengaytmalari.
- Rasmiy Rasch hisoblash modelini ishlab chiqish. Hozirgi vazifa originalning taxminiy `phaseA-linear-v1` hisoblashiga moslikdir.

## 9. Dasturchi uchun yakuniy topshirish shakli

Har bir TT bo‘yicha quyidagi jadval to‘ldirilsin:

| Vazifa ID | Holat | Bajarilgan ish | Test va dalil havolasi | Ochiq muammo |
|---|---|---|---|---|
| TT-01 … TT-17 | Bajarilmadi / Jarayonda / Tekshiruvda / Qabulga tayyor | Qisqa aniq tavsif | Test hisoboti, ekran yoki video, o‘zgarish havolasi | Bor bo‘lsa sabab va ta’sir |

**To‘liq tayyorlik:** 45 savolli original format + to‘g‘ri baholash + ishonchli imtihon + uch rejimli mashq + barcha majburiy bo‘lim/oynalar + original UI + test dalillari. Faqat dizaynni almashtirish yoki 45 savolni import qilish topshiriqning to‘liq bajarilishi hisoblanmaydi.
