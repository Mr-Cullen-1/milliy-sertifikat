'use server';

import { cookies } from 'next/headers';
import { LANG_COOKIE, isLang } from '@/lib/i18n/config';
import { createClient } from '@/lib/supabase/server';

/** Tilni cookie'ga yozadi (1 yil) va sessiya bo'lsa profilga ham saqlaydi. */
export async function setLanguageAction(lang: string): Promise<void> {
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: false });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (id) await supabase.from('profiles').update({ lang }).eq('id', id);
}
