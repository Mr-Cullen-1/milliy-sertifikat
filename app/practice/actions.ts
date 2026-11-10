'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { BLOCK_CODES } from '@/config/topics';
import { getI18n } from '@/lib/i18n/server';
import { getParticipant } from '@/lib/participant.server';
import { feedbackImmediately, FREE_PRACTICE_SOLUTIONS, isPracticeDifficulty, isPracticeMode, PRACTICE_COUNTS } from '@/lib/practice/config';
import { gradePractice } from '@/lib/practice/grade';
import { practiceStateSchema, type PracticeAnswer } from '@/lib/practice/state';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

const uuid = z.uuid();

export interface StartPracticeState {
  error?: 'none' | 'tooMany' | 'invalid' | 'generic';
}

/** Mashqni boshlaydi va mashq ekraniga yo'naltiradi. Forma: block, difficulty, mode, count. */
export async function startPracticeAction(_prev: StartPracticeState, formData: FormData): Promise<StartPracticeState> {
  const block = String(formData.get('block') ?? '');
  const difficulty = String(formData.get('difficulty') ?? 'all');
  const mode = String(formData.get('mode') ?? '');
  const count = Number(formData.get('count'));
  if (!(BLOCK_CODES as readonly string[]).includes(block) || !isPracticeDifficulty(difficulty) || !isPracticeMode(mode) || !(PRACTICE_COUNTS as readonly number[]).includes(count)) {
    return { error: 'invalid' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('start_practice', {
    p_block: block,
    p_difficulty: difficulty === 'all' ? (null as unknown as string) : difficulty,
    p_mode: mode,
    p_count: count,
  });
  if (error) {
    const m = error.message;
    if (error.code === '42501' || m.includes('not_authenticated') || m.includes('profile_incomplete')) redirect(`/start?next=${encodeURIComponent('/practice')}`);
    if (m.includes('no_questions')) return { error: 'none' };
    if (m.includes('too_many_active')) return { error: 'tooMany' };
    if (m.includes('practice_invalid')) return { error: 'invalid' };
    return { error: 'generic' };
  }
  const parsed = z.object({ session_id: z.string() }).safeParse(data);
  if (!parsed.success) return { error: 'generic' };
  redirect(`/practice/${parsed.data.session_id}`);
}

const answerValue = z.union([
  z.string().max(64),
  z.record(z.string().max(32), z.string().max(64)).refine((r) => Object.keys(r).length <= 20),
]);

export interface PracticeReveal {
  isCorrect: boolean;
  parts: { a: boolean; b: boolean } | null;
  correctAnswer: unknown;
  /** Pro obunasiz va bepul chegaradan keyin: yechim yuborilmaydi */
  solutionMd: string | null;
  mistakeNoteMd: string | null;
  solutionLocked: boolean;
}

export type PracticeAnswerResult =
  | { ok: true; checked: false }
  | { ok: true; checked: true; reveal: PracticeReveal }
  | { ok: false; code: 'invalid' | 'closed' | 'locked' | 'auth' | 'error' };

/**
 * Javobni saqlaydi. check=true bo'lsa (practice/timed rejim) darrov tekshiradi va to'g'ri javob + yechimni qaytaradi.
 * Tekshirish serverda: kalitni faqat shu yerda (service_role) o'qiymiz va mijozga faqat tekshirilgandan keyin beramiz.
 */
export async function submitPracticeAnswerAction(input: unknown): Promise<PracticeAnswerResult> {
  const parsed = z.object({ sessionId: uuid, questionId: uuid, value: answerValue, check: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, code: 'invalid' };
  const { sessionId, questionId, value, check } = parsed.data;

  const supabase = await createClient();
  const saved = await supabase.rpc('save_practice_answer', { p_session: sessionId, p_question: questionId, p_value: value as Json });
  if (saved.error) {
    const m = saved.error.message;
    if (m.includes('already_answered')) return { ok: false, code: 'locked' };
    if (m.includes('practice_closed')) return { ok: false, code: 'closed' };
    if (m.includes('not_authenticated') || saved.error.code === '28000' || saved.error.code === '42501') return { ok: false, code: 'auth' };
    if (m.includes('practice_not_found')) return { ok: false, code: 'invalid' };
    return { ok: false, code: 'error' };
  }
  const mode = z.object({ mode: z.enum(['practice', 'timed', 'exam']) }).safeParse(saved.data);
  if (!mode.success) return { ok: false, code: 'error' };
  if (!check || !feedbackImmediately(mode.data.mode)) return { ok: true, checked: false };

  // Tekshirish: kalit faqat serverda
  const admin = createAdminClient();
  const q = await admin.from('questions').select('type, difficulty, question_keys(key_json)').eq('id', questionId).single();
  if (q.error || !q.data) return { ok: false, code: 'error' };
  const keyRow = Array.isArray(q.data.question_keys) ? q.data.question_keys[0] : q.data.question_keys;
  let grade;
  try {
    grade = gradePractice(q.data.type, q.data.difficulty, value, keyRow?.key_json);
  } catch {
    return { ok: false, code: 'error' };
  }
  const stored = await admin.rpc('store_practice_result', {
    p_session: sessionId,
    p_question: questionId,
    p_correct: grade.correct,
    p_parts: (grade.parts ?? undefined) as Json | undefined,
  });
  if (stored.error) return { ok: false, code: 'error' };

  // Ochilgan ma'lumotni foydalanuvchi tilida bazadan olamiz (yagona manba: get_practice_state)
  const { lang } = await getI18n();
  const st = await supabase.rpc('get_practice_state', { p_session: sessionId, p_lang: lang });
  const state = practiceStateSchema.safeParse(st.data);
  if (!state.success) return { ok: false, code: 'error' };
  const answer: PracticeAnswer | undefined = state.data.answers.find((a) => a.question_id === questionId);
  const position = state.data.items.find((i) => i.question_id === questionId)?.position ?? 1;
  const participant = await getParticipant();
  const solutionLocked = !participant?.isPro && position > FREE_PRACTICE_SOLUTIONS;

  return {
    ok: true,
    checked: true,
    reveal: {
      isCorrect: grade.correct,
      parts: grade.parts,
      correctAnswer: answer?.correct_answer ?? null,
      solutionMd: solutionLocked ? null : (answer?.solution_md ?? null),
      mistakeNoteMd: solutionLocked ? null : (answer?.mistake_note_md ?? null),
      solutionLocked,
    },
  };
}

export type FinishPracticeResult = { ok: true } | { ok: false; code: 'invalid' | 'error' };

/**
 * Mashqni yakunlaydi: tekshirilmagan javoblar (exam rejim yoki vaqt tugagan) serverda tekshiriladi, keyin sessiya yopiladi.
 */
export async function finishPracticeAction(sessionId: unknown): Promise<FinishPracticeResult> {
  const id = uuid.safeParse(sessionId);
  if (!id.success) return { ok: false, code: 'invalid' };

  const supabase = await createClient();
  // egalik tekshiruvi: boshqaning sessiyasi null qaytaradi
  const own = await supabase.rpc('get_practice_state', { p_session: id.data, p_lang: 'uz' });
  if (own.error || own.data === null) return { ok: false, code: 'invalid' };

  const admin = createAdminClient();
  const pending = await admin.rpc('list_ungraded_practice_answers', { p_session: id.data });
  const parsedRows = z.array(z.object({ question_id: z.string(), value: z.unknown() })).safeParse(pending.data ?? []);
  if (pending.error || !parsedRows.success) return { ok: false, code: 'error' };

  const rows = parsedRows.data;
  if (rows.length > 0) {
    const qs = await admin.from('questions').select('id, type, difficulty, question_keys(key_json)').in('id', rows.map((r) => r.question_id));
    if (qs.error) return { ok: false, code: 'error' };
    const byId = new Map((qs.data ?? []).map((q) => [q.id, q]));
    for (const r of rows) {
      const q = byId.get(r.question_id);
      if (!q) continue;
      const keyRow = Array.isArray(q.question_keys) ? q.question_keys[0] : q.question_keys;
      let grade;
      try {
        grade = gradePractice(q.type, q.difficulty, r.value, keyRow?.key_json);
      } catch {
        grade = { correct: false, parts: null };
      }
      const stored = await admin.rpc('store_practice_result', {
        p_session: id.data,
        p_question: r.question_id,
        p_correct: grade.correct,
        p_parts: (grade.parts ?? undefined) as Json | undefined,
      });
      if (stored.error) return { ok: false, code: 'error' };
    }
  }

  const fin = await supabase.rpc('finish_practice', { p_session: id.data });
  if (fin.error) return { ok: false, code: 'error' };
  return { ok: true };
}
