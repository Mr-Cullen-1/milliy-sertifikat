# Milliy sertifikat — Matematika: Mock imtihon sayti (loyiha hujjati v0.1)

Sana: 2026-10-27 · Maqsad: Milliy sertifikat (matematika) imtihonining haqiqiy formatiga maksimal yaqin mock-platforma yaratish.
Bu hujjat — loyihalash bosqichi hujjati (v0.1). Amalga oshirish holati va hozirgi qarorlar: `CLAUDE.md`, `docs/auth.md`, `docs/admin.md`, `docs/content.md`, `docs/rasmiy-manbalar.md`, `docs/release.md`.

---

## 0. Ma'lumot ishonchliligi haqida (muhim)

Qidiruv vositasi (WebSearch) tashkilot sozlamalarida o'chiq bo'lgani uchun ma'lumot brauzer orqali yig'ildi. Rasmiy namunaviy test PDF'i (uzbmb.uz) havolasi ochilmadi (404), shuning uchun quyidagicha belgilar ishlatildi:

| Belgi | Ma'nosi |
|---|---|
| ✅ Rasmiy | Agentlikning rasmiy Telegram kanali (@milliy_sertifikat) e'lonlaridan |
| 🟡 Uchinchi tomon | TestMakon, Trylab kabi tayyorlov platformalari ma'lumoti — rasmiy tasdiqlanmagan |
| ❓ Taxmin | Biz loyiha uchun qabul qilgan farazlar — rasmiy manba bilan tekshirish kerak |

**Birinchi vazifa:** Agentlikning (Bilim va malakalarni baholash agentligi) rasmiy namunaviy matematika testini qo'lda yuklab, 3–5-bo'limlardagi 🟡/❓ qismlarni tasdiqlash.

---

## 1. Imtihon haqida umumiy ma'lumot

- Tashkilotchi: **Bilim va malakalarni baholash agentligi** ✅
- Ro'yxatdan o'tish: **my.gov.uz** → "Mening arizalarim" (natija va sertifikat ham shu yerda) ✅
- 2026-yil ikkinchi yarmida umumta'lim fanlaridan imtihonlar sentyabr–dekabr oylarida ✅
- Matematika bo'yicha sanalar 🟡: 28–29-sentabr, 2–4-oktabr (o'tgan), **23–24-noyabr 2026** (keyingi)
- To'lov 🟡: 594 000 so'm (1-sentabrdan)
- Sertifikat muddati 🟡: 3 yil; natija imtihondan keyin ~21 ish kuni ichida
- Natijalar **Rasch modeli** (xalqaro metodika) asosida hisoblanadi ✅
- Apellatsiya (chet tili uchun ✅ 3 kun ichida my.gov.uz orqali; matematika uchun xuddi shunday deb faraz qilinadi ❓)

## 2. Baholash va darajalar ✅

Natija 75 ballik shkalada:

| Daraja | Ball |
|---|---|
| A+ | 70 va undan yuqori |
| A | 65 – 69,9 |
| B+ | 60 – 64,9 |
| B | 55 – 59,9 |
| C+ | 50 – 54,9 |
| C | 46 – 49,9 |
| — | 46 dan past: sertifikat berilmaydi |

Muhim: ball "to'g'ri javoblar soni" emas. 🟡 T-shkala: 50 = shu imtihon talabgorlari o'rtachasi, 70 = o'rtachadan +2 standart og'ish.

### Oliy ta'limga qabulda qo'llanishi ✅ (+ 🟡 DTM ball jadvali)

- A+, A → mutaxassislik fanidan **maksimal ball**
- B+, B, C+, C → **proporsional** ball
- Majburiy fan (matematika majburiy bo'lganda) → A+…C hammasida maksimal ball
- Akademik litseylarga kirishda sertifikat bor o'quvchiga maksimal ball ✅

🟡 DTM blokida: 1-fan 93, 2-fan 63, majburiy fan 11 ball (jami 189). Matematika majburiy fan sifatida 10 savol/11 ball, mutaxassislik fani sifatida 30 savol/93 ball.
🟡 Konvertatsiya ulushlari: B+ 92%, B 85%, C+ 77%, C 71%.

> **Yangilanish (2026-10-27):** rasmiy spetsifikatsiya topildi. Format: 45 topshiriq = **32 ta Y-1 (yopiq, A–D) + 3 ta Y-2 (moslashtirish) + 10 ta O (ochiq, a/b bandli)**; mazmun **7 ta bo'lim**ga bo'lingan. Bu 3–4-bo'limlardagi "35 yopiq + 10 ochiq", "10 ta bo'lim" va taxminiy blueprint jadvalini almashtiradi. Aniq jadval va mavzular ro'yxati: `docs/mavzular.md`. Ball og'irliklari (2023 tahri): Y-1 1,3 yoki 2,2; Y-2 2,2; O: a 1,5, b 1,7, ikkalasi 3,2.

## 3. Imtihon formati (matematika)

| Parametr | Qiymat | Holat |
|---|---|---|
| Vaqt | 150 daqiqa | 🟡 |
| Savollar soni | 45 | 🟡 |
| Tuzilishi | 35 ta yopiq (A–D) + 10 ta ochiq | 🟡 |
| Kalkulyator/telefon | Taqiqlangan | 🟡 |
| Til | O'zbek, qoraqalpoq, rus | ❓ |
| Hisoblash | Rasch modeli → 75 ballik shkala | ✅ |

**Savol turlari** (🟡 TestMakon + ✅ Agentlik 2022-yil posti):

1. **Yopiq (A/B/C/D)** — to'g'ri javob murakkabligiga qarab 1 yoki 2 ball (2022 posti). Namunaviy testlarda `[1,3 ball]` va `[2,2 ball]` belgilari uchraydi (🟡) — yani og'irlik murakkablikka bog'liq.
2. **Guruhlangan (A–F)** — 6 ta umumiy variant, 3 ta kichik savol, har biriga mos harf tanlanadi; hammasi to'g'ri bo'lsa ball.
3. **Qisqa ochiq javob** — variant yo'q, son yoki so'z yoziladi; yaxlitlash/o'lchov birligi shartga mos bo'lishi kerak.
4. **Ko'p qismli (a/b/c)** — har qism alohida ball beradi.

❓ Aniq bo'lmagan: ochiq savollarning aniq ball og'irligi (Trylab: 1,5 + 1,7 deydi 🟡), yopiq savollarning ichida qancha 1,3 / 2,2 ekani, 45 ning aniq bo'linishi (35 yopiq ichida guruhlangan savollar bormi). Bularni namunaviy PDF'dan aniqlash kerak.

## 4. Mavzular (o'rta ta'lim dasturi doirasida) 🟡

| # | Bo'lim | Ichki mavzular |
|---|---|---|
| 1 | Arifmetika va sonlar nazariyasi | bo'linish, EKUB/EKUK, foiz, nisbat va proporsiya, natural sonlar xossalari |
| 2 | Algebraik ifodalar | ko'phadlar, qisqa ko'paytirish formulalari, ratsional kasrlar, ildizlar, darajalar |
| 3 | Tenglama va tengsizliklar | chiziqli, kvadrat, ratsional, modulli, irratsional, ko'rsatkichli, logarifmik, sistemalar |
| 4 | Funksiyalar va grafiklar | aniqlanish/qiymatlar sohasi, monotonlik, juft-toqlik, grafik almashtirishlar |
| 5 | Trigonometriya | ayniyatlar, tenglama/tengsizlik, teskari trigonometrik funksiyalar |
| 6 | Progressiyalar | arifmetik, geometrik, yig'indi formulalari |
| 7 | Planimetriya | uchburchak, to'rtburchak, aylana, yuza, o'xshashlik |
| 8 | Stereometriya | prizma, piramida, silindr, konus, shar — hajm va sirt |
| 9 | Kombinatorika va ehtimollik | o'rin almashtirish, guruhlash, klassik ehtimollik |
| 10 | Matematik analiz elementlari | hosila va tatbiqi, boshlang'ich funksiya, integral |
| 11 | Matnli masalalar (qo'shimcha) ❓ | harakat, ish, aralashma, foiz — ko'pincha algebra ichida keladi |
| 12 | Mantiq/mantiqiy masalalar ❓ | namunaviy savollarda uchraydi (Scribd/YouTube tahlillar) |

Rasmiy "mavzu bo'yicha savollar soni" jadvali topilmadi ❓. Quyida **taxminiy blueprint** (o'zimiz qabul qilamiz, real natijalarga qarab keyin kalibrlaymiz):

| Bo'lim | Yopiq (35) | Ochiq (10) | Jami |
|---|---|---|---|
| Arifmetika + algebra ifodalari | 6 | 1 | 7 |
| Tenglama va tengsizliklar | 6 | 2 | 8 |
| Funksiyalar | 4 | 1 | 5 |
| Trigonometriya | 3 | 1 | 4 |
| Progressiyalar | 2 | 0 | 2 |
| Planimetriya | 5 | 2 | 7 |
| Stereometriya | 3 | 1 | 4 |
| Kombinatorika/ehtimollik | 2 | 1 | 3 |
| Analiz (hosila, integral) | 3 | 1 | 4 |
| Mantiq/matnli masalalar | 1 | 0 | 1 |
| **Jami** | **35** | **10** | **45** |

## 5. Qiyinlik darajalari

Imtihon odatda **qiyinlik bo'yicha o'sib boruvchi** tartibda. Bizning mock'da 3 pog'onali yorliq (b parametr uchun boshlang'ich baho):

| Daraja | Yopiq (35) ichida | Tavsif | Maqsadli to'g'ri javob ulushi |
|---|---|---|---|
| Oson (L1) | ~1–12 | bitta qadam, formulani to'g'ridan-to'g'ri qo'llash | 75–90% |
| O'rta (L2) | ~13–27 | 2–3 qadam, mavzular aralashishi | 40–65% |
| Qiyin (L3) | ~28–35 | standart bo'lmagan yondashuv, parametr, aralash mavzu | 10–35% |
| Ochiq (L3+) | 36–45 | hisoblab yozma javob, ko'p qismli | 5–35% |

🟡 TestMakon statistikasiga ko'ra eng past o'zlashtirilgan ikki mavzu: **tengsizliklar (28,1% to'g'ri)** va **trigonometriya (27,5% to'g'ri)**. Mock'da bu mavzularga qo'shimcha mashq bo'limi beriladi.

A+ (70+) uchun odatda qiyin va ochiq savollarni yechish hal qiluvchi deb ko'rsatiladi 🟡 — Rasch modelida qiyin savol og'irroq.

## 6. Savollar haqida (nima kiritamiz)

Haqiqiy imtihon savollari (Telegram/YouTube/Scribd'da tarqalgan "tushgan savollar") mualliflik va maxfiylik jihatidan bazaga **ko'chirilmaydi**. Agentlik ham savollar sizib chiqishi haqida rasmiy munosabat bildirgan ✅. Shuning uchun:

- Barcha savollar **original** yoziladi yoki ruxsati bor manbadan olinadi
- Faqat **uslub, mavzu va qiyinlik** haqiqiy imtihonga mos
- Har savol: mavzu, ichki mavzu, qiyinlik, tur, vaqt taxmini, yechim, tipik xato izohi

Boshlang'ich bank hajmi (MVP): **6 ta to'liq variant × 45 = 270 savol**, keyin 15+ variantga kengaytirish.

---

## 7. Mock tizim — loyiha

### 7.1 Foydalanuvchilar va rollar
- **Talabgor (student)**: ro'yxatdan o'tadi, mock topshiradi, natija/tahlil ko'radi
- **O'qituvchi/markaz admini (ixtiyoriy, keyinroq)**: guruh yaratadi, natijalarni kuzatadi
- **Kontent muharriri**: savol yaratadi/tahrirlaydi
- **Super admin**: sozlamalar, to'lov, tahlil

### 7.2 Asosiy funksiyalar (MVP)
1. Ro'yxatga olish (login yo'q, ichki platforma ichida): ism-familiya, telefon, sinf — hammasi majburiy; texnik tafsilot va keyin auth qo'shish: `docs/auth.md`
2. Mock tanlash → **imtihon rejimi** (150 daq taymer, 45 savol, bo'limlar, savollar paneli, "belgilab qo'yish")
3. Savol turlari: yopiq, guruhlangan A–F, qisqa ochiq (son/kasr/so'z), ko'p qismli
4. Matematik yozuv: **KaTeX** (kasr, ildiz, daraja, logarifm, trigonometriya), geometrik chizmalar (SVG)
5. Kalkulyator yo'q (ekranda ko'rsatiladi: "kalkulyator taqiqlangan"), qoralama maydoni (ixtiyoriy)
6. Avto-saqlash (har javobda), internet uzilsa tiklash, tab almashtirishni qayd etish
7. **Natija**: xom ball, taxminiy 75 ballik shkala, daraja (A+…C), bo'limlar bo'yicha tahlil, har savolga yechim
8. **Xatolar daftari** va zaif mavzular bo'yicha tavsiya
9. Natija tarixi, o'sish grafigi

### 7.3 Keyingi bosqich (v2)
- Mavzu bo'yicha mashq rejimi (adaptiv)
- Guruh/sinf, o'qituvchi paneli, reyting
- QR bilan natija sahifasi ("mock natijasi, rasmiy sertifikat emas" yozuvi bilan)
- DTM ball kalkulyatori (sertifikat darajasi → DTM ball)
- To'lov (Click/Payme), obuna rejalari
- Rus va qoraqalpoq tili interfeysi

### 7.4 Ball hisoblash (muhim loyiha qarori)
Rasmiy Rasch kalibrovkasi bizda yo'q. Bosqichlar:

1. **Faza A (MVP):** vaznli xom ball, rasmiy og'irliklar (2023 tahri): Y-1 = 1,3 yoki 2,2 (standart qoida: L1/L2 → 1,3, L3 → 2,2; muallif o'zgartira oladi), Y-2 = 2,2, O: a 1,5 / b 1,7 / ikkalasi 3,2. Xom ball → 0–75 ga chiziqli/segmentli xaritalash (nuqtalar konfiguratsiyada), daraja chegaralari ✅ rasmiy (46/50/55/60/65/70). Natijada doim **"taxminiy"** yozuvi.
2. **Faza B:** 100+ foydalanuvchi natijasi to'planganda **1PL (Rasch)** kalibrovkasi — savollarning qiyinlik parametri (b) va talabgor qobiliyati (θ) hisoblanadi, T-shkalaga o'tkaziladi: `T = 50 + 10·(θ − μ)/σ`.
3. **Faza C:** agar Agentlik shkalasi ochiqlansa, moslashtirish.

### 7.5 Tavsiya etilgan texnologiyalar
- Frontend: **Next.js (React) + TypeScript + Tailwind**, KaTeX
- Backend/DB: **Supabase (Postgres + Auth + Storage)** yoki NestJS + Postgres
- Imtihon holati: server tomonda taymer (vaqtni mijozga ishonmaymiz), javoblar har o'zgarishda yoziladi
- Autentifikatsiya: hozircha yo'q (jim anonim sessiya + ro'yxatga olish formasi); keyinroq email ulash yoki ichki platforma SSO — `docs/auth.md`
- Hosting: Vercel + Supabase; CDN rasmlar uchun
- Admin: kontent editor (KaTeX preview bilan), CSV/JSON import

### 7.6 Ma'lumotlar modeli (qisqa)

```
users(id, name, phone/tg_id, role, created_at)
topics(id, parent_id, name_uz, name_ru)
blocks(id, code, name_uz, sort)                          -- 7 ta rasmiy bo'lim
topics(id, block_id, number, name_uz, name_ru)           -- 103 ta ishchi mavzu (docs/mavzular.md)
questions(id, type[y1|y2|o], block_id, primary_topic_id, stem_md, payload_json,
          difficulty_level, b_param, weight, solution_md, status, version, supersedes_id)
question_keys(question_id, key_json)                     -- kalit alohida, talabaga yopiq (RLS)
exam_formats(id, code, duration_min, spec_json, scoring_json)  -- format konfiguratsiyada
exams(id, title, duration_min=150, is_free, published_at)
exam_items(exam_id, question_id, position, section)
attempts(id, user_id, exam_id, started_at, deadline_at, submitted_at,
         raw_score, scaled_score, level)
answers(attempt_id, question_id, value_json, is_correct, score_part, time_spent, flagged)
mistakes(user_id, question_id, next_review_at, stage)   -- 1/3/7 kun takrorlash
```

### 7.7 Ekranlar
1. Landing (format, ball jadvali, bepul mock)
2. Kirish
3. Dashboard (so'nggi natija, maqsad, zaif mavzular)
4. Mock ro'yxati
5. **Imtihon ekrani** (chap: savol; o'ng: 1–45 panel; tepa: taymer; past: oldingi/keyingi/belgilash)
6. Natija (ball, daraja, bo'limlar bo'yicha diagramma)
7. Yechimlar/tahlil
8. Xatolar daftari
9. Admin: savollar, mock yig'ish, foydalanuvchilar

### 7.8 Imtihon ekrani qoidalari
- Server tomonda `deadline_at`; yakunda avto-topshirish
- 5 daq qolganda ogohlantirish
- Javobni o'zgartirish ruxsat, yakuniy topshirishdan oldin tasdiq
- Ochiq javob maydoni: faqat raqam/kasr/minus/vergul-nuqta; yaxlitlash qoidasi savol ostida ko'rsatiladi
- Mobil qurilmada ham ishlashi (lekin imtihon rejimi tavsiyasi: kompyuter)

### 7.9 Xavfsizlik va sifat
- To'g'ri javoblar mijozga imtihon tugaguncha yuborilmaydi
- Bank savollarini scraping'dan himoya (rate limit, watermark)
- Savollar versiyalanadi: o'zgarsa eski natijalar buzilmaydi
- Shaxsiy ma'lumot minimal, rozilik matni

## 8. Yo'l xaritasi

| Bosqich | Muddat (taxmin) | Natija |
|---|---|---|
| 0. Aniqlashtirish | 2–3 kun | Rasmiy namunaviy testdan format/og'irlik tasdiqlash |
| 1. Kontent | 2–3 hafta (parallel) | Mavzu daraxti, 6 variant (270 savol) original |
| 2. MVP kod | 3–4 hafta | Kirish, imtihon dvigateli, natija, admin-import |
| 3. Beta | 2 hafta | 30–50 talaba bilan sinov, xatolarni tuzatish |
| 4. Kalibrovka | uzluksiz | Rasch (1PL) bo'yicha b-parametrlar |
| 5. v2 | — | Mashq rejimi, guruhlar, to'lov |

## 9. Xavflar

- **Rasmiy shkala noma'lum** → "taxminiy" belgisi, keyin kalibrovka
- **Savol sifati** (xato javoblar, noaniq shart) → ikki bosqichli tekshiruv (muallif + tekshiruvchi)
- **Mualliflik huquqi** → faqat original/ruxsatli savollar
- **Format o'zgarishi** (Agentlik qoidalari o'zgarib turadi) → format konfiguratsiyada, kodga qotirilmaydi
- **Matematik yozuvni kiritish** (admin uchun qiyin) → KaTeX preview + shablonlar

## 10. Ochiq savollar (siz bilan hal qilamiz)

1. Maqsadli auditoriya: yakka abituriyentlar yoki o'quv markazi (Digitalcamp) talabalari?
2. Interfeys tili: faqat o'zbek yoki o'zbek+rus?
3. Monetizatsiya: bepul / obuna / markaz ichida yopiq?
4. Savol manbai: kim yozadi (o'qituvchilar jamoasi)? Hozir tayyor bank bormi?
5. Texnologiya: sizda tayyor stack/dasturchi bormi (Next.js + Supabase tavsiya)?
6. Imtihon kunini simulyatsiya (bir vaqtda ko'pchilik uchun "smena") kerakmi?

## 11. Manbalar

- Agentlik rasmiy Telegram kanali: https://t.me/milliy_sertifikat (daraja chegaralari, qabul ballari, Rasch modeli, sanalar, savollar sizib chiqishi bo'yicha rasmiy munosabat, 2022 yil baholash tavsifi)
- TestMakon, Matematika sertifikati sahifasi: https://testmakon.uz/milliy-sertifikat/matematika/ (🟡 format, mavzular, sanalar, to'lov)
- TestMakon, DTM ball jadvali: https://testmakon.uz/milliy-sertifikat/ (🟡)
- Trylab: https://trylab.uz/national-certificate (🟡 format, ball og'irliklari)
