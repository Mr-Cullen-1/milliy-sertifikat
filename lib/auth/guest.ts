import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { createAdminClient } from '../supabase/admin';
import { createClient } from '../supabase/server';

/**
 * Login yo'q: o'quvchi uchun jim "mehmon hisob" yaratiladi va brauzerga sessiya beriladi.
 * Email/parol tasodifiy va hech qayerda saqlanmaydi (hisobga qayta kirib bo'lmaydi, sessiya cookie'da).
 * Keyinchalik haqiqiy auth qo'shilganda bu hisob emailga ulanadi (docs/auth.md).
 * `.invalid` domeni: bu manzillar mehmon ekanini bildiradi (cleanup_guest_users shuni tozalaydi).
 */
export async function createGuestSession(): Promise<string | null> {
  const admin = createAdminClient();
  const email = `g-${randomUUID()}@guest.invalid`;
  const password = randomBytes(32).toString('base64url');

  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { guest: true } });
  if (created.error || !created.data.user) {
    console.error('createGuestSession (createUser):', created.error?.message);
    return null;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('createGuestSession (signIn):', error.message);
    await admin.auth.admin.deleteUser(created.data.user.id);
    return null;
  }
  return created.data.user.id;
}
