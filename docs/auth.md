# Kirish va autentifikatsiya

## Ishtirokchi (o'quvchi): login yo'q
Platforma ichki platforma ichida ishlaydi, shuning uchun **login, parol va email yo'q**. O'quvchi `/start` sahifasida bir marta yoziladi:
ism va familiya (bitta maydon), telefon, sinf va shaxsiy ma'lumotlarga rozilik. Hammasi majburiy.

Texnik tomoni ([app/start/actions.ts](../app/start/actions.ts), [lib/auth/guest.ts](../lib/auth/guest.ts)):
1. Forma to'g'ri to'ldirilganda server **mehmon hisob** yaratadi: Supabase Auth'da tasodifiy `g-<uuid>@guest.invalid` email va tasodifiy parol bilan foydalanuvchi, so'ng shu bilan serverda sessiya ochiladi. Parol hech qayerda saqlanmaydi (hisobga qayta kirib bo'lmaydi, sessiya brauzer cookie'sida).
2. `profiles` ga ism, telefon, sinf, `consent_at` va til yoziladi.
3. `start_attempt` profil to'liq bo'lmasa (ism, telefon, sinf, rozilik) `profile_incomplete` xatosini beradi: forma aylanib o'tilsa ham majburiylik buzilmaydi.
4. RLS va RPC funksiyalari `auth.uid()` ga tayanadi: har kim faqat o'z attempt'i va javoblarini ko'radi.

Dashboard'da "Allow anonymous sign-ins" yoqish **shart emas** (mehmon hisoblar odatiy foydalanuvchi sifatida server tomonidan yaratiladi).

### Himoya
- Mehmon hisob yaratish IP bo'yicha soatiga 120 ta (sinfxonada bir IP dan ko'pchilik kirishi uchun); profilni yangilash 10 daqiqada 30 ta. Limit bazada (`rate_limit_hit`), IP xeshlanib saqlanadi.
- Tashlab ketilgan mehmon hisoblar (attempt'siz, 7 kundan eski) `cleanup_guest_users()` bilan avtomatik o'chiriladi (har kuni 03:30, `pg_cron` yoqilgan bo'lsa; aks holda qo'lda yoki boshqa rejalashtirgichdan chaqiring).
- Maxfiylik siyosati: `/privacy`.

### Cheklovlar
- Natijalar tarixi **shu brauzerga bog'liq**: cookie tozalansa yoki boshqa qurilmadan kirilsa o'quvchi yangi ishtirokchi bo'ladi.
- **Telefon raqam identifikator emas.** Raqam bo'yicha eski natijalarni ochib bo'lmaydi: egasini tasdiqlash (OTP) yo'q.
- Iframe ichida (boshqa domenda) ishlatilsa, brauzerlar uchinchi tomon cookie'larini bloklaydi: bunday holda ichki platformaga SSO yoki bir domen (subdomen) ishlatish kerak (quyiga qarang).

## Admin: haqiqiy email + parol
Admin paneli `/admin` (kirish: `/admin/login`). Bu yagona haqiqiy login. Rollar `profiles.role`:
- `admin`: hamma narsa, jumladan mockni ochish/yopish (nashr), audit jurnali.
- `editor` (muharrir): statistikani, savollarni ko'radi va JSON yuklaydi; nashr qila olmaydi.

Hisob yaratish (bir marta, o'zingiz):

    pnpm admin:create sizning@email.uz "KuchliParol123"          # admin
    pnpm admin:create muharrir@email.uz "KuchliParol123" editor   # muharrir

Parol kamida 10 belgi; buyruq satrida beriladi va saqlanmaydi. Mavjud email bo'lsa parol yangilanadi va rol qo'yiladi.

Himoya: IP va email bo'yicha urinishlar limiti (15 daqiqada 20 / 6, baza ishlamasa rad etiladi), xato xabari sababni oshkor qilmaydi, har sahifa va har server amali rolni qayta tekshiradi (proxy faqat sessiya borligini tekshiradi), amallar `audit_log` ga yoziladi.
Bir brauzerda admin bo'lib kirgan odam o'sha sessiya bilan imtihon ham topshira oladi (sinash uchun); alohida sinash uchun boshqa brauzer yoki inkognito oynadan foydalaning.

## Keyinchalik: ichki platformaga ulash
Quyidagilar kodda tayyor va olib tashlanmagan:
- `profiles` jadvali (rol, ism, telefon, sinf, til, rozilik); `auth.users` bilan bog'liq `attempts.user_id`.
- `lib/supabase/{client,server,admin,proxy}.ts`, `proxy.ts`, RLS siyosatlari.
- [lib/participant.server.ts](../lib/participant.server.ts) `getParticipant()`: identifikatsiya usuli almashganda asosan shu va `app/start` o'zgaradi.

Variantlar:
1. **Mehmon hisobni haqiqiy hisobga ulash (natijalar saqlanadi):** `auth.admin.updateUserById(id, { email })` yoki OAuth identity'ni ulash; `user.id` o'zgarmaydi, shuning uchun attempt va javoblar yo'qolmaydi.
2. **Ichki platforma bilan SSO:** ichki platforma o'quvchini imzolangan token bilan yuboradi; Supabase'da shu token orqali sessiya beriladi (third-party auth yoki custom JWT). Shunda `/start` formasi kerak bo'lmasligi mumkin: ism/sinf/telefon ichki platformadan olinadi.
3. **Iframe:** ichki platforma sayti bu platformani `<iframe>` ichida ochsa, `.env` da `ALLOWED_FRAME_ANCESTORS="https://ichki.platforma.uz"` ni bering (CSP `frame-ancestors`). Cookie'lar uchun bir registrable-domen (masalan `mock.platforma.uz`) ishlatilsa, ular birinchi tomon bo'lib qoladi; boshqa domen bo'lsa 2-variant (SSO) kerak.

## Admin va ishtirokchi sessiyalari ajratilgan (2026-10-28)
Bitta brauzerda ham admin, ham ishtirokchi bo'lib ishlash mumkin: sessiya cookie'lari hududga qarab ajratiladi (`lib/supabase/area.ts`).
- `/admin...` — Supabase'ning standart cookie nomi; qolgan sahifalar — `sb-participant`.
- `proxy.ts` so'rovga `x-area` sarlavhasini qo'yadi; `lib/supabase/server.ts` va `lib/supabase/proxy.ts` shundan cookie nomini tanlaydi.
- Sabab: ilgari admin kirganda ishtirokchi sessiyasi almashib ketardi, natijada ishtirokchi sahifalarida qoralama variantlar ko'rinardi (admin RLS bilan hammasini ko'radi) va o'z natija sahifasi 404 berardi.
- Sinov: `npm run smoke` ikkala cookie bilan so'rov yuborib tekshiradi.
