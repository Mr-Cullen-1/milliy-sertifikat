# Vercel'ga chiqarish ro'yxati

Reliz uchun kod tayyor; quyidagilar sizning hisoblaringiz va sozlamalaringiz bilan bajariladi.

## 1. Supabase
- [x] Migratsiyalar qo'llangan (`npx supabase@latest db push --db-url "$SUPABASE_DB_URL"`; har yangi migratsiyadan keyin `pnpm gen:types`).
- [ ] **Loyiha regioni**: hozirgi loyiha Sydney (`ap-southeast-2`) va regionni keyin o'zgartirib bo'lmaydi. Reliz oldidan O'zbekistonga yaqinroq regionda yangi loyiha ochish arzon: yangi `.env` qiymatlari, `db push`, `pnpm content:seed`, `pnpm admin:create`.
- [ ] **Pullik reja** (bepul loyiha 1 hafta faoliyatsizlikdan keyin pauza qilinadi; zaxira nusxalar uchun ham).
- [ ] **Authentication → Rate Limits**: mehmon hisoblar server tomonidan yaratiladi (admin API), shuning uchun anonim kirishni yoqish shart emas. Lekin **Authentication → Providers → Email** yoqiq bo'lsin (admin parol bilan kiradi). "Confirm email" ixtiyoriy (admin hisoblar tasdiqlangan holda yaratiladi).
- [ ] `pg_cron` yoqilganini tekshiring (Database → Extensions); bo'lmasa `select public.cleanup_guest_users();` ni boshqa rejalashtirgichdan kuniga bir marta chaqiring.
- [ ] Data API yoqiq; "Automatically expose new tables" o'chiq, "Automatic RLS" yoqiq (tavsiya).

## 2. Vercel muhit o'zgaruvchilari
| O'zgaruvchi | Qiymat |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase loyiha URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | **Secret key** (faqat server; `NEXT_PUBLIC_` qo'shmang) |
| `ALLOWED_FRAME_ANCESTORS` | (ixtiyoriy) ichki platforma iframe'i uchun: `https://ichki.platforma.uz` (bo'sh joy bilan bir nechta) |
| `NEXT_PUBLIC_SITE_URL` | (ixtiyoriy) hozir ishlatilmaydi |

`SUPABASE_DB_URL` Vercel'ga **kerak emas** (faqat migratsiya uchun, lokal).

## 3. Birinchi ishga tushirish
1. Vercel'da repozitoriyani ulang, Node 24, `pnpm` (Framework: Next.js). Build: `pnpm build`.
2. Lokal mashinada (`.env`, `.env.local` to'ldirilgan):
   - `pnpm admin:create sizning@email.uz "KuchliParol123"`: admin hisobi.
   - `pnpm content:dump && pnpm content:seed`: 6 variant yuklanadi, **faqat A ochiq**.
   - `pnpm test:live`: haqiqiy bazaga qarshi to'liq oqim testi (o'zi yaratgan foydalanuvchilarni o'chiradi).
   - `pnpm build && pnpm smoke`: qurilgan ilovani haqiqiy sessiya cookie'lari bilan ishga tushirib, barcha sahifalarni (foydalanuvchi va admin) tekshiradi.
3. Vercel domenida `/admin/login` orqali kiring; B–F ni kerak bo'lganda *Imtihonlar* bo'limidan oching.

## 4. Chiqarishdan oldin tekshiruv (qo'lda)
- [ ] `/start` → forma → `/exams` → A varianti → imtihon → natija (4 tilni almashtirib ko'ring).
- [ ] Imtihonda: javob berish, sahifani yangilash (javoblar saqlanadi), internetni uzib/qaytarish (oflayn belgi, javoblar yo'qolmaydi), 5 daqiqa qolganda ogohlantirish, vaqt tugashi (avto-topshirish).
- [ ] Mobil ko'rinish (telefon, 390px).
- [ ] `/dtm`, `/history`, `/mistakes`, `/privacy`.
- [ ] Admin: boshqaruv paneli, natijalar, savol ko'rinishi, JSON yuklash (Tekshirish).
- [ ] Brauzer konsolida CSP xatolari yo'qligini tekshiring (`Content-Security-Policy` sarlavhasi nonce bilan qo'yiladi).

## 5. Relizdan keyin
- Ichki platformaga ulash: [docs/auth.md](auth.md) ("Keyinchalik").
- Rasch (1PL) kalibrovkasi: kamida 100+ topshirilgan natija to'planganda ([docs/loyiha.md §7.4](loyiha.md)); admin panelda savol bo'yicha "to'g'ri %" shu uchun kerakli xom ma'lumot.
- Kontentni mutaxassis tekshiruvidan o'tkazish: [docs/content.md](content.md).
