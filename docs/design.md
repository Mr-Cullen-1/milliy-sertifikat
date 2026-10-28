# Dizayn: Figma manbasi va ilovaga moslash

## Manba
- Fayl: **dizayn-test-platform (Copy)**, kalit `B35bKfnkHAPkxG8OUEX4S4` (asl fayl faqat ko'rish huquqi bilan edi, shuning uchun nusxa olingan).
- https://www.figma.com/design/B35bKfnkHAPkxG8OUEX4S4/dizayn-test-platform--Copy-
- Sahifa `2007:38` "Redesign — До / После": bitta o'quv platformasi ekranlarining 4 ta qayta dizayni.
  - A · Toza, **B · O'yin (tanlangan)**, C · Kosmos, D · Daftar.
- Muhim: dizayn **dars/mashq platformasi** uchun (Dars savoli, Eslaymiz, Mashq, Moslash, Savatlar, Yakun), mock imtihon ekrani emas. Biz undan **uslub va komponentlarni** olamiz; imtihon ekranlari (45 savol paneli, taymer, topshirish tasdig'i) dizaynda yo'q va shu uslubda biz o'zimiz quramiz.

## B variant freymlari (keyingi o'qish uchun ID'lar)
Desktop (1440×900):

| Freym | ID | Bizdagi vazifasi |
|---|---|---|
| Header/B · O'yin | `2010:14509` | yuqori panel |
| B/01 Dars savoli | `2010:14596` | **o'qilgan**: tanlov kartalari, progress, tugma (Y-1 ga asos) |
| B/02 Eslaymiz (boshlang'ich / noto'g'ri / to'g'ri) | `2010:15137` / `2010:15680` / `2010:16252` | javob holatlari (to'g'ri/noto'g'ri) |
| B/05 Mashq 1 — Bo'shliqlar | `2010:16854` | matn ichida javob maydoni (O ga asos) |
| B/10 Mashq 3 — Raqamlar bilan | `2010:17444` | raqamli javob (O ga asos) |
| B/12 Mashq 4 — Moslash | `2010:18053` | **o'qilgan**: **Y-2 (moslashtirish)** ga asos |
| B/13 Mashq 5 — Savatlar | `2010:18688` | guruhlash |
| B/15 Yakun | `2010:19327` | **o'qilgan**: natija sahifasiga asos |

Mobil (390×844): `B/01` `2010:19957`, `B/05` `2010:20332`, `B/10` `2010:20762`, `B/12` `2010:21280`, `B/15` `2010:21835`.

Figma'ni o'qish: `get_metadata` butun sahifa uchun ~750 ming belgi beradi, shuning uchun sahifani emas, aniq freym ID'sini so'rang. Tarifga qarab o'qish chaqiruvlari soni cheklangan bo'lishi mumkin: har bir kerakli ekran uchun bitta `get_design_context` yetarli.

## Olingan tokenlar (B/01 dan) — app/globals.css da
| Token | Qiymat | Ishlatilishi |
|---|---|---|
| `ink` | `#1e1b39` | asosiy matn |
| `muted` / `faint` | `#6f6b8a` / `#a9a5c0` | ikkilamchi matn / o'chirilgan matn |
| `line` | `#e6e3f2` | chegaralar |
| `surface` / `track` | `#f6f5fb` / `#eceaf5` | karta foni / progress yo'li |
| `brand` / `brand-edge` | `#e8590c` / `#b84306` | asosiy tugma, to'ldirilgan progress segmentlari (Yakun, Moslash freymlaridan tasdiqlangan) |
| `brand-current` / `brand-soft` | `#fa4f28` / `#ffd2b8` | joriy progress segmenti va uning chegarasi |
| `brand-tint` / `brand-ink` | `#fff0e6` / `#b03f05` | to'q sariq chip / izoh fonlari va matni |
| `success` / `-soft` / `-line` / `-ink` | `#2fa84f` / `#e6f7ea` / `#bfe6c9` / `#1c6e33` | juftlangan/to'g'ri holat, ball kartasi |
| `selected` | `#6c47ff` | tanlangan band/variant chegarasi (Moslash) |
| `line-strong` / `ink-soft` | `#d5d1e8` / `#4f4b6b` | ikkilamchi tugma chegarasi / izoh matni |
| `gold` / `gold-edge` | `#f5a400` / `#c98700` | daraja nishoni (kubok) |
| `accent` / `accent-soft` | `#4b2fd0` / `#f0ecff` | chip, havolalar, belgilar |
| `success-soft` / `warn-soft` | `#e6f7ea` / `#fff6db` | ikonka fonlari |
| `disabled-bg` / `disabled-edge` | `#eceaf4` / `#dedbeb` | o'chirilgan tugma |
| shriftlar | **Nunito** (ExtraBold/Black: interfeys, javoblar), **Onest** SemiBold (sarlavhalar) | `font-sans`, `font-heading` |
| shakl | radius 16 (tugma, tanlov), 24 (katta karta), 999 (chip); chegara 2px, pastki **5px** ("bosiladigan" ko'rinish) | |
| o'lchamlar | sarlavha 88px, pastki panel 112px, kontent kengligi 760px, sarlavha matni 36/43px | |

## Taxminiy (Figma'dan EMAS)
- `danger` (`#d92d3a`): xato matni va "noto'g'ri" belgisi; dizaynda xato holati ko'rilmagan (Eslaymiz — noto'g'ri freymi: `2010:15680`, o'qilsa aniqlanadi).
- Qorong'i rejim yo'q (dizayn faqat yorug'), shuning uchun `prefers-color-scheme` o'chirilgan.
- Ikonkalar Figma SVG lari emas, oddiy ichki SVG (`components/ui/icons.tsx`).

## Komponentlar
- `components/ui/button.tsx`: `Button`, `buttonClass` (primary/secondary, 3D bosish effekti).
- `components/ui/chip.tsx`: `Chip` (Chip/section).
- Forma maydonlari uslubi [app/start/start-form.tsx](../app/start/start-form.tsx) ichida (Choice kartasi uslubi); ikkinchi joyda kerak bo'lganda `components/ui/` ga ko'chiriladi.

## Dizaynda yo'q, biz o'zimiz qurgan ekranlar
Imtihon ekrani (45 savol paneli, taymer, belgilash, saqlash holati), topshirishni tasdiqlash oynasi, imtihonlar ro'yxati va qoidalar sahifasi, blok bo'yicha tahlil. Ular shu tokenlar va komponentlar bilan qurilgan. Admin hali yo'q.

## Moslashtirishlar (dizayn → bizning ilova)
- **Moslash → Y-2:** dizaynda sonlar va o'qilishlar; bizda chapda bandlar, o'ngda A–F variantlar. Bandni tanlang (binafsha), variantni bosing (yashil, nishonda juft raqami). Bir variant bir nechta bandga mos kelishi mumkin.
- **Yakun → natija:** yashil ball kartasi saqlangan, "3 / 6" o'rnida taxminiy "≈ ball / 75", daraja nishoni (kubok rangida) va "taxminiy" ogohlantirishi qo'shilgan.
- **Progress:** 15 segment o'rniga 45 ta ingichka segment (faqat keng ekranda) + 1–45 savollar paneli.

## Bezak va qobiq (2026-10-28)
- Qobiq: `components/page-shell.tsx` (navbar + kontent + footer; `fit` — katta ekranda scrollsiz, ixcham footer; `minimal` — menyusiz navbar). Navbar `site-header.tsx` (mascot logotipi, faol bo'lim, mobil menyu), footer `site-footer.tsx` (to'liq/ixcham).
- Assetlar: `public/art` (tozalangan PNG + SVG ikonlar), `pnpm`siz: `node scripts/prepare-art.cjs` qayta generatsiya qiladi (`components/art-data.ts` ham). Komponentlar: `components/art.tsx` (`Art`, `ArtIcon`, `MascotBadge`), `decor.tsx` (fon bezaklari, faqat lg+), `page-hero.tsx` (`PageHero`, `EmptyState`).
- Kartalar fondan ajralishi: `border-line-strong` + `bg-white` + `shadow-card`; sahifa foni lavanda (`--color-page`). Tugmalar: `components/ui/button.tsx` (primary/accent/secondary, 3D pastki chegara).
