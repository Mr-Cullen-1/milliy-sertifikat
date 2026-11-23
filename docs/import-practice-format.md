# Mashq savollari JSON formati (LMS importi)

**Kimga:** LMS / platforma dasturchilari.
**Maqsad:** LMS shu hujjatdagi formatdagi faylni **o'zgartirishsiz** qabul qilib, mashq savollarini to'g'ri import qilishi va mashqda to'g'ri ko'rsatib, tekshirishi uchun.

**Namunaviy fayl:** [content/export/practice-sample.v2.json](../content/export/practice-sample.v2.json) — 14 ta haqiqiy mashq savoli (8 `y1`, 2 `y2`, 4 `o`; 7 blokning hammasi; L1/L2/L3; 3 ta chizma; har savolda ru/kaa/en tarjima). Bizning validatordan xatosiz o'tadi (test: [tests/content/practice-sample.test.ts](../tests/content/practice-sample.test.ts)).

**Etalon kod** (hujjat va kod farq qilsa, kod to'g'ri): [lib/content/import-schema.ts](../lib/content/import-schema.ts) (savol sxemasi), [lib/exam/payload.ts](../lib/exam/payload.ts) (payload va SVG qoidalari), [lib/exam/schemas.ts](../lib/exam/schemas.ts) (javob kaliti), [lib/exam/normalize-answer.ts](../lib/exam/normalize-answer.ts) (ochiq javobni solishtirish), [lib/content/validate.ts](../lib/content/validate.ts) (xato xabarlari), [supabase/migrations/20261110110000_question_pool.sql](../supabase/migrations/20261110110000_question_pool.sql) (import RPC), [supabase/migrations/20261110120000_practice.sql](../supabase/migrations/20261110120000_practice.sql) va [20261110140000_practice_elements.sql](../supabase/migrations/20261110140000_practice_elements.sql) (mashq oqimi).

**Mock formatidan farqi:** savol sxemasi (`type`, `payload`, `key`, `i18n`, chizma) mock bilan **bir xil** ([import-format.md](import-format.md)). Mashq faylida `exam` bloki yo'q, 45 savol sharti yo'q, `position` kerak emas, lekin har savolda `pool: "practice"` **majburiy**.

---

## 1. Mashq zaxirasi qanday ishlaydi

Mashq savollari mock variantlardan **alohida zaxira** (`pool = practice`):

- Mockka hech qachon kirmaydi (mashqda kalit va yechimni ko'rgan o'quvchi shu savolni keyin mockda uchratmasligi uchun). Mock tarkibiga `pool = practice` savolni qo'shishga urinish rad etiladi.
- Qoralama bosqichi yo'q: import qilingach savol **darrov nashr etiladi** (mockdagi savollar esa `draft` bo'lib yuklanadi).
- O'quvchi mashqni sozlaydi: **doira** (7 bo'lim yoki 21 mazmun elementidan biri) + **qiyinlik** (Barchasi / L1 / L2 / L3) + **rejim** + **savol soni**. Tizim shu filtrga mos nashr etilgan `practice` savollaridan tanlaydi.
- Tanlash: o'quvchi avval **yechmagan** savollar birinchi, qolgani tasodifiy tartibda. Yetarli savol bo'lmasa mavjud son bilan boshlanadi; **0 ta bo'lsa boshlash bloklanadi**. Boshqa mavzu yoki qiyinlikdan jimgina to'ldirilmaydi.

| Rejim | Taymer | Javob tekshirish va yechim |
|---|---|---|
| `practice` | yo'q | o'quvchi «Tekshirish»ni bosganda, shu savol uchun |
| `timed` | savol soni × 180 soniya | «Tekshirish»ni bosganda, shu savol uchun |
| `exam` | savol soni × 180 soniya | faqat mashq yakunlangandan keyin |

Savol soni: 1–30 (sozlama ekranida 5/10/15/20/30, standart 10). Bir o'quvchida bir vaqtda ko'pi bilan 5 ta faol mashq. Mashq foizi mock /75 ballidan yoki sertifikat darajasidan farq qiladi: ularni aralashtirmang.

Demak import qilinadigan savolning **`block`, `topic` va `difficulty`** maydonlari to'g'ri bo'lishi mashq tanlovi uchun hal qiluvchi (4-bo'lim).

---

## 2. Fayl tuzilishi

```json
{
  "schema_version": 2,
  "questions": [
    { "external_id": "gen-P030-01", "pool": "practice", "type": "y1", "...": "..." }
  ]
}
```

| Maydon | Majburiy | Izoh |
|---|---|---|
| `schema_version` | tavsiya | Doim `2`. Bizning validator tekshirmaydi, LMS tekshirsa yaxshi (boshqa qiymatda rad eting). |
| `questions` | ha | 1–500 ta savol. |
| `exam` | **bo'lmasin** | `exam` berilsa fayl mock hisoblanadi (aynan 45 savol kerak, `pool` ham `exam` bo'ladi). Mashq faylida `exam` yo'q. |

Qo'shimcha (noma'lum) maydonlar rad etilmaydi, e'tiborga olinmaydi. Fayl: UTF-8, ≤ 4 MB.

---

## 3. Savol maydonlari

| Maydon | Majburiy | Qoida |
|---|---|---|
| `external_id` | **ha (mashq uchun)** | Barqaror ID, 1–64 belgi, fayl ichida va bazada takrorlanmasin. Qayta import dublikat yaratmasligi shunga bog'liq. Bizning zaxirada: `gen-P006-01` (variant raqami + o'rin), `gen-X-...` (qo'shimcha shablonlar). Majburiy deb hisoblang: usiz qayta yuklash har safar yangi savol yaratadi. |
| `pool` | **ha** | Aynan `"practice"`. Berilmasa `exam` hisoblanadi va savol mashqqa chiqmaydi. LMS `exam` bloksiz faylda `pool != practice` savolni rad etsin. |
| `type` | ha | `y1`, `y2`, `o`. |
| `block` | ha | `sonlar`, `algebra`, `tenglama`, `funksiyalar`, `analiz`, `geometriya`, `toplam`. |
| `topic` | ha | Butun 1–121. Mavzu blokka tegishli bo'lishi shart (4-bo'lim). |
| `extra_topics` | yo'q | Qo'shimcha mavzular, 1–121, ko'pi bilan 5 ta. |
| `difficulty` | ha | `L1`, `L2`, `L3`. |
| `stem_md` | ha | Savol matni, Markdown + KaTeX, 1–4000 belgi. |
| `payload` | ha | Ko'rsatish ma'lumoti (turga qarab, 5-bo'lim). **To'g'ri javob bu yerda bo'lmaydi.** |
| `key` | ha | To'g'ri javob (5-bo'lim). Faqat serverda saqlanadi, javob tekshirilmaguncha mijozga ketmaydi. |
| `solution_md` | yo'q | Yechim, ≤ 8000 belgi. |
| `mistake_note_md` | yo'q | Tipik xato, ≤ 2000 belgi (ko'pincha «Tipik xato:» bilan boshlanadi: matnni o'zgartirmay ko'rsating). |
| `est_seconds` | yo'q | 1–1800. Mashq taymeriga **ta'sir qilmaydi** (taymer = soni × 180 s). Faqat ma'lumot uchun saqlang. |
| `weight` | yo'q | Mashqda ball hisoblanmaydi, ishlatilmaydi. Berilsa 0 < w ≤ 10 bo'lsin va saqlang. |
| `source` | yo'q | Manba belgisi (`gen:pool-v1`), ≤ 200 belgi. |
| `i18n` | yo'q | Tarjimalar (6-bo'lim). |

Matnlarda `$` faqat formula chegarasi (literal `$` yo'q); abzaslar `\n\n` bilan; formulalar KaTeX strict rejimida yaroqli. Raw `\frac` yoki `$` ekranda ko'rinib qolmasin.

---

## 4. Blok, mavzu va element: mashq tanlovi shunga tayanadi

Mashq doirasi ikki xil:

1. **Bo'lim bo'yicha** (`block`): `savol.block = tanlangan bo'lim`.
2. **Element bo'yicha** (21 ta, `2.4`, `7.3` ...): savolning **asosiy mavzusi** (`topic`) shu elementga bog'langan bo'lsa savol tanlanadi. `extra_topics` element tanlovida **hisobga olinmaydi** (faqat `topic`).

Faylda element maydoni yo'q: LMS mavzudan elementni jadval orqali oladi. To'liq «mavzu → element» jadvali: [import-format.md, 3-bo'lim](import-format.md) (manba kodi: [config/elements.ts](../config/elements.ts), `TOPIC_ELEMENTS`). Bitta mavzu bir nechta elementga bog'langan bo'lishi mumkin (masalan 84-mavzu: `7.3` va `7.1`): shunda savol ikkala elementda ham sanaladi va chiqadi. Hujjat va kod farq qilsa kod to'g'ri; moslashtirish taxminiy, mutaxassis tekshiradi.

| Element | Nomi | Bo'lim |
|---|---|---|
| 1.1 | Natural sonlar | sonlar |
| 1.2 | Sonlar ustida amallar | sonlar |
| 2.1 | Daraja va ildiz | algebra |
| 2.2 | Trigonometriya asoslari | algebra |
| 2.3 | Ko'rsatkichli va logarifmik funksiyalar | algebra |
| 2.4 | Ifodalarning shaklini almashtirish | algebra |
| 3.1 | Tenglamalar | tenglama |
| 3.2 | Tengsizliklar | tenglama |
| 4.1 | Funksiyalar | funksiyalar |
| 5.1 | To'plam, mulohaza va mantiq | toplam |
| 5.2 | Ma'lumotlar tahlili | toplam |
| 5.3 | Kombinatorika | toplam |
| 5.4 | Ehtimol | toplam |
| 5.5 | Modellashtirish | toplam |
| 6.1 | Hosila | analiz |
| 6.2 | Boshlang'ich funksiya va integral | analiz |
| 7.1 | Shakl o'lchovlari | geometriya |
| 7.2 | Planimetriya | geometriya |
| 7.3 | Fazoda to'g'ri chiziq va tekislik | geometriya |
| 7.4 | Fazoviy jismlar | geometriya |
| 7.5 | Koordinatalar va vektorlar | geometriya |

**Mavzu blokka mos kelishi (import tekshiruvi).** Mavzu ishchi diapazonda **yoki** uning elementi shu bo'limda bo'lsa yaroqli: `sonlar` 1–11, `algebra` 12–27, `tenglama` 28–42, `funksiyalar` 43–55, `analiz` 56–66, `geometriya` 67–93, `toplam` 94–103; 104–121 — rasmiy spetsifikatsiyadagi qo'shimcha mavzular (ular faqat o'z elementining bo'limida). Ishchi blok va element bo'limi mos kelmaydigan mavzular: 7–8 (`sonlar`, element `2.4` algebra), 42 (`tenglama`, `2.4`), 56–58 (`analiz`, `2.4`), 59 (`analiz`, element `4.1` funksiyalar). Bunday savolni **rad etmang**: namunadagi `gen-P018-02` (`sonlar`, mavzu 7) va `gen-P033-23` (`analiz`, mavzu 57) shunday. Bo'lim bo'yicha mashqda ular `block` da, element bo'yicha mashqda `2.4` da chiqadi.

---

## 5. Turlar: `payload` va `key`

### Y-1 (yopiq, 4 variant, 1 ta to'g'ri)

```json
{
  "external_id": "gen-P030-01", "pool": "practice",
  "type": "y1", "block": "sonlar", "topic": 8, "difficulty": "L1",
  "stem_md": "Hisoblang.\n\n$$\\frac{1}{2}\\cdot\\frac{5}{3}$$",
  "payload": { "options": { "A": "$\\frac{5}{6}$", "B": "$\\frac{13}{6}$", "C": "$1$", "D": "$\\frac{3}{10}$" } },
  "key": { "correct": "A" }
}
```
`options` aynan `A`, `B`, `C`, `D` (hammasi bo'sh emas). `key.correct` — bitta harf. Ixtiyoriy `payload.figure` (7-bo'lim). O'quvchi javobi: `"A"` (katta-kichik harf farqsiz).

### Y-2 (moslashtirish)

```json
{
  "type": "y2", "block": "geometriya", "topic": 78, "difficulty": "L2",
  "stem_md": "Radiusi $9$ sm bo'lgan aylana va doira berilgan. Har bir kattalikni qiymati bilan moslang.",
  "payload": {
    "options": { "A": "$162\\pi$", "B": "$9\\pi$", "C": "$27\\pi$", "D": "$81\\pi$", "E": "$36\\pi$", "F": "$18\\pi$" },
    "items": [
      { "id": "1", "text_md": "Aylana uzunligi" },
      { "id": "2", "text_md": "Doira yuzi" },
      { "id": "3", "text_md": "Markaziy burchagi $120^{\\circ}$ bo'lgan sektor yuzi" }
    ]
  },
  "key": { "pairs": { "1": "F", "2": "D", "3": "C" } }
}
```
`options`: harflari `A–F` dan, kamida 2 ta (hammasi shart emas). `items`: kamida 1 ta, `id` lar takrorlanmasin (satr). `key.pairs`: **har bir band** uchun bitta harf; kalitda payload'da yo'q band, yoki `options` da yo'q harf bo'lmasin. Bitta variant bir necha bandga javob bo'lishi mumkin. O'quvchi javobi: `{"1":"F","2":"D","3":"C"}`. Savol **to'liq to'g'ri** hisoblanadi, agar **hamma** bandlar to'g'ri bo'lsa; qisman javob to'g'ri hisoblanmaydi. Navigatorda bitta savol = bitta raqam.

### O (ochiq javob, `a` va/yoki `b` band)

```json
{
  "type": "o", "block": "tenglama", "topic": 29, "difficulty": "L2",
  "stem_md": "Kvadrat tenglama berilgan: $6x^{2} + 25x + 25 = 0$. Uning ildizlari $x_1$ va $x_2$.",
  "payload": {
    "parts": {
      "a": { "prompt_md": "Tenglamaning katta ildizini toping.", "hint": "Javobni butun son, oddiy kasr (3/4) yoki o'nli kasr (0.75) ko'rinishida yozing." },
      "b": { "prompt_md": "$x_1^2 + x_2^2$ ning qiymatini toping." }
    }
  },
  "key": { "a": ["-5/3"], "b": ["325/36"] }
}
```

- `parts` da `a` va `b` dan **kamida bittasi** bo'lsin; `key` da **aynan shu** bandlar bo'lsin (payload `a` bo'lib kalit `b` bo'lsa — rad etiladi). Faqat `a` yoki faqat `b` bo'lgan savol yaroqli: `"parts": {"a": {...}}` + `"key": {"a": ["5/4"]}`.
- `prompt_md` — shu bandning savoli (`stem_md` umumiy shart; band savoli unga qo'shib yuborilmaydi). `hint` — ixtiyoriy: javob formati yoki o'lchov birligi; kiritish maydoni ostida ko'rsating.
- `key.a` / `key.b` — **qabul qilinadigan javoblar ro'yxati** (kamida 1 ta), masalan `["21/4", "5.25"]`.
- O'quvchi javobi: `{"a": "-5/3", "b": "325/36"}`, har biri ≤ 64 belgi; bitta band to'ldirilsa ikkinchi kalit kelmaydi.
- **Tekshirish raqamga qarab, shaklga emas:** butun (`-3`), o'nli (`0.75` yoki `0,75`), oddiy kasr (`3/4`), minus (`-` yoki `−` yoki `–`), bo'shliqlar (oddiy va qattiq) e'tiborga olinmaydi; `3/4` ≡ `0.75`. Aniq ratsional son bilan solishtiriladi (suzuvchi nuqta emas). Ildiz, $\pi$, harfli yoki `%` li javoblar qo'llab-quvvatlanmaydi: savol javobi son bo'ladigan qilib tuzilgan, kalit ham shunday bo'lishi shart (kalitdagi har qiymat son/kasr sifatida o'qilishi kerak, aks holda import rad etiladi).
- **Natija:** band bo'yicha alohida to'g'ri/noto'g'ri (`parts: {a, b}`). Ikki bandli savol to'liq to'g'ri bo'ladi, agar `a` ham `b` ham to'g'ri bo'lsa; bittasi to'g'ri bo'lsa **qisman to'g'ri** (UI uch holat: to'g'ri / noto'g'ri / qisman). Qisman javobni to'liq to'g'ri deb sanamang.

---

## 6. Tarjimalar (`i18n`)

```json
"i18n": {
  "ru":  { "stem_md": "...", "payload": { }, "solution_md": "...", "mistake_note_md": "..." },
  "kaa": { "...": "..." },
  "en":  { "...": "..." }
}
```
Asosiy matn — o'zbek (lotin). Tillar: `ru`, `kaa` (qoraqalpoq, lotin), `en`; hammasi ixtiyoriy (bizning zaxirada hamma savolda to'liq). Tarjima obyektida `stem_md` va `payload` majburiy, `solution_md` va `mistake_note_md` ixtiyoriy.

- Tarjima `payload`i **asosiy bilan bir xil tuzilishda** bo'lsin: `y1` — `A–D`; `y2` — bir xil variant harflari va band `id` lari; `o` — bir xil a/b bandlar. Tuzilish farqi kalit bilan nomuvofiqlik keltirardi, shuning uchun fayl rad etiladi.
- `key` tarjima qilinmaydi, hamma tilga umumiy. `figure.svg` ham tarjima qilinmaydi (matni asosiy bilan bir xil), lekin **tarjima `payload`iga ham `figure` ko'chiriladi** (`alt` o'z tilida): ko'rsatishda tarjima `payload`i butunlay almashtiriladi, `figure` bo'lmasa shu tilda chizma yo'qoladi. Namunadagi chizmali savollarda shunday.
- Ko'rsatishda: tanlangan tildagi `stem_md`, `solution_md`, `mistake_note_md` bo'sh/yo'q bo'lsa o'zbekchasi (maydon bo'yicha alohida). `payload` tarjimada bor bo'lsa butunlay tarjima payloadi olinadi, yo'q bo'lsa asosiysi.

---

## 7. Chizma (`payload.figure`)

Ixtiyoriy, uchala turda ham: `"figure": { "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 220\" ...>...</svg>", "alt": "O markazli aylana, radiusi 9..." }`.

- `svg`: 20–30 000 belgi; `<svg` bilan boshlanib `</svg>` bilan tugaydi; `xmlns="http://www.w3.org/2000/svg"` shart.
- **Taqiqlangan:** `<script>`, `<foreignObject>`, `<image>`, `<iframe>`, `<object>`, `<embed>`, `<use>`, `<style>`, `on...=` atributlari, `javascript:`, `data:`, `http:`/`https:`, `href` / `xlink:href`. Nomli entity'lardan faqat `&amp; &lt; &gt; &quot; &apos;`; belgilar uchun raqamli (`&#176;`). Raqamli entity ochib tekshiriladi (`http&#58;` kabi yashirish ushlanadi).
- Ko'rsatish: SVG `<img src="data:image/svg+xml,...">` orqali (skript ishlamaydi); inline `<svg>` sifatida DOM'ga qo'ymang.
- `alt`: 1–300 belgi, chizmaning matnli tavsifi.

---

## 8. LMS import qoidalari

1. **Validatsiya (hech narsa yozishdan oldin):** JSON UTF-8, ≤ 4 MB → har savol sxemasi (`type`, `block`, `topic`↔blok, `difficulty`, `pool = practice`, `payload`, `key`, payload↔kalit mosligi, tarjima tuzilishi, SVG xavfsizligi, KaTeX) → `external_id` fayl ichida takrorlanmasin.
2. **Hammasi yoki hech narsa:** bitta tranzaksiya. Birorta savol xato bo'lsa hech narsa yuklanmasin. (Bizning `import_questions` RPC bitta chaqiruvda atomik; `pnpm content:pool:seed` skripti esa faylni 50 tadan bo'lib yuboradi va **butun fayl bo'yicha atomik emas**. LMS buni takrorlamasin: bitta fayl = bitta tranzaksiya, ≤ 500 savol.)
3. **Idempotentlik:** `external_id` bazada bor bo'lsa savol **o'tkazib yuboriladi va yangilanmaydi** (javobda `existing` ga sanaladi). Demak o'sha faylni qayta yuklash xavfsiz, lekin matn yoki kalitni shu yo'l bilan tuzatib bo'lmaydi.
4. **Tuzatish:** nashr etilgan savolning matni, payload'i va kaliti o'zgarmaydi (bizda trigger shuni ta'minlaydi: faqat arxivlash mumkin; mashq tarixi va xatolar daftari shu savolga bog'langan). LMS ham shunday qilsin. Xato topilsa tuzatilgan savolni **yangi `external_id`** bilan yuklang, eskisini arxivlang (mashq tanlovidan chiqadi). Eski `external_id` ni qayta ishlatmang.
5. **Holat:** savol darrov nashr etiladi (mashqda ko'rinadi), qoralama bosqichi yo'q. `key` alohida jadvalda saqlanadi (`question_keys`); `payload` ga to'g'ri javob kirmaydi.
6. **Natija:** `{ created, existing }` sonlari va (ixtiyoriy) yaratilgan savollar ID ro'yxati.
7. **Xato xabarlari** savol raqami (**1 dan**) va maydon yo'li bilan: `questions[7].payload.options: ...`, `questions[12].key.pairs: "2" bandi uchun kalit yo'q`, `questions[3].i18n.kaa.payload: tuzilishi asosiy matnnikidan farq qiladi`. Bir fayl uchun ko'pi bilan ~60 ta xato qaytariladi (qolgani «kesildi» deb belgilanadi).
8. **Hajm:** bir faylda ≤ 500 savol, ≤ 4 MB (chizmali savollar 8 KB gacha og'ir). Katta zaxira bir nechta faylga bo'linadi (bizda 100 tadan).

---

## 9. Mashq vaqtida ko'rsatish (import qilingan savol bilan nima bo'ladi)

1. Mashq boshlanganda mijozga savol **kalitsiz** keladi: `type`, `difficulty`, `block`, `topic`, `stem_md`, `payload` (tanlangan til bo'yicha). `key`, `solution_md`, `mistake_note_md` yo'q.
2. O'quvchi javobi qoralama sifatida saqlanadi (kalit va yechim ochilmaydi). Qoralamani o'zgartirish mumkin; `practice`/`timed` rejimida **tekshirilgan** javob qulflanadi.
3. «Tekshirish» (yoki yakunlash) paytida **server** javobni kalit bilan solishtiradi (5-bo'lim qoidalari) va natijani saqlaydi. Tekshirish mijozda bajarilmaydi.
4. Kalit va yechim mijozga: `practice`/`timed` rejimda — shu savol tekshirilgach; `exam` rejimda — mashq yakunlangach. Pro huquqi cheklovi (uzun yechim) LMS siyosatiga qarab qo'llanadi: import formatiga bog'liq emas.
5. Natija: to'g'ri/jami va foiz, band bo'yicha (a/b) holat, savollar gridi; «Yana mashq» sozlash ekraniga qaytaradi. Saqlash xatosida mashq muvaffaqiyatli yakunlangandek davom etmasin; tekshirilmagan kiritma jim yo'qolmasin.
6. Sozlash ekrani uchun element/qiyinlik bo'yicha **nashr etilgan `practice` savollari soni** kerak (bizda: `get_practice_element_stats`, `get_practice_pool_stats`). Savol mavzusi bir necha elementga bog'langan bo'lsa, har birida sanaladi.

---

## 10. Qabul tekshiruvi

1. `practice-sample.v2.json` import qilinganda: **14 savol** (8 `y1`, 2 `y2`, 4 `o`); bloklar: `sonlar 2`, `algebra 1`, `tenglama 1`, `funksiyalar 2`, `analiz 3`, `toplam 1`, `geometriya 4`; qiyinlik: L1 2, L2 8, L3 4; 3 ta chizma; matn, variantlar, kalit, yechim, tipik xato va ru/kaa/en tarjimalar yo'qolmagan; hammasi nashr etilgan va `practice` zaxirasida.
2. Shu faylni qayta import qilsangiz: `created = 0`, `existing = 14`, dublikat yo'q.
3. Mashq tanlovi: `geometriya` bo'limi, L2 — namunada 2 ta savol (`gen-P013-33`, `gen-P031-26`), 5 so'ralsa 2 ta bilan boshlanadi va son ko'rsatiladi. Element `2.4` — 4 ta savol (`gen-P018-02` mavzu 7, `gen-P030-01` mavzu 8, `gen-P033-23` va `gen-P017-39` mavzu 57; birinchi ikkitasi `block: sonlar`, oxirgi ikkitasi `block: analiz`). Element `7.3` yoki `2.1` namunada bo'sh — 0 savol, boshlash bloklangan.
4. `exam` rejimda tekshirishdan oldin javob holatida `key`, `solution_md`, `mistake_note_md` yo'q; `practice` rejimda faqat tekshirilgan savol uchun bor.
5. Javob tekshiruvi: `o` savolida kalitdagi qiymatga son jihatidan **teng** javob to'g'ri (kalit `["-5/3"]` bo'lsa `-5/3` va `−5/3` to'g'ri, `-1.6667` xato; kalit `["21/4","5.25"]` bo'lsa `5,25`, `5.25`, `21/4`, `10.5/2` hammasi to'g'ri); `y2` da bitta band xato bo'lsa savol to'g'ri hisoblanmaydi; ikki bandli `o` savolda faqat `a` to'g'ri bo'lsa «qisman to'g'ri».
6. **Rad etilishi kerak** (xato savol raqami va maydon yo'li bilan, hech narsa yuklanmaydi):
   - `pool` yo'q yoki `exam` (mocksiz faylda);
   - faylda `exam` bloki bor, lekin 45 savol emas (mock qoidasi);
   - `y1` da variantlar `A–D` emas yoki `key.correct` boshqa harf;
   - `y2` da `key.pairs` band `id` lariga mos emas yoki kalit harfi `options` da yo'q;
   - `o` da `parts` va `key` bandlari mos emas; kalit qiymati son emas (`"√2"`);
   - mavzu blokka mos emas (masalan `block: "sonlar"`, `topic: 30`);
   - tarjimaning `payload` tuzilishi asosiydan farq qiladi;
   - chizma `svg` ida `<script>`, `href`, `on…=` yoki `http:`;
   - `external_id` fayl ichida takrorlangan.
7. Ekranda: formulalar xom `\frac`/`$` ko'rinishida chiqmaydi; 3 ta chizma o'qiladi; `y2` bandlari bitta raqam sifatida; `o` savolida a va b alohida kiritiladi, `hint` kiritish maydoni ostida.

---

## 11. Zaxira va qayerdan olinadi

- Zaxira generatorlar bilan hosil qilinadi: `pnpm content:pool` → `content/pool/pool-*.json`, qo'shimcha shablonlar `content/pool/extra-*.json` (har fayl 100 savoldan; papka `.gitignore` da, ya'ni repoda yo'q, qayta quriladi). Hozir mahalliy fayllarda ~11 000 savol. Barcha savollarda javoblar kod bilan hisoblanadi, tarjimalar 4 tilda (qoraqalpoq tarjimasini mutaxassis tekshirishi kerak: [content.md](content.md)).
- Bizning platformaga yuklash: `pnpm content:pool:seed` (yoki admin panelda JSON import). LMS uchun bu fayllar shu hujjatdagi formatning o'zi: qo'shimcha o'zgartirish kerak emas, faqat 500 tadan oshmasin.
- Namuna fayl shu zaxiradan olingan **haqiqiy savollar** (ID lari va javoblari o'zgartirilmagan). Shuning uchun uni avval LMS sinov muhitiga yuklab tekshiring: keyin real fayllar xuddi shu yo'l bilan o'tadi, namuna savollari esa real importda `existing` bo'lib o'tkazib yuboriladi.
