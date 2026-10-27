'use server';

import { redirect } from 'next/navigation';
import { createGuestSession } from '@/lib/auth/guest';
import { getI18n } from '@/lib/i18n/server';
import { participantSchema } from '@/lib/participant';
import { clientKey, rateLimit } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

type Field = 'fullName' | 'phone' | 'grade';

export interface StartState {
  fieldErrors?: Partial<Record<Field | 'consent', string>>;
  message?: string;
  values?: Record<Field, string> & { consent: boolean };
}

const text = (formData: FormData, name: Field): string => {
  const v = formData.get(name);
  return typeof v === 'string' ? v : '';
};

// Ochiq redirect'dan himoya: faqat ilova ichidagi yo'l.
const safeNext = (v: FormDataEntryValue | null): string =>
  typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/start') ? v : '/';

export async function registerParticipant(_prev: StartState, formData: FormData): Promise<StartState> {
  const { t, lang } = await getI18n();
  const values = {
    fullName: text(formData, 'fullName'),
    phone: text(formData, 'phone'),
    grade: text(formData, 'grade'),
    consent: formData.get('consent') === 'on',
  };

  const parsed = participantSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: NonNullable<StartState['fieldErrors']> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as Field | 'consent' | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = t(issue.message as Parameters<typeof t>[0]);
    }
    return { fieldErrors, values };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  let userId = claims?.claims.sub;
  const ip = await clientKey();

  if (!userId) {
    // Yangi mehmon hisob yaratish: IP bo'yicha soatiga limit (sinfxonada bir IP dan ko'pchilik kirishi mumkin).
    if (!(await rateLimit(`register:${ip}`, 120, 3600))) return { message: t('start.tooMany'), values };
    userId = (await createGuestSession()) ?? undefined;
    if (!userId) return { message: t('start.failed'), values };
  } else if (!(await rateLimit(`profile:${userId}`, 30, 600))) {
    return { message: t('start.tooMany'), values };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ name: parsed.data.fullName, phone: parsed.data.phone, grade: parsed.data.grade, consent_at: new Date().toISOString(), lang })
    .eq('id', userId)
    .select('id')
    .single();
  if (error) {
    console.error('profiles update:', error.message);
    return { message: t('start.failed'), values };
  }

  redirect(safeNext(formData.get('next')));
}
