# Test (mock variant) JSON formati — v2

**Kimga:** platforma (app) dasturchilari jamoasi.
**Maqsad:** bizning variantlar (A–O) o'zgarmaydi: platforma shu formatdagi faylni **o'zgartirishsiz** qabul qilishi kerak. Hujjat sizning `example-milliy.v2.json` namunangizdan bizning v2 formatiga o'tish uchun platformada nima o'zgarishini beradi.

**Namunaviy fayl:** [content/export/variant-A.v2.json](../content/export/variant-A.v2.json) — Variant A: 45 topshiriq (32 Y-1, 3 Y-2, 10 O), 14 chizma, har savolda ru/kaa/en tarjima. Bizning platformaning import validatoridan xatosiz o'tadi.

**Etalon kod** (hujjat va kod farq qilsa, kod to'g'ri): [lib/content/import-schema.ts](../lib/content/import-schema.ts) (fayl va savol sxemasi), [lib/exam/payload.ts](../lib/exam/payload.ts) (payload va SVG qoidalari), [lib/exam/schemas.ts](../lib/exam/schemas.ts) (javob kaliti), [lib/content/validate.ts](../lib/content/validate.ts) (xato xabarlari).

---

## 1. `example-milliy.v2.json` → v2: platformada nimani o'zgartirish kerak

### 1.1. Maydonlar moslik jadvali

**Imtihon (`exam`)**

| Sizning namuna | Bizning v2 | Platformada qilinadigan ish |
|---|---|---|
| `slug` | `exam.slug` (ixtiyoriy) | O'qing; bo'lmasa `code` dan hosil qiling. |
| `title` | `exam.title` | O'zgarishsiz. |
| — | `exam.code` (`A`…`O`) | Ro'yxatda nom va tartib uchun o'qing. |
| `description` | yo'q | Majburiy qilmang. |
| `duration_seconds` | `exam.duration_seconds` (9000) | O'zgarishsiz. |
| `format: "milliy-math-v1"` | `exam.format: "math-v1"` | Ikkalasi bir formatga (45 topshiriq, 150 daq, 32/3/10) bog'lansin. |
| `purpose: "mock"` | savolda `pool` (`exam` standart, `practice` — mashq zaxirasi) | `exam` bloki berilsa fayl mock; `purpose` ni talab qilmang. |
| `status`, `access: "free"` | `exam.status` (`draft`), `exam.is_free: true` | `access: free` ≡ `is_free: true`. Fayldagi `status` qoralama; nashr admindan. |
| `content_version` | yo'q | Talab qilmang: nashr etilgan variant o'zgarmaydi, tuzatish uchun yangi variant yuklanadi. |
| `metadata` | yo'q | Ixtiyoriy. |

**Savol (`questions[]`)**

| Sizning namuna | Bizning v2 | Platformada qilinadigan ish |
|---|---|---|
| `id` | `external_id` (`gen-A-01`…) | Barqaror ID; qayta import dublikat yaratmasin. |
| `number` | `position` (1 dan) | Berilsa massiv tartibiga teng bo'lishi shart. |
| `kind` | `type` (`y1`, `y2`, `o`) | Nom o'zgaradi. |
| `block_code` | `block` | Kodlar bir xil. |
| `element_code` | yo'q | Faylda element yo'q: `topic` dan 3-bo'lim jadvali bilan hosil qiling. |
| — | `topic` (1–121), `extra_topics` | Saqlang: mavzu bo'yicha tahlil va mashq shunga tayanadi. |
| `difficulty` | `difficulty` | O'zgarishsiz. |
| `prompt` | `stem_md` | Nom o'zgaradi. |
| `payload.options` | `payload.options` | Y-1: `A–D`, Y-2: `A–F`. |
| Y-2 `payload.items[].text` | `payload.items[].text_md` | Nom o'zgaradi. |
| O `payload.parts.a` (matn) | `payload.parts.a` = `{ prompt_md, hint? }` | **Obyekt**: band savoli va javob ko'rsatmasi (1.2-a). |
| `answer_key` | `key` | Nom o'zgaradi. |
| Y-2 `answer_key: {"1":"F"}` | `key: { "pairs": {"1":"F"} }` | `pairs` o'rami. |
| `answer_key.correct`, `.a`/`.b` | `key.correct`, `key.a`/`key.b` | O'zgarishsiz. |
| `explanation` | `solution_md` | Nom o'zgaradi. |
| `typical_error` | `mistake_note_md` | Nom o'zgaradi. |
| `figure` (savol darajasida) | `payload.figure` | `payload` ichida: `{ svg, alt }`. |
| `metadata` | yo'q | `est_seconds`, `source`, `weight` alohida maydonlar. |
| — | `i18n` | Tarjimalar (1.2-c). |

### 1.2. Muhim farqlar

**a) Ochiq savol (O) bandlari.** Har band `{ "prompt_md": "...", "hint": "..." }`. `prompt_md` — shu bandning savoli (`stem_md` esa umumiy shart). `hint` — javob formati yoki o'lchov birligi; Variant A da 20 ta bandning 13 tasida bor (masalan «oddiy kasr (masalan 7/3) ko'rinishida yozing», «Kvadrat metrda»). Platforma `hint` ni kiritish maydoni ostida ko'rsatsin; band savoli `stem_md` ga qo'shilmaydi.

**b) Kalit alohida.** `key` ko'rsatish ma'lumotidan (`payload`) ajratilgan. Imtihon topshirilgunga qadar `key`, `solution_md` va `mistake_note_md` mijozga yuborilmasin.

**c) Tarjimalar.** `i18n.{ru,kaa,en}` — har tilda `stem_md`, `payload` (asosiy bilan **bir xil tuzilishda**: bir xil variant harflari, band `id` lari, a/b), ixtiyoriy `solution_md` va `mistake_note_md`. Asosiy til — o'zbek. Tarjima bo'lmasa o'zbekcha matn chiqsin. `key` va `figure.svg` tarjima qilinmaydi, hamma tilga umumiy. Variant A da 45 savolning hammasida uch til to'liq.

**d) Mavzu, blok va element.** `topic` — raqam (1–121), faylda element yo'q. Platforma mavzuni blok va elementga 3-bo'lim jadvali orqali bog'laydi. `block` mock tuzilmasi (blueprint) uchun, element mazmun tasnifi uchun: element **blokdan tashqarida** bo'lishi mumkin (3-bo'limdagi eslatma). Masalan Variant A ning 23-savoli: `block: analiz`, `topic: 57` (arifmetik progressiya), elementi `2.4` (algebra). Bunday savolni rad etmang.

**e) Matnlar.** Barchasi Markdown + KaTeX: `$…$` va ko'rinish formulalari `$$…$$`, abzaslar `\n\n` bilan. Bir nechta savolda `tipik xato` matni «Tipik xato:» bilan boshlanadi (Variant A da 13 ta): matnni o'zgartirmay ko'rsating.

### 1.3. Platformada majburiy o'zgarishlar (qisqa ro'yxat)

1. Uch tur sxemasi: Y-1 (`A–D`), Y-2 (umumiy `A–F`, band `id` lari, `key.pairs`), O (`parts` obyektlari, `key.a`/`key.b` — qabul qilinadigan javoblar ro'yxati).
2. `payload.figure` ({ `svg`, `alt` }) va 2.6-bo'limdagi SVG xavfsizlik qoidalari.
3. `i18n` (ru, kaa, en) saqlash va ko'rsatish; tuzilma tekshiruvi.
4. `topic` (1–121), `extra_topics`, `est_seconds`, `source`, `weight`, `pool` maydonlarini saqlash.
5. Mavzu → element jadvali (3-bo'lim) va «element blokdan tashqarida bo'lishi mumkin» qoidasi.
6. Mock tuzilmasini tekshirish: aynan 45 savol, 1–32 `y1`, 33–35 `y2`, 36–45 `o`, blok soni (2.5).
7. `external_id` bo'yicha takrorsiz import; xatolar savol raqami va maydon yo'li bilan; hammasi yoki hech narsa.
8. Nashr etilgan variant o'zgarmaydi: tuzatish yangi variant bilan, eskisi arxivga.

---

## 2. v2 formati

### 2.1. Fayl tuzilishi

```json
{
  "schema_version": 2,
  "exam": {
    "title": "Variant A",
    "code": "A",
    "slug": "variant-a",
    "format": "math-v1",
    "duration_seconds": 9000,
    "is_free": true,
    "status": "draft"
  },
  "questions": [ { "...": "..." } ]
}
```

| Maydon | Majburiy | Izoh |
|--------|----------|------|
| `schema_version` | ha | Doim `2`. |
| `exam.title` | ha | 1–120 belgi. |
| `exam.code` | yo'q | 1–8 belgi (`A`…`O`): ro'yxatda tartib va nom uchun. |
| `exam.slug` | yo'q | URL uchun nom (kichik harf, `-`). Platformaning o'z importi e'tibor bermaydi. |
| `exam.format` | yo'q | Hozir faqat `math-v1`: 150 daq, 45 topshiriq, ball og'irliklari. |
| `exam.duration_seconds` | yo'q | `math-v1` uchun 9000. Taymer serverda yuritiladi. |
| `exam.is_free` | yo'q | `true` bo'lsa Pro talab qilinmaydi. |
| `exam.status` | yo'q | `draft` (standart), `published`, `archived`. Platforma importi har doim qoralama sifatida yuklaydi, nashr admin paneldan. |
| `questions` | ha | 1–500 ta. `exam` berilsa **aynan 45 ta** (2.5-bo'lim). `exam` bo'lmasa: erkin savollar to'plami (mashq zaxirasi). |

Qo'shimcha (noma'lum) maydonlar rad etilmaydi, e'tiborga olinmaydi. Fayl hajmi — 4 MB gacha, kodlash UTF-8.

### 2.2. Savol: umumiy maydonlar

| Maydon | Majburiy | Qoida |
|--------|----------|-------|
| `external_id` | tavsiya | Barqaror ID (`gen-A-01`), 1–64 belgi, fayl ichida va bazada **takrorlanmasin**. Qayta yuklashda takror yaratilmasligi shunga bog'liq. |
| `position` | yo'q | 1 dan. Berilsa massivdagi tartibga teng bo'lishi kerak (mock uchun: 1–45). |
| `type` | ha | `y1`, `y2` yoki `o`. |
| `block` | ha | `sonlar`, `algebra`, `tenglama`, `funksiyalar`, `analiz`, `geometriya`, `toplam`. |
| `topic` | ha | Butun son, 1–121 (1–103: ishchi mavzular, docs/mavzular.md; 104–121: rasmiy spetsifikatsiyadagi qo'shimcha mavzular). Mavzu blokka tegishli: ishchi diapazonda yoki uning elementi shu bo'limda (3-bo'lim). |
| `extra_topics` | yo'q | Qo'shimcha mavzu raqamlari (1–121), ko'pi bilan 5 ta. |
| `difficulty` | ha | `L1`, `L2`, `L3`. |
| `weight` | yo'q | 0 dan katta, 10 gacha. Berilmasa format bo'yicha (qiyinlik va turdan). |
| `est_seconds` | yo'q | Taxminiy yechish vaqti, butun son, 1–1800. |
| `source` | yo'q | Manba belgisi (`gen:v1`), 200 belgigacha. |
| `pool` | yo'q | `exam` (standart) yoki `practice` (mashq zaxirasi; mockka kirmaydi). |
| `stem_md` | ha | Savol matni, Markdown + KaTeX, 1–4000 belgi. |
| `payload` | ha | Ko'rsatish ma'lumoti (turga qarab, 2.3). **To'g'ri javob bu yerda bo'lmaydi.** |
| `key` | ha | To'g'ri javob (turga qarab, 2.3). Mijozga jo'natilmaydi. |
| `solution_md` | yo'q | Yechim, 8000 belgigacha. |
| `mistake_note_md` | yo'q | Tipik xato, 2000 belgigacha. |
| `i18n` | yo'q | Tarjimalar (2.4). |

Matnlarda `$` faqat formula chegarasi sifatida ishlatiladi (literal `$` yo'q). Formula KaTeX strict rejimida yaroqli bo'lishi kerak (platforma testlari shuni tekshiradi).

### 2.3. Turlar: `payload` va `key`

**Y-1 (yopiq, 4 variant, 1 ta to'g'ri)**

```json
{
  "type": "y1", "block": "sonlar", "topic": 3, "difficulty": "L1",
  "stem_md": "$24$ va $84$ sonlarining EKUKini toping.",
  "payload": { "options": { "A": "$2016$", "B": "$108$", "C": "$12$", "D": "$168$" } },
  "key": { "correct": "D" }
}
```
`options` aynan `A`, `B`, `C`, `D`. `key.correct` — bitta harf (A–D). Ixtiyoriy `payload.figure` (2.6).

**Y-2 (moslashtirish)**

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
`options`: harflari A–F dan, kamida 2 ta. `items`: kamida 1 ta, `id` lar takrorlanmasin. `key.pairs`: **har bir band** uchun bitta harf, kalitda yo'q band yoki payload'da yo'q variant bo'lmasin. Bitta variant bir necha bandga javob bo'lishi mumkin. Ixtiyoriy `figure`.

**O (ochiq javob, a va/yoki b band)**

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
`parts` da `a` yoki `b` dan kamida bittasi bo'lishi kerak; `key` da ham aynan shu bandlar bo'lsin (payload va kalit mos). Har band uchun `key` — **qabul qilinadigan javoblar ro'yxati** (kamida 1 ta), masalan `["21/4", "5.25"]`.
Javob raqam sifatida tekshiriladi, shakl emas: butun (`-3`), o'nli (`0.75` yoki `0,75`), oddiy kasr (`3/4`), minus (`-` yoki `−`), bo'shliqlar e'tiborga olinmaydi; `3/4` va `0.75` teng. Talaba javobi 64 belgigacha. Ildiz, $\pi$ yoki harfli javoblar qo'llab-quvvatlanmaydi: savolni javob son bo'ladigan qilib tuzing.

### 2.4. Tarjimalar (`i18n`)

```json
"i18n": {
  "ru": { "stem_md": "...", "payload": { }, "solution_md": "...", "mistake_note_md": "..." },
  "kaa": { "...": "..." },
  "en": { "...": "..." }
}
```
Asosiy matn — o'zbek (lotin). Tillar: `ru`, `kaa` (qoraqalpoq, lotin), `en`; hammasi ixtiyoriy. Tarjima obyektida `stem_md` va `payload` majburiy, `solution_md`, `mistake_note_md` ixtiyoriy. Tarjima `payload` i **asosiy bilan bir xil tuzilishda** bo'lishi shart: bir xil variant harflari, band `id` lari, a/b bandlar. `key` va `figure.svg` tarjima qilinmaydi: kalit hamma tilga umumiy.

### 2.5. Mock (`exam` berilgan) uchun tuzilish qoidalari

- Aynan **45** savol, tartib bo'yicha: 1–32 `y1`, 33–35 `y2`, 36–45 `o`.
- Bloklar bo'yicha son (tur: `y1/y2/o`):

| Blok | Y-1 | Y-2 | O | Jami |
|------|----:|----:|--:|-----:|
| `sonlar` | 2 | 0 | 0 | 2 |
| `algebra` | 11 | 0 | 0 | 11 |
| `tenglama` | 6 | 0 | 2 | 8 |
| `funksiyalar` | 2 | 0 | 1 | 3 |
| `analiz` | 2 | 0 | 2 | 4 |
| `geometriya` | 7 | 3 | 4 | 14 |
| `toplam` | 2 | 0 | 1 | 3 |

- `external_id` fayl ichida takrorlanmaydi.
- Nashr etilgan variant o'zgarmaydi: tuzatish uchun yangi variant (yangi `code`/`external_id`) yuklab, eskisini arxivlang.

### 2.6. Chizma (`payload.figure`)

```json
"figure": { "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 220\" ...>...</svg>", "alt": "O markazli aylana, radiusi 9..." }
```
`svg`: 20–30 000 belgi, `<svg ...>` bilan boshlanib `</svg>` bilan tugaydi, `xmlns="http://www.w3.org/2000/svg"` shart. **Taqiqlangan:** `<script>`, `<foreignObject>`, `<image>`, `<iframe>`, `<object>`, `<embed>`, `<use>`, `<style>`, `on...=` atributlari, `javascript:`, `data:`, `http(s):`, `href`/`xlink:href`. Nomli entity'lardan faqat `&amp; &lt; &gt; &quot; &apos;`, belgilar uchun `&#176;` kabi raqamli entity'lar. `alt` — 1–300 belgi, chizmaning matnli tavsifi (ko'rmaydiganlar uchun va chizma yuklanmasa).

### 2.7. Qabul qiluvchi ilova nimani tekshirishi kerak (qisqa ro'yxat)

1. JSON UTF-8, ≤ 4 MB, `schema_version == 2`.
2. Har savolda `type` bor va `payload`, `key` shu turning sxemasiga mos.
3. `block` ro'yxatdan, `topic` blokka mos, `difficulty` ∈ {L1, L2, L3}.
4. Kalit va payload mosligi: Y-2 band/variantlari, O a/b bandlari.
5. Tarjima tuzilishi asosiy bilan bir xil.
6. SVG xavfsizlik qoidalari (2.6); matnlarda KaTeX xatosi yo'q.
7. Mock uchun: 45 ta savol, tur tartibi va blok soni (2.5), `external_id` takrorlanmasligi.
8. Xatolar **savol raqami (1 dan) va maydon yo'li** bilan qaytarilsin (`questions[7].payload.options: ...`), hammasi yoki hech narsa (bitta tranzaksiya).
9. Kalit (`key`) o'quvchi ko'radigan javoblarga hech qachon kirmasin.

---

## 3. Mavzu → rasmiy element (platformada saqlanadigan ma'lumotnoma)

Faylda element yo'q; platforma `topic` raqamidan elementni shu jadval orqali oladi. Jadval `config/elements.ts` dan olingan; **moslashtirish taxminiy, mutaxassis tekshiradi** (har mavzuning birinchi elementi asosiy).

| Element | Nomi | Rasmiy bo‘lim | Asosiy element bo‘lgan mavzular | Qo‘shimcha element bo‘lgan mavzular |
|---|---|---|---|---|
| `1.1` | Natural sonlar | `sonlar` | 1–3 | — |
| `1.2` | Sonlar ustida amallar | `sonlar` | 4–6, 9–11, 104 | — |
| `2.1` | Daraja va ildiz | `algebra` | 12–14, 19–20, 106 | — |
| `2.2` | Trigonometriya asoslari | `algebra` | 22–26, 107 | 52 |
| `2.3` | Ko'rsatkichli va logarifmik funksiyalar | `algebra` | 21 | 50–51 |
| `2.4` | Ifodalarning shaklini almashtirish | `algebra` | 7–8, 15–18, 27, 42, 56–58, 105 | — |
| `3.1` | Tenglamalar | `tenglama` | 28–29, 31–35, 37–39, 41, 109 | — |
| `3.2` | Tengsizliklar | `tenglama` | 30, 36, 40, 108 | 28, 32–34, 37–38, 109 |
| `4.1` | Funksiyalar | `funksiyalar` | 43–55, 59, 121 | — |
| `5.1` | To'plam, mulohaza va mantiq | `toplam` | 94–95, 111 | — |
| `5.2` | Ma'lumotlar tahlili | `toplam` | 101–102, 112 | — |
| `5.3` | Kombinatorika | `toplam` | 96–98 | — |
| `5.4` | Ehtimol | `toplam` | 99–100 | — |
| `5.5` | Modellashtirish | `toplam` | 103, 113 | — |
| `6.1` | Hosila | `analiz` | 60–64, 110 | — |
| `6.2` | Boshlang'ich funksiya va integral | `analiz` | 65–66 | — |
| `7.1` | Shakl o'lchovlari | `geometriya` | — | 73, 78, 84 |
| `7.2` | Planimetriya | `geometriya` | 67–80, 82 | — |
| `7.3` | Fazoda to'g'ri chiziq va tekislik | `geometriya` | 83–84, 114–115 | — |
| `7.4` | Fazoviy jismlar | `geometriya` | 85–92, 116–117 | — |
| `7.5` | Koordinatalar va vektorlar | `geometriya` | 81, 93, 118–120 | — |

1–103 — ishchi mavzular ([mavzular.md](mavzular.md)), 104–121 — rasmiy spetsifikatsiyadagi qo'shimcha mavzular.

**Eslatma: ishchi blok va rasmiy element bo'limi har doim ham mos kelmaydi.** Variant A–F ishchi mavzu diapazonlari bo'yicha tuzilgan: `sonlar` 1–11, `algebra` 12–27, `tenglama` 28–42, `funksiyalar` 43–55, `analiz` 56–66, `geometriya` 67–93, `toplam` 94–103. Quyidagi mavzularning elementi boshqa rasmiy bo'limda:

| Mavzular | Ishchi blok | Elementning rasmiy bo'limi |
|---|---|---|
| 7–8 | `sonlar` | `algebra (2.4)` |
| 42 | `tenglama` | `algebra (2.4)` |
| 56–58 | `analiz` | `algebra (2.4)` |
| 59 | `analiz` | `funksiyalar (4.1)` |

Import tekshiruvi mavzuni blokka shunday qabul qiladi: mavzu ishchi diapazonda **yoki** uning elementi shu bo'limda bo'lsa yaroqli. Variant A da shunday savol bitta (23-savol), B da 4 ta, C da 5 ta, D da 2 ta, E da 3 ta, F da 2 ta, G–O da yo'q.

---

## 4. Qabul tekshiruvi: Variant A

1. `variant-A.v2.json` import qilinganda: 45 savol (32 `y1`, 3 `y2`, 10 `o`), 14 chizma; matn, variantlar, kalit, yechim, tipik xato va ru/kaa/en tarjimalar yo'qolmagan; blok soni `sonlar 2, algebra 11, tenglama 8, funksiyalar 3, analiz 4, geometriya 14, toplam 3`.
2. Shu fayl qayta import qilinsa dublikat yaratilmaydi (`gen-A-01` … `gen-A-45`).
3. 23-savol (`analiz`, mavzu 57, element `2.4`) rad etilmaydi.
4. Rad etilishi kerak bo'lgan fayllar (aniq xato, savol raqami va maydon yo'li bilan; hech narsa yuklanmaydi):
   - 44 savolli fayl («mock uchun 45 ta savol kerak, 44 ta berilgan»);
   - 33–35-savolda `key.pairs` band `id` lariga mos emas yoki kalit harfi `options` da yo'q;
   - 36–45-savolda `parts` va `key` bandlari mos emas;
   - mavzu blokka mos emas;
   - tarjimaning `payload` tuzilishi asosiydan farq qiladi;
   - chizma `svg` ida `<script>`, `href` yoki `on…=` bor.
5. Imtihon davomida (`in_progress`) javobda `key`, `solution_md`, `mistake_note_md` yo'q.
6. Ekranda: formulalar xom `\frac`/`$` ko'rinishida chiqmaydi, 14 chizma o'qiladi (24-savol — romb), 33-savolning uch bandi navigatorda bitta raqam, 36-savolda a va b alohida kiritiladi.
