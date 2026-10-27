// Admin hisobini yaratadi (yoki mavjud foydalanuvchini admin qiladi): bir marta, o'zingiz ishga tushirasiz.
//   pnpm admin:create sizning@email.uz "KuchliParol123"
//   pnpm admin:create sizning@email.uz "KuchliParol123" editor     (muharrir: savollarni ko'radi/yuklaydi, nashr qila olmaydi)
// Parol buyruq satrida yoziladi va hech qayerga saqlanmaydi; kamida 10 belgi.
import { createClient } from '@supabase/supabase-js';

const [email, password, roleArg] = process.argv.slice(2);
const role = roleArg === 'editor' ? 'editor' : 'admin';

if (!email || !password) {
  console.error('Foydalanish: pnpm admin:create <email> <parol> [admin|editor]');
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Email noto\'g\'ri');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Parol kamida 10 belgi bo\'lsin');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL yoki SUPABASE_SECRET_KEY topilmadi (.env / .env.local)');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let userId;
const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: 'Admin' } });
if (created.error) {
  if (!/already|registered|exists/i.test(created.error.message)) {
    console.error('Yaratib bo\'lmadi:', created.error.message);
    process.exit(1);
  }
  // Mavjud foydalanuvchi: parolni yangilaymiz.
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list.data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    console.error('Foydalanuvchi mavjud, lekin topilmadi');
    process.exit(1);
  }
  userId = existing.id;
  const upd = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (upd.error) {
    console.error('Parolni yangilab bo\'lmadi:', upd.error.message);
    process.exit(1);
  }
  console.log('Mavjud foydalanuvchi: parol yangilandi.');
} else {
  userId = created.data.user.id;
}

const { error } = await admin.from('profiles').update({ role, name: 'Admin' }).eq('id', userId);
if (error) {
  console.error('Rolni belgilab bo\'lmadi:', error.message);
  process.exit(1);
}
console.log(`Tayyor: ${email} endi "${role}". Kirish: /admin/login`);
