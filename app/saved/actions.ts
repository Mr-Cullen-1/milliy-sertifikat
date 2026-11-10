'use server';

import { z } from 'zod';

export type ToggleSavedResult = { ok: true; saved: boolean } | { ok: false; code: 'invalid' | 'limit' | 'unavailable' | 'auth' | 'error' };

/** Savolni saqlaydi yoki saqlanganlardan olib tashlaydi (almashtiradi). Faqat o'zi topshirgan imtihondagi savol. */
export async function toggleSavedAction(questionId: unknown): Promise<ToggleSavedResult> {
  const parsed = z.uuid().safeParse(questionId);
  if (!parsed.success) return { ok: false, code: 'invalid' };

  // Kech import: komponent testlarida (env siz) bu modul yuklanganda Supabase sozlamalari talab qilinmasin.
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('toggle_saved_question', { p_question_id: parsed.data });
  if (error) {
    const m = error.message;
    if (m.includes('saved_limit')) return { ok: false, code: 'limit' };
    if (m.includes('question_not_available')) return { ok: false, code: 'unavailable' };
    if (m.includes('not_authenticated') || error.code === '28000' || error.code === '42501') return { ok: false, code: 'auth' };
    return { ok: false, code: 'error' };
  }
  return { ok: true, saved: data === true };
}
