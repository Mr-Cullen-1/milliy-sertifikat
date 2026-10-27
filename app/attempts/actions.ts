'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { finalizeOwnAttempt } from '@/lib/exam/attempt.server';
import type { SaveOutcome } from '@/lib/exam/save-queue';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/database.types';

const uuid = z.uuid();

// Javob qiymati: Y-1 harf, Y-2 {band: harf}, O {a, b}. Katta/begona shakllar rad etiladi.
const answerValue = z.union([
  z.string().max(64),
  z.record(z.string().max(32), z.string().max(64)).refine((r) => Object.keys(r).length <= 20),
]);

const saveInput = z.object({
  attemptId: uuid,
  questionId: uuid,
  value: answerValue.optional(),
  flagged: z.boolean().optional(),
  timeSpent: z.number().int().min(0).max(86_400).optional(),
});

/** Imtihonni boshlaydi (yoki davom ettiradi) va imtihon ekraniga yo'naltiradi. */
export async function startAttemptAction(examId: string): Promise<void> {
  if (!uuid.safeParse(examId).success) redirect('/exams');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('start_attempt', { p_exam_id: examId });
  if (error) {
    const needsRegistration =
      error.code === '42501' || error.message.includes('not_authenticated') || error.message.includes('profile_incomplete');
    if (needsRegistration) redirect(`/start?next=${encodeURIComponent(`/exams/${examId}`)}`);
    if (error.message.includes('exam_not_available')) redirect('/exams');
    throw new Error(`start_attempt: ${error.message}`);
  }

  const { attempt_id } = z.object({ attempt_id: z.string() }).parse(data);
  redirect(`/attempts/${attempt_id}`);
}

/** Bitta javobni saqlaydi. Natija SaveQueue tushunadigan turga o'tkaziladi. */
export async function saveAnswerAction(input: unknown): Promise<SaveOutcome> {
  const parsed = saveInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'invalid', message: 'noto\'g\'ri so\'rov' };
  const { attemptId, questionId, value, flagged, timeSpent } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('save_answer', {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_value: value as Json | undefined,
    p_flagged: flagged,
    p_time_spent: timeSpent,
  });

  if (error) {
    const m = error.message;
    if (m.includes('attempt_closed') || m.includes('deadline_passed')) return { ok: false, code: 'closed', message: m };
    if (m.includes('attempt_not_found') || m.includes('question_not_in_exam') || m.includes('value_too_large')) {
      return { ok: false, code: 'invalid', message: m };
    }
    // Sessiya muammosi va boshqa kutilmagan xatolar qayta uriniladi: javob yo'qolmasin.
    return { ok: false, code: 'network', message: m };
  }

  const r = z.object({ server_now: z.string(), deadline_at: z.string() }).safeParse(data);
  return r.success ? { ok: true, serverNow: r.data.server_now, deadlineAt: r.data.deadline_at } : { ok: true };
}

export type FinalizeActionResult =
  | { ok: true; status: 'in_progress' | 'submitted'; serverNow?: string }
  | { ok: false };

/**
 * expired=true: faqat DB soati bo'yicha muddat o'tgan bo'lsa yopadi (taymer sinxronlash va avto-topshirish).
 * expired=false: talaba "Topshirish" ni bosdi. Javobda server vaqti ham qaytadi.
 */
export async function finalizeAction(attemptId: string, expired: boolean): Promise<FinalizeActionResult> {
  if (!uuid.safeParse(attemptId).success) return { ok: false };
  const outcome = await finalizeOwnAttempt(attemptId, { onlyIfExpired: expired });
  if (!outcome) return { ok: false };
  return { ok: true, status: outcome.status, serverNow: outcome.serverNow };
}

/** Tab almashtirish hisoblagichi (faqat log; baholashga ta'sir qilmaydi). */
export async function logTabSwitchAction(attemptId: string): Promise<void> {
  if (!uuid.safeParse(attemptId).success) return;
  const supabase = await createClient();
  await supabase.rpc('log_tab_switch', { p_attempt_id: attemptId });
}
