import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mathFormatV1 } from '../../config/exam-format.math-v1';
import { finalizeAttempt } from '../../lib/exam/finalize';
import { attemptStateSchema, parseItems } from '../../lib/exam/attempt-state';
import { parseKey } from '../../lib/exam/schemas';
import { scoreAttempt, scoreItem, type AnswerValue } from '../../lib/exam/scoring';
import { levelFor } from '../../lib/exam/levels';
import { createSupabaseExamStore } from '../../lib/exam/supabase-store';
import type { Database } from '../../lib/supabase/database.types';

// JONLI test: haqiqiy Supabase loyihasiga qarshi (pnpm test:live). Oddiy `pnpm test` da o'tkazib yuboriladi.
// Test o'zi yaratgan foydalanuvchilarni (va ularning attempt/javoblarini) oxirida o'chiradi.
const live = process.env.LIVE_E2E === '1';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const SECRET = process.env.SUPABASE_SECRET_KEY ?? '';

type Db = SupabaseClient<Database>;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

// Bazaga tarmoq kechikishi uchun (loyiha Sidneyda) vaqt limiti katta.
describe.runIf(live)('jonli oqim (real Supabase)', { timeout: 120_000 }, () => {
  const created: string[] = [];
  let admin: Db;

  async function makeUser(kind: 'guest' | 'admin' | 'editor'): Promise<{ id: string; db: Db }> {
    const email = kind === 'guest' ? `g-${randomUUID()}@guest.invalid` : `live-${randomUUID().slice(0, 8)}@example.com`;
    const password = randomBytes(24).toString('base64url');
    const c = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { live_test: true } });
    expect(c.error, `createUser(${kind})`).toBeNull();
    const id = c.data.user!.id;
    created.push(id);
    const db: Db = createClient<Database>(URL, PUB, opts);
    const s = await db.auth.signInWithPassword({ email, password });
    expect(s.error, `signIn(${kind})`).toBeNull();
    if (kind !== 'guest') await admin.from('profiles').update({ role: kind }).eq('id', id);
    return { id, db };
  }

  beforeAll(() => {
    expect(URL && PUB && SECRET, '.env / .env.local to\'ldirilmagan').toBeTruthy();
    admin = createClient<Database>(URL, SECRET, opts);
  });

  afterAll(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id);
  });

  it('mehmon hisob (@guest.invalid) yaratiladi, sessiya beriladi va profil trigger bilan paydo bo\'ladi', async () => {
    const { id, db } = await makeUser('guest');
    const { data } = await db.from('profiles').select('name, role, consent_at').eq('id', id).single();
    expect(data).toMatchObject({ name: '', role: 'student', consent_at: null });
  });

  it('A varianti ochiq; boshqalari talabaga ko\'rinmaydi; kalit va savollar jadvali yopiq', async () => {
    const { db } = await makeUser('guest');
    const { data: exams } = await db.from('exams').select('code, status');
    expect(exams?.map((e) => e.code)).toEqual(['A']);
    expect(exams?.[0]?.status).toBe('published');

    expect((await db.from('question_keys').select('question_id')).data).toEqual([]);
    expect((await db.from('questions').select('id')).data).toEqual([]);
    const anon = createClient<Database>(URL, PUB, opts);
    expect((await anon.from('exams').select('id')).error?.code).toBe('42501');
    expect((await anon.rpc('start_attempt', { p_exam_id: randomUUID() })).error?.code).toBe('42501');
  });

  it('to\'liq imtihon: profil -> start -> 45 savol (4 til) -> javoblar -> ball -> natija, xatolar daftari', async () => {
    const { id: userId, db } = await makeUser('guest');
    const other = await makeUser('guest');

    // profil to'liq bo'lmasa boshlanmaydi
    const examRow = (await db.from('exams').select('id').eq('code', 'A').single()).data!;
    const early = await db.rpc('start_attempt', { p_exam_id: examRow.id });
    expect(early.error?.message).toContain('profile_incomplete');

    const upd = await db
      .from('profiles')
      .update({ name: 'Live Test', phone: '+998901112233', grade: '11', consent_at: new Date().toISOString(), lang: 'ru' })
      .eq('id', userId)
      .select('id')
      .single();
    expect(upd.error).toBeNull();
    expect((await db.from('profiles').update({ role: 'admin' }).eq('id', userId)).error).not.toBeNull(); // rolni o'zgartirib bo'lmaydi

    const start = await db.rpc('start_attempt', { p_exam_id: examRow.id });
    expect(start.error).toBeNull();
    const attemptId = (start.data as { attempt_id: string; deadline_at: string; started_at: string }).attempt_id;
    const again = await db.rpc('start_attempt', { p_exam_id: examRow.id });
    expect((again.data as { attempt_id: string }).attempt_id).toBe(attemptId);
    const sd = start.data as { deadline_at: string; started_at: string };
    expect(Date.parse(sd.deadline_at) - Date.parse(sd.started_at)).toBe(150 * 60 * 1000);

    // 4 tilda savollar: hammasi payload sxemasidan o'tadi, kalit yo'q
    const stateByLang = new Map<string, ReturnType<typeof attemptStateSchema.parse>>();
    for (const lang of ['uz', 'ru', 'kaa', 'en']) {
      const r = await db.rpc('get_attempt_state', { p_attempt_id: attemptId, p_lang: lang });
      expect(r.error, lang).toBeNull();
      const state = attemptStateSchema.parse(r.data);
      stateByLang.set(lang, state);
      expect(state.items).toHaveLength(45);
      expect(() => parseItems(state.items), `${lang}: payload`).not.toThrow();
      expect(JSON.stringify(state)).not.toContain('correct_answer');
      expect(state.items.map((i) => i.position)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    }
    const uz = stateByLang.get('uz')!;
    const ru = stateByLang.get('ru')!;
    expect(ru.items.filter((it, i) => it.stem_md !== uz.items[i]!.stem_md).length).toBeGreaterThan(40); // tarjima ishlaydi
    expect(uz.items.slice(0, 32).every((i) => i.type === 'y1')).toBe(true);
    expect(uz.items.slice(32, 35).every((i) => i.type === 'y2')).toBe(true);
    expect(uz.items.slice(35).every((i) => i.type === 'o')).toBe(true);

    // boshqa foydalanuvchi bu attempt'ni o'qiy olmaydi va yoza olmaydi
    expect((await other.db.rpc('get_attempt_state', { p_attempt_id: attemptId })).error?.message).toContain('attempt_not_found');
    expect((await other.db.from('attempts').select('id')).data).toEqual([]);

    // javoblar: kalitni faqat admin o'qiydi; birinchi 20 ta y1 + 3 ta y2 + 5 ta o to'g'ri, 1-savolga xato
    const keys = await admin.from('question_keys').select('question_id, key_json').in('question_id', uz.items.map((i) => i.question_id));
    const keyOf = new Map((keys.data ?? []).map((k) => [k.question_id, k.key_json]));
    const answers = new Map<string, AnswerValue>();
    uz.items.forEach((it) => {
      const k = keyOf.get(it.question_id) as Record<string, unknown>;
      if (it.position === 1) answers.set(it.question_id, 'A' === (k.correct as string) ? 'B' : 'A'); // ataylab xato
      else if (it.type === 'y1' && it.position <= 20) answers.set(it.question_id, k.correct as string);
      else if (it.type === 'y2') answers.set(it.question_id, k.pairs as Record<string, string>);
      else if (it.type === 'o' && it.position <= 40) {
        const o = k as { a?: string[]; b?: string[] };
        answers.set(it.question_id, { ...(o.a ? { a: o.a[0]! } : {}), ...(o.b ? { b: o.b[0]! } : {}) });
      }
    });
    for (const [questionId, value] of answers) {
      const r = await db.rpc('save_answer', { p_attempt_id: attemptId, p_question_id: questionId, p_value: value as never, p_time_spent: 5 });
      expect(r.error, `save ${questionId}`).toBeNull();
    }
    expect((await other.db.rpc('save_answer', { p_attempt_id: attemptId, p_question_id: uz.items[0]!.question_id, p_value: 'A' })).error?.message).toContain('attempt_not_found');
    await db.rpc('log_tab_switch', { p_attempt_id: attemptId });

    // ball: server adapteri va finalize; mustaqil hisob bilan solishtiriladi
    const store = createSupabaseExamStore(admin);
    const outcome = await finalizeAttempt(store, attemptId, { onlyIfExpired: false });
    expect(outcome.status).toBe('submitted');

    const cfg = mathFormatV1.scoring;
    const expected = scoreAttempt(
      uz.items.map((it) => {
        const key = parseKey(it.type, keyOf.get(it.question_id));
        return scoreItem({ questionId: it.question_id, type: it.type, difficulty: it.difficulty }, answers.get(it.question_id), key, cfg);
      }),
      cfg,
    );

    const done = attemptStateSchema.parse((await db.rpc('get_attempt_state', { p_attempt_id: attemptId, p_lang: 'ru' })).data);
    expect(done.attempt).toMatchObject({ status: 'submitted', submit_reason: 'user', is_estimate: true });
    expect(done.attempt.raw_score).toBe(expected.raw);
    expect(done.attempt.max_raw).toBe(expected.maxRaw);
    expect(done.attempt.scaled_score).toBe(expected.scaled);
    expect(done.attempt.level).toBe(levelFor(expected.scaled, cfg.levels));
    expect(done.items.every((i) => i.correct_answer !== undefined && i.solution_md)).toBe(true);
    expect(done.answers.find((a) => a.question_id === uz.items[0]!.question_id)?.is_correct).toBe(false);

    // topshirilgandan keyin yozib bo'lmaydi; ikkinchi finalize idempotent
    expect((await db.rpc('save_answer', { p_attempt_id: attemptId, p_question_id: uz.items[1]!.question_id, p_value: 'C' })).error?.message).toContain('attempt_closed');
    expect((await finalizeAttempt(store, attemptId, { onlyIfExpired: false })).status).toBe('submitted');

    // xatolar daftari (ru tilida) va mavzu statistikasi
    const mistakes = (await db.rpc('get_my_mistakes', { p_lang: 'ru' })).data as { question_id: string; solution_md: string | null; correct_answer: unknown }[];
    expect(mistakes.length).toBe(45 - (expected.raw > 0 ? done.answers.filter((a) => a.is_correct).length : 0));
    expect(mistakes[0]).toHaveProperty('correct_answer');
    const stats = (await db.rpc('get_my_topic_stats')).data as { total: number; correct: number }[];
    expect(stats.reduce((s, r) => s + r.total, 0)).toBe(45);

    // admin ko'rinishi
    const adminUser = await makeUser('admin');
    const ov = (await adminUser.db.rpc('admin_overview')).data as { attempts_submitted: number; exams: { code: string; submitted: number }[] };
    expect(ov.attempts_submitted).toBeGreaterThanOrEqual(1);
    expect(ov.exams.find((e) => e.code === 'A')?.submitted).toBeGreaterThanOrEqual(1);
    const rows = (await adminUser.db.rpc('admin_attempts', { p_limit: 5, p_offset: 0, p_exam: examRow.id })).data as { rows: { name: string; tab_switches: number; user_id: string }[] };
    expect(rows.rows.find((r) => r.user_id === userId)).toMatchObject({ name: 'Live Test', tab_switches: 1 });

    // talaba admin funksiyalariga kira olmaydi; editor nashr qila olmaydi (faqat ko'radi)
    expect((await db.rpc('admin_overview')).error?.message).toContain('forbidden');
    expect((await db.rpc('admin_participants', {})).error?.message).toContain('forbidden');
    expect((await db.rpc('import_questions', { p_questions: [] })).error?.code).toBe('42501');
    expect((await db.rpc('publish_exam', { p_exam_id: examRow.id })).error?.message).toContain('forbidden');
    const editor = await makeUser('editor');
    expect((await editor.db.rpc('admin_overview')).error).toBeNull();
    expect((await editor.db.from('question_keys').select('question_id').limit(1)).data).toHaveLength(1);
  }, 180_000);

  it('rate limit va audit faqat server uchun', async () => {
    const { db } = await makeUser('guest');
    expect((await db.rpc('rate_limit_hit', { p_key: 'x', p_limit: 1, p_window_sec: 60 })).error?.code).toBe('42501');
    const key = `live:${randomUUID()}`;
    const hit = async () => (await admin.rpc('rate_limit_hit', { p_key: key, p_limit: 2, p_window_sec: 60 })).data;
    expect([await hit(), await hit(), await hit()]).toEqual([true, true, false]);
    await admin.from('rate_limits').delete().eq('key', key);
    expect((await db.from('audit_log').select('id')).data).toEqual([]);
  });

  it('import_questions: noto\'g\'ri blok bilan chaqirilsa hech narsa yozilmaydi', async () => {
    const ext = `live-${randomUUID()}`;
    const bad = { external_id: ext, type: 'y1', block: 'yoq', topic: 3, difficulty: 'L1', stem_md: 'x', payload: { options: { A: '1', B: '2', C: '3', D: '4' } }, key: { correct: 'A' } };
    const r = await admin.rpc('import_questions', { p_questions: [bad] as never });
    expect(r.error?.message).toContain('noma\'lum blok');
    expect((await admin.from('questions').select('id').eq('external_id', ext)).data).toEqual([]);
  });
});
