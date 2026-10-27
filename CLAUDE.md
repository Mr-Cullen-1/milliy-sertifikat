# Loyiha: Milliy sertifikat (Matematika) — Mock imtihon sayti

Til: foydalanuvchi bilan o'zbek tilida (lotin) muloqot qiling.

## Holat (2026-10-27)
Platforma reliz oldi holatida: foydalanuvchi qismi, admin paneli, 6 variant (270 savol), 4 til, DTM kalkulyatori, natijalar tarixi va xatolar daftari tayyor. Foydalanuvchida faqat jonli/vizual tekshiruv va deploy qoldi (docs/release.md). Buyruqlar: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test:live` (haqiqiy Supabase'ga qarshi, o'zi yaratgan ma'lumotni o'chiradi).

Tayyor:
- Next.js 16 + TS + Tailwind 4 (pnpm), Vitest, PGlite (Docker kerak emas). Dizayn: Figma B variant "O'yin" (docs/design.md, tokenlar app/globals.css, components/ui/).
- Imtihon yadrosi lib/exam/* (ball, daraja, normallashtirish, finalize, Zod sxemalar, saqlash navbati, taymer); format konfiguratsiyada: config/exam-format.math-v1.ts.
- Baza (Supabase bulut, ap-southeast-2): supabase/migrations/ (7 ta: sxema, RLS, RPC dvigatel, ma'lumotnoma, ishtirokchi profili, platforma, import). Ma'lumotnoma migratsiyasi avto-generatsiya: `pnpm gen:reference`. Tiplar: `pnpm gen:types`. Qo'llash: `npx supabase@latest db push --db-url "$SUPABASE_DB_URL"`.
- Foydalanuvchi sahifalari: /start, /, /exams, /exams/[id], /attempts/[id], .../result, /history, /mistakes, /dtm, /privacy. Server actions: app/attempts/actions.ts, app/start/actions.ts.
- Tillar: uz, ru, kaa (qoraqalpoq lotin), en: lib/i18n/ (cookie `lang`, tipli lug'at, `useT`/`getI18n`), savollar tarjimasi questions.i18n da.
- Admin: /admin (docs/admin.md): boshqaruv paneli, imtihonlar (nashr/arxiv), savollar + ko'rinish, JSON import, natijalar, ishtirokchilar, audit. Faqat o'zbekcha.
- Kontent: content/gen/* generatorlari (original savollar, javoblar kod bilan hisoblanadi) -> content/variants/variant-A..F.json -> `pnpm content:seed` (faqat A ochiq, B–F qoralama). docs/content.md.
- Xavfsizlik: nonce asosida CSP (proxy.ts, lib/security/csp.ts), xavfsizlik sarlavhalari (next.config.ts), Postgres rate limit, audit jurnali, rozilik, suv belgisi, tab-almashtirish logi, mehmon hisoblarni tozalash.

Muhim kelishuvlar:
- Ishtirokchi uchun LOGIN YO'Q (ichki platforma): /start da ism-familiya (bitta maydon), telefon, sinf, rozilik; server jim "mehmon hisob" (@guest.invalid) yaratadi (lib/auth/guest.ts). Anonim kirishni yoqish shart emas. Admin: haqiqiy email+parol (`pnpm admin:create`). Tafsilot va keyin ichki platformaga ulash: docs/auth.md.
- Haqiqiy imtihon savollarini ko'chirmang; faqat original savollar. Format konfiguratsiyada. Natijalar doim "taxminiy".
- Nashr etilgan savol/mock o'zgarmaydi (trigger): tuzatish uchun yangi variant yuklab, eskisini arxivlang. Bazaga sinov ma'lumoti yozmang (test:live o'zi tozalaydi).
- Rasmiy manbalar tekshiruvi: nima tasdiqlangan, nima faraz: docs/rasmiy-manbalar.md (Y-2 tuzilishi, O javob formati, DTM 93/63/11 va ÷65 uchinchi tomon).
- Kalitlar: .env (NEXT_PUBLIC_*) va .env.local (SUPABASE_SECRET_KEY, SUPABASE_DB_URL): ichini o'qimang, chatga chiqarmang.
- Cache Components yoqilgan: runtime ma'lumot (cookie/searchParams) Suspense ichida; root layout I18nRoot shuni ta'minlaydi. Next 16: middleware emas proxy.ts; cookies() async. AGENTS.md: kod yozishdan oldin node_modules/next/dist/docs/ ni o'qing.
- Figma o'qish chaqiruvlari cheklangan bo'lishi mumkin (aniq freymni so'rang): docs/design.md.

Relizdan keyin: ichki platformaga ulash (docs/auth.md), Rasch (1PL) kalibrovkasi (100+ natija), kontent va qoraqalpoq tarjimasini mutaxassis tekshiruvi (docs/content.md).

## Asosiy hujjatlar
- docs/loyiha.md — format, ball tizimi, funksiyalar, ma'lumotlar modeli, yo'l xaritasi
- docs/mavzular.md — rasmiy 7 bo'lim + 103 ta ishchi mavzu (taksonomiya)
- docs/auth.md, docs/admin.md, docs/content.md, docs/design.md, docs/rasmiy-manbalar.md, docs/release.md

## Tasdiqlangan faktlar (rasmiy spetsifikatsiya)
- 45 topshiriq, 150 daq: 1–32 Y-1 (yopiq A–D), 33–35 Y-2 (moslashtirish), 36–45 O (ochiq, a/b bandli)
- Bo'limlar bo'yicha savollar: Sonlar 2, Algebraik shakl almashtirish 11, Tenglama/tengsizlik 8, Funksiyalar 3, Analiz 4, Geometriya 14, To'plam/ehtimollik/modellashtirish 3
- Natija Rasch modeli bo'yicha 75 ball: A+ 70+, A 65, B+ 60, B 55, C+ 50, C 46
- Ball og'irliklari (2023 tahri, taxminiy): Y-1 1,3/2,2; Y-2 2,2; O a 1,5 / b 1,7 / ikkalasi 3,2
- DTM: A+/A maksimal ball, B+...C proporsional, majburiy fanda har qanday daraja maksimal (Vazirlar Mahkamasi 17-son, 2024-yil 10-yanvar)

## Tavsiya stack
Next.js + TypeScript + Tailwind, Supabase (Postgres/Auth), KaTeX. Imtihon taymeri server tomonda (DB soati).
