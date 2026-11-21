# Test (mock variant) JSON formati — v2

Bu hujjat ikki narsani beradi: (1) `example-exam.json` (SAT, `schema_version: 1`) formatining kamchiliklari; (2) bizning testlar (Milliy sertifikat, Matematika) **yo'qotishsiz** qabul qilinishi uchun ilova kutishi kerak bo'lgan JSON formati. v2 formati platformaning o'z import sxemasi bilan bir xil ([lib/content/import-schema.ts](../lib/content/import-schema.ts)), shuning uchun v2 fayl admin paneldagi *Yuklash* orqali ham o'tadi. Tayyor namuna: [content/export/variant-A.v2.json](../content/export/variant-A.v2.json) (Variant A, 45 savol).

---

## 1. `example-exam.json` kamchiliklari

| # | Kamchilik | Nega muammo |
|---|-----------|-------------|
| 1 | Faqat **bitta tur**: `options` aynan 4 ta, `correct` 0–3 | Bizning variantda 3 tur bor: Y-1 (yopiq A–D, 32 ta), **Y-2** (moslashtirish: 3 ta band, A–F variantlar, 3 ta), **O** (ochiq, son javob, a/b band, 10 ta). 45 tadan 13 tasi (Y-2 va O) bu formatga sig'maydi. Importer 6 variantli savolda `must contain 4 items`, `must be between 0 and 3` xatosini beradi. |
| 2 | Savol **turi** (`type`) maydoni yo'q | Qabul qiluvchi savol qanday ko'rsatilishi va qanday tekshirilishini bilolmaydi. |
| 3 | `section` — yopiq ro'yxat (`"Math"`), `topic` — erkin matn | Bizda 7 ta rasmiy blok (kod bilan) va 103 ta raqamli mavzu bor (docs/mavzular.md). Erkin matn bilan statistika, "xatolar daftari", mavzu bo'yicha mashq ishlamaydi. Birinchi urinishdagi `section is invalid` xatosi shundan. |
| 4 | To'g'ri javob `correct` — **indeks**, savol ichida | Variantlar aralashtirilsa indeks buziladi; harf (A–D) barqaror. Kalit savol bilan bir obyektda: ilova mijozga (brauzerga) jo'natib yuborsa, javob fosh bo'ladi. Bizda kalit alohida (`key`), ko'rsatish ma'lumotidan (`payload`) ajratilgan. |
| 5 | **Qiyinlik** (L1/L2/L3) va **vazn** yo'q | Ball savolning qiyinligiga bog'liq (Y-1: 1,3 / 1,3 / 2,2; Y-2: 2,2; O: a 1,5, b 1,7, ikkalasi 3,2). Qiyinliksiz ball hisoblab bo'lmaydi. |
| 6 | **Chizma** yo'q | Variant A da 14 ta savolda SVG chizma bor (geometriya, statistika). Formatda joy yo'q. |
| 7 | **Tarjima** yo'q | Savollar 4 tilda: uz (asosiy), ru, kaa, en. Example'da bitta til. |
| 8 | Faqat `explanation` | Bizda `solution_md` (yechim) va `mistake_note_md` (tipik xato) alohida: "xatolar daftari" uchun kerak. |
| 9 | Matn formati belgilanmagan | Matematikada formulalar kerak. v2 da barcha matnlar **Markdown + KaTeX** (`$...$`, `$$...$$`) deb kelishilgan. |
| 10 | Tuzilish nazorati yo'q | Mock 45 ta savoldan, 32 Y-1 + 3 Y-2 + 10 O, bloklar bo'yicha soni qat'iy (2/11/8/3/4/14/3). Example'da bunday tekshiruv ham, tartib qoidasi ham yo'q. |
| 11 | `key` (savol identifikatori) va `position` (0 dan) ikki joyda | Tartib massivda ham, `position` da ham: ular farq qilsa qaysi biri to'g'ri? `key` nomi esa "javob kaliti" bilan chalkashadi. v2 da `external_id` (barqaror ID) va `position` (1 dan, massiv tartibiga teng bo'lishi shart). |
| 12 | Imtihon meta-ma'lumoti yetarli emas | `label: "SAT"`, `description` na vaqtni, na formatni bog'laydi; `duration_seconds` bor, lekin "qaysi format" (`math-v1`), variant kodi (A, B…), bepul/Pro belgisi yo'q. |
| 13 | Cheklovlar va xavfsizlik qoidalari yo'q | Maydon uzunligi, fayl hajmi, SVG xavfsizligi (skript, tashqi havola taqiqlanishi) belgilanmagan. |

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
| `topic` | ha | Butun son, 1–103 (docs/mavzular.md) va mavzu shu blokka tegishli bo'lishi shart. |
| `extra_topics` | yo'q | Qo'shimcha mavzu raqamlari, ko'pi bilan 5 ta. |
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

## 3. Eski formatdan moslik jadvali

| `example-exam.json` | v2 |
|---------------------|----|
| `schema_version: 1` | `schema_version: 2` |
| `title`, `slug`, `duration_seconds`, `status` | `exam.title`, `exam.slug`, `exam.duration_seconds`, `exam.status` |
| `description`, `label` | v2 da yo'q (kerak bo'lsa ilova o'zi `exam.code` va `exam.format` dan hosil qiladi) |
| `questions[].key` | `external_id` |
| `section` + `topic` (matn) | `block` (kod) + `topic` (raqam) |
| `prompt` | `stem_md` |
| `options: [..4 ta..]` | `payload.options: {A,B,C,D}` |
| `correct: 1` | `key: {"correct": "B"}` |
| `explanation` | `solution_md` |
| `position` (0 dan) | `position` (1 dan) |
| — | `type`, `difficulty`, `est_seconds`, `mistake_note_md`, `payload.figure`, `i18n` |
