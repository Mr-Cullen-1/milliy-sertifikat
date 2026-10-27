# Admin paneli

Manzil: `/admin` (kirish: `/admin/login`; hisob yaratish: [docs/auth.md](auth.md)). Panel faqat o'zbek tilida.

## Bo'limlar
| Bo'lim | Nima ko'rinadi / qilinadi |
|---|---|
| **Boshqaruv** | ishtirokchilar soni, hozir imtihonda, topshirilgan, o'rtacha taxminiy ball, darajalar taqsimoti, variantlar jadvali, oxirgi urinishlar |
| **Imtihonlar** | variantlar (A–F), holati (Qoralama / Ochiq / Arxiv), urinishlar soni, o'rtacha ball. Admin: **Ochish (nashr)**, **Yopish (arxiv)**, **Qayta ochish** |
| Imtihon tafsiloti | 45 topshiriq (tur, bo'lim, mavzu, qiyinlik, ID) va har savol bo'yicha haqiqiy "to'g'ri %": kalit xatosi yoki noto'g'ri qiyinlikni topish uchun |
| **Savollar** | bank, filtrlar (bo'lim, tur, qiyinlik, holat, ID), tillar bo'yicha mavjudlik |
| Savol ko'rinishi | talaba ko'radigan holat (4 tilda almashtirish, KaTeX va chizma), kalit, yechim, tipik xato |
| **Yuklash** | JSON import: **Tekshirish** (xatolar savol raqami va maydon yo'li bilan), **Tekshirib yuklash** (bitta tranzaksiya: hammasi yoki hech narsa) |
| **Natijalar** | barcha urinishlar: ishtirokchi, telefon, sinf, variant, ball, daraja, sarflangan vaqt, tab almashtirish soni, topshirish sababi |
| **Ishtirokchilar** | ro'yxat, ism/telefon bo'yicha qidiruv, urinishlar, eng yaxshi ball, rozilik |
| **Audit** (admin) | kirish, nashr, arxiv, import amallari jurnali |

## Variantlar (A–F) va ochish tartibi
- Hozir **A** ochiq (talabalar ko'radi). **B–F** qoralama: talabaga ko'rinmaydi.
- Ochish: *Imtihonlar* → variant yonidagi **Ochish (nashr)**. Tizim avval tekshiradi: 45 topshiriq, bo'limlar 1–32 Y-1 / 33–35 Y-2 / 36–45 O, bo'limlar bo'yicha sonlar (2/11/8/3/4/14/3), kalitlar bor, arxivlangan savol yo'q. Muammo bo'lsa sababi ko'rsatiladi.
- **Nashrdan keyin savollar o'zgarmas** (natijalar buzilmasligi uchun). Savolda xato topilsa: mockni **Yopish (arxiv)**, to'g'rilangan variantni yangi `external_id` yoki yangi kod bilan yuklash.
- Yopilgan (arxiv) mock: yangi urinish boshlanmaydi, mavjud natijalar saqlanadi; **Qayta ochish** mumkin.

## JSON yuklash formati
Namuna: *Yuklash* sahifasidagi "Namunaviy JSON" (yoki `content/variants/variant-A.json`).
Ikki shakl: **savollar massivi** (faqat bankka) yoki `{ "exam": { "title", "code" }, "questions": [45 ta] }` (savollar + mock qoralamasi).

Savol maydonlari: `type` (y1|y2|o), `block`, `topic` (1–103, blokka tegishli), `difficulty` (L1|L2|L3), `stem_md`, `payload`, `key`, `solution_md`, `mistake_note_md`, `est_seconds`, `external_id`, `i18n` (`ru`/`kaa`/`en`: `stem_md`, `payload`, `solution_md`, `mistake_note_md`), `payload.figure` (`{svg, alt}`).
Tekshiruvlar: payload shakli, kalit shakli, kalit va payload mosligi, tarjima tuzilishi bir xilligi, SVG xavfsizligi, mock uchun blueprint.
`external_id` bo'yicha qayta yuklash dublikat yaratmaydi.

## Kontent qayta generatsiya
`pnpm content:dump` generatorlardan 6 ta variantni `content/variants/*.json` ga yozadi; `pnpm content:seed` ularni bazaga yuklaydi va A ni ochadi (idempotent). Batafsil: [docs/content.md](content.md).
