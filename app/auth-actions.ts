'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Ishtirokchi sessiyasini shu brauzerda tugatadi (faqat `sb-participant` cookie'si; admin sessiyasiga tegmaydi).
 * Mehmon hisobga qayta kirib bo'lmaydi: natijalar tarixi faqat shu sessiyaga bog'liq edi (docs/auth.md).
 */
export async function logoutParticipant() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/start');
}
