import 'server-only';
import { createAdminClient } from '../supabase/admin';
import { getLang } from '../i18n/server';
import { createClient } from '../supabase/server';
import { attemptStateSchema, type AttemptState } from './attempt-state';
import { finalizeAttempt, type FinalizeOutcome } from './finalize';
import { createSupabaseExamStore } from './supabase-store';

/** Joriy foydalanuvchining attempt holati (RLS/RPC egalikni tekshiradi); topilmasa null. */
export async function loadAttemptState(attemptId: string): Promise<AttemptState | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_attempt_state', { p_attempt_id: attemptId, p_lang: await getLang() });
  if (error) {
    if (error.message.includes('attempt_not_found')) return null;
    throw new Error(`get_attempt_state: ${error.message}`);
  }
  return attemptStateSchema.parse(data);
}

/**
 * Attempt'ni yopadi va ballaydi (service_role). Avval foydalanuvchi ko'ra olishi (RLS) tekshiriladi;
 * attempt topilmasa yoki ko'rinmasa null qaytadi.
 */
export async function finalizeOwnAttempt(
  attemptId: string,
  opts: { onlyIfExpired: boolean },
): Promise<FinalizeOutcome | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('attempts').select('id').eq('id', attemptId).maybeSingle();
  if (error) throw new Error(`attempts: ${error.message}`);
  if (!data) return null;
  return finalizeAttempt(createSupabaseExamStore(createAdminClient()), attemptId, opts);
}

export type FinalState =
  | { kind: 'missing' }
  | { kind: 'running'; state: AttemptState }
  | { kind: 'pending'; state: AttemptState }
  | { kind: 'ready'; state: AttemptState };

const expired = (s: AttemptState) => Date.parse(s.attempt.deadline_at) <= Date.parse(s.server_now);

/**
 * Attempt holatini yakuniga yetkazadi: muddat o'tgan bo'lsa yopadi, yopilgan lekin ballsiz bo'lsa ballaydi.
 * running = hali davom etmoqda (imtihon ekrani), ready = natija tayyor, pending = ball hisoblanmadi (xato).
 */
export async function resolveAttempt(attemptId: string): Promise<FinalState> {
  let state = await loadAttemptState(attemptId);
  if (!state) return { kind: 'missing' };

  if (state.attempt.status === 'in_progress') {
    if (!expired(state)) return { kind: 'running', state };
    await finalizeOwnAttempt(attemptId, { onlyIfExpired: true });
    state = await loadAttemptState(attemptId);
    if (!state) return { kind: 'missing' };
    if (state.attempt.status === 'in_progress') return { kind: 'running', state };
  }

  if (state.attempt.raw_score === null) {
    await finalizeOwnAttempt(attemptId, { onlyIfExpired: false });
    state = await loadAttemptState(attemptId);
    if (!state) return { kind: 'missing' };
  }
  return state.attempt.raw_score === null ? { kind: 'pending', state } : { kind: 'ready', state };
}
