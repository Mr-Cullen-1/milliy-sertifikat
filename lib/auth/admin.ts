import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '../supabase/server';

export interface AdminUser {
  id: string;
  email: string;
  role: 'editor' | 'admin';
  name: string;
}

/** Joriy sessiya staff (editor yoki admin) bo'lsa o'sha foydalanuvchi; aks holda null. */
export async function getAdmin(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', id).maybeSingle();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'editor')) return null;
  return { id, email: String(data.claims.email ?? ''), role: profile.role, name: profile.name };
}

/**
 * Admin hududi uchun himoya. Har sahifada va HAR server amalida chaqiriladi (proxy faqat sessiya borligini tekshiradi).
 * adminOnly: nashr/arxiv/audit kabi amallar faqat 'admin' roliga; 'editor' savollarni ko'radi va yuklaydi.
 */
export async function requireAdmin(opts: { adminOnly?: boolean } = {}): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  if (opts.adminOnly && admin.role !== 'admin') redirect('/admin?denied=1');
  return admin;
}
