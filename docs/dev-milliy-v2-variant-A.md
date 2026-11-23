# Variant A: `example-milliy.v2.json` formatiga o'tkazish bo'yicha izohlar (dev jamoasi uchun)

**Fayl:** [content/export/variant-A.milliy.v2.json](../content/export/variant-A.milliy.v2.json) — Variant A, 45 topshiriq, namuna (`example-milliy.v2.json`) bilan bir xil maydonlar va tartibda.
**Qayta yaratish:** `node scripts/export-milliy-v2.mjs A` ([scripts/export-milliy-v2.mjs](../scripts/export-milliy-v2.mjs)); skript chiqarilgan faylni o'zi tekshiradi (quyida 4-bo'lim).
**Manba ma'lumot:** [content/export/variant-A.v2.json](../content/export/variant-A.v2.json) (bizning kengaytirilgan v2: tarjimalar va barcha metama'lumot shunda; format tavsifi: [import-format.md](import-format.md)).

Namuna formatiga Variant A kontenti **to'liq sig'madi**. Quyida nima qanday o'tkazilgani va qaysi joylarda formatni kengaytirish kerakligi yozilgan.

## 1. Maydonlar qanday o'tkazildi

| Bizning v2 | Namuna formati | Izoh |
|---|---|---|
| `external_id` | `id` | `gen-A-01` … `gen-A-45`, barqaror. |
| `position` | `number` | 1–45. |
| `type` | `kind` | `y1` 1–32, `y2` 33–35, `o` 36–45. |
| `block` | `block_code` | O'zgarishsiz (`sonlar`, `algebra`, `tenglama`, `funksiyalar`, `analiz`, `geometriya`, `toplam`). |
| `topic` (1–103) | `element_code` | Mavzu → rasmiy element (`config/elements.ts`): `3` → `1.1` → `e11`. Mavzuning o'zi `metadata.topic` da (3.3-band). |
| `stem_md` | `prompt` | Markdown + KaTeX. O savollarda a)/b) matni ham qo'shiladi (3.2-band). |
| `payload.options` | `payload.options` | Y-1: `A–D`, Y-2: `A–F`. |
| `payload.items[].text_md` | `payload.items[].text` | Band `id` lari `"1"`, `"2"`, `"3"`. |
| `payload.parts.{a,b}` (`prompt_md` + `hint`) | `payload.parts.{a,b}` (matn) | Qisqa yorliq `a) band javobi` (3.2-band). |
| `payload.figure` | `figure` | `{ svg, alt }`, savol darajasiga ko'tarildi; 14 ta. |
| `key.correct` / `key.pairs` / `key.{a,b}` | `answer_key` | Y-2: `pairs` o'rniga bevosita `{ "1": "F", "2": "D", "3": "C" }`. O: qabul qilinadigan javoblar ro'yxati (`["21/4", "5.25"]`). |
| `solution_md` | `explanation` | O'zgarishsiz. |
| `mistake_note_md` | `typical_error` | 13 ta savolda boshidagi `Tipik xato:` yorlig'i olib tashlandi (namunada yorliq yo'q, interfeys sarlavha qo'shadi). |
| `est_seconds`, `source`, `extra_topics`, `topic` | `metadata` | Namunada o'rni yo'q, shuning uchun `metadata` ga. |
| `i18n` (ru, kaa, en) | — | **Yo'qoldi** (3.1-band). |

Imtihon: `slug: variant-a`, `format: milliy-math-v1`, `purpose: mock`, `duration_seconds: 9000`, `status: published`, `access: free`, `content_version: A-v1`, `metadata: { variant_code: "A", generator: "gen:v1" }`.

## 2. Taxminlar (xohlasangiz o'zgartiring)

- `status: published`, `access: free`: bizning platformada Variant A hozir nashr etilgan va hammaga ochiq. Qoralama sifatida yuklash kerak bo'lsa `draft` ga almashtiring.
- `content_version: A-v1`: namunadagi `local-demo-v1` kabi, o'zimiz belgiladik.
- `format: milliy-math-v1`: bizda bu format `math-v1` deb ataladi (45 topshiriq, 150 daq, 32/3/10). Sizning tomoningizda `milliy-math-v1` shu qoidalarga mos bo'lishi kerak.
- Y-2 band `id` lari raqam ko'rinishidagi matn (`"1"`), `answer_key` kalitlari ham shular. Raqamli kalitni indeks deb o'qimang: faqat `payload.items[].id` bilan bog'lang.

## 3. Formatda yetishmaydigan narsalar (so'rovlar)

### 3.1. Tarjimalar (yuqori ustuvorlik)
Namunada tarjima uchun maydon yo'q. Variant A ning **45 ta savolining hammasi** `ru`, `kaa` (qoraqalpoq, lotin) va `en` tillarida bor (savol matni, variantlar/bandlar, yechim, tipik xato). Topshiriqning TT-13 bandi to'rt tilni talab qiladi.
**So'rov:** savol darajasida `i18n: { ru|kaa|en: { prompt, payload, explanation, typical_error } }` qabul qilinsin (asosiy bilan bir xil tuzilishda: bir xil variant harflari, band `id` lari, a/b). Tarjimalar tayyor, `variant-A.v2.json` dagi `i18n` bloklarida; `figure.svg` va `answer_key` tarjima qilinmaydi.

### 3.2. Ochiq savol (O) bandlari
Bizda har band uchun alohida savol matni (`prompt_md`) va javob formati ko'rsatmasi (`hint`) bor. Namunada `parts` faqat yorliq (matn). Ko'rsatma muhim: masalan 42-savolda «oddiy kasr (masalan 7/3) ko'rinishida yozing» (o'nli kasr aniq qiymat bermaydi), 40(b) da «Kvadrat metrda». 20 ta bandning 13 tasida ko'rsatma bor.
**Qilingan ish:** namunadagi usulda, a)/b) matni (ko'rsatma bilan) `prompt` ga yozildi (har band yangi paragrafda), `parts` ga esa `a) band javobi` / `b) band javobi` yorlig'i qo'yildi.
**So'rov:** `parts.a` ni `{ "prompt_md": "...", "hint": "..." }` obyekti sifatida ham qabul qiling (matn bo'lsa eski xatti-harakat). Shunda ko'rsatma kiritish maydoni ostida chiqadi va `prompt` takrorlanmaydi.

### 3.3. Mavzu (103 ta) va yordamchi maydonlar
Namunada faqat 21 ta `element_code` bor; bizda esa 103 ishchi mavzu (statistika, «zaif mavzular» va mavzu bo'yicha tahlil shunga tayanadi). `est_seconds`, `source`, `extra_topics` ham namunada yo'q.
**Qilingan ish:** `metadata.topic` (1–103), `metadata.extra_topics`, `metadata.est_seconds`, `metadata.source`.
**So'rov:** `metadata` dagi bu kalitlar bazada saqlanishini tasdiqlang yoki ularni birinchi darajali maydon qiling (`topic`, `extra_topics`, `est_seconds`). Aks holda `metadata` e'tiborsiz qoldirilsa mavzu ma'lumoti yo'qoladi.

### 3.4. Blok va element mos kelmaydigan savollar
Namunada `element_code` doim `block_code` bloki ichida. Bizning A–F variantlar ishchi mavzu diapazonlari bo'yicha tuzilgan, rasmiy elementlar esa ayrim mavzularni boshqa bo'limga qo'yadi. Variant A da **1 ta** shunday savol: **23-savol** (`block_code: analiz`, mavzu 57 «Arifmetik progressiya», rasmiy element `2.4` → `e24`, bu `algebra` bo'limida). Elementni sun'iy `e61` ga almashtirmadik (mazmun jihatidan noto'g'ri bo'lardi).
Bizning boshqa variantlarda ham bor (hozircha shu formatga o'tkazilmagan): B 4 ta, C 5 ta, D 2 ta, E 3 ta, F 2 ta, G–O 0 ta.
**So'rov:** validator `element_code` ning bloki `block_code` ga teng bo'lishini **talab qilmasin**. `block_code` imtihon tuzilmasi (blueprint 2/11/8/3/4/14/3) uchun, `element_code` esa mazmun tasnifi uchun mustaqil maydon.

### 3.5. Individual vazn
Namunada `weight` yo'q. Variant A da individual vazn berilmagan, shuning uchun bu fayl uchun ta'sir qilmaydi. Ammo hisoblash qoidasida (TT-04) savol vazni berilsa u standart vaznni almashtiradi: kelajak variantlar uchun ixtiyoriy `weight` (0 dan katta, 10 gacha) qabul qilinsin.

### 3.6. Renderer va sanitizatsiya uchun kerakli ro'yxatlar
Variant A ishlatadigan narsalar (shu bilan hammasi to'g'ri ko'rinishi kerak):

- **SVG teglari:** `svg, circle, ellipse, line, path, polygon, polyline, rect, text`.
- **SVG atributlari:** `xmlns, viewBox, width, height, x, y, cx, cy, r, rx, ry, d, points, dy, fill, stroke, stroke-width, stroke-dasharray, stroke-linecap, stroke-linejoin, font-family, font-size, font-weight, text-anchor`; `<text>` ichida `&#176;` kabi belgi ob'ektlari bor. Skript, tashqi havola (`href`, `xlink`), `on*` hodisalar, `<image>`, `<foreignObject>` yo'q (skript buni tekshiradi). Eng katta chizma ~3,9 ming belgi.
- **KaTeX buyruqlari:** `\frac \dfrac \sqrt \cdot \circ \pi \pm \prime \parallel \perp \in \setminus \le \ge \ne \to \Rightarrow \left \right \operatorname \qquad \quad \begin{cases}…\end{cases}` va `\\`.
- **Markdown:** abzaslar (`\n\n`) va ko'rinish formulalari `$$…$$`; qalin shrift, ro'yxat, jadval, HTML ishlatilmagan.

## 4. Fayl tekshiruvi (skript bajargan)

- 45 savol, `number` 1–45, tur: 32 `y1` + 3 `y2` + 10 `o`; bo'lim taqsimoti `sonlar 2, algebra 11, tenglama 8, funksiyalar 3, analiz 4, geometriya 14, toplam 3`.
- Barcha `id` noyob. Qayta import `id` bo'yicha takror yaratmasligi kerak.
- Y-1: variantlar aynan `A–D`, kalit shulardan biri. Y-2: `A–F`, kalit kalitlari band `id` lariga teng, har harf variantlarda bor. O: `parts` va `answer_key` bandlari bir xil, har biri kamida bitta javob.
- 14 ta chizma, hammasida `alt` bor, xavfli kontent yo'q; `[Chizma: …]` o'rinbosari yo'q; `$` belgilari juft.
- Teskari tekshiruv: asl fayl bilan solishtirganda `id`, blok, qiyinlik, savol matni, variantlar, kalitlar, yechim, chizma va mavzu raqami o'zgarmagan (O savollar uchun a)/b) matni `prompt` ichida mavjud).

**Kutilgan import natijasi:** 45 savol (32/3/10), 14 chizma, matn/kalit/yechimlar saqlangan; tarjimalar 3.1-band hal bo'lguncha yetkazilmaydi.
