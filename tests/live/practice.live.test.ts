import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gradePractice } from '../../lib/practice/grade';
import { practiceStateSchema } from '../../lib/practice/state';
import type { Database, Json } from '../../lib/supabase/database.types';

// JONLI test: haqiqiy Supabase loyihasiga qarshi (pnpm test:live). Oddiy `pnpm test` da o'tkazib yuboriladi.
// Mashq rejimi: zaxira, tanlash, tekshirish, kalit ochilishi, yakunlash, saqlash, ruxsatlar. Yaratilgan foydalanuvchilar oxirida o'chiriladi
// (mashq seanslari va saqlanganlar foydalanuvchi bilan birga o'chadi; mashq savollari bazada qoladi).
const live = process.env.LIVE_E2E === '1';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const SECRET = process.env.SUPABASE_SECRET_KEY ?? '';

type Db = SupabaseClient<Database>;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

describe.runIf(live)('jonli mashq oqimi (real Supabase)', { timeout: 180_000 }, () => {
  const created: string[] = [];
  let admin: Db;

  async function makeStudent(): Promise<{ id: string; db: Db }> {
    const email = `g-${randomUUID()}@guest.invalid`;
    const password = randomBytes(24).toString('base64url');
    const c = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { live_test: true } });
    expect(c.error, 'createUser').toBeNull();
    const id = c.data.user!.id;
    created.push(id);
    const db: Db = createClient<Database>(URL, PUB, opts);
    expect((await db.auth.signInWithPassword({ email, password })).error, 'signIn').toBeNull();
    const upd = await db.from('profiles').update({ name: 'Jonli Mashq', phone: '+998901234567', grade: '11', consent_at: new Date().toISOString() }).eq('id', id);
    expect(upd.error, 'profil').toBeNull();
    return { id, db };
  }

  const stateOf = async (db: Db, session: string) => {
    const r = await db.rpc('get_practice_state', { p_session: session, p_lang: 'ru' });
    expect(r.error).toBeNull();
    return r.data === null ? null : practiceStateSchema.parse(r.data);
  };

  /** Server amali qiladigan ish: kalitni service_role bilan o'qib, tekshiradi va natijani yozadi. */
  async function gradeAndStore(session: string, questionId: string, value: unknown) {
    const q = await admin.from('questions').select('type, difficulty, question_keys(key_json)').eq('id', questionId).single();
    expect(q.error).toBeNull();
    const keyRow = Array.isArray(q.data!.question_keys) ? q.data!.question_keys[0] : q.data!.question_keys;
    const g = gradePractice(q.data!.type, q.data!.difficulty, value, keyRow?.key_json);
    const st = await admin.rpc('store_practice_result', { p_session: session, p_question: questionId, p_correct: g.correct, p_parts: (g.parts ?? undefined) as Json | undefined });
    expect(st.error).toBeNull();
    return { grade: g, key: keyRow?.key_json as { correct?: string } };
  }

  beforeAll(() => {
    expect(URL && PUB && SECRET, ".env / .env.local to'ldirilmagan").toBeTruthy();
    admin = createClient<Database>(URL, SECRET, opts);
  });

  afterAll(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id);
  });

  it("mashq zaxirasi: statistika bor; talaba savollar/kalitlar jadvaliga kira olmaydi; mockka kirmagan", async () => {
    const { db } = await makeStudent();
    const stats = await db.rpc('get_practice_pool_stats');
    expect(stats.error).toBeNull();
    const rows = stats.data as { block_id: number; difficulty: string; n: number }[];
    expect(rows.reduce((a, r) => a + r.n, 0)).toBeGreaterThanOrEqual(1700);
    expect(rows.some((r) => r.block_id === 6)).toBe(true); // geometriya

    expect((await db.from('questions').select('id')).data).toEqual([]);
    expect((await db.from('question_keys').select('question_id')).data).toEqual([]);
    for (const t of ['practice_sessions', 'practice_items', 'practice_answers', 'saved_questions'] as const) {
      const r = await db.from(t as never).select('*');
      expect(r.error?.code, t).toBe('42501');
    }

    // mashq savollari hech bir mock tarkibida yo'q
    const items = await admin.from('exam_items').select('question_id, questions!inner(pool)').eq('questions.pool', 'practice');
    expect(items.error).toBeNull();
    expect(items.data).toEqual([]);

    const anon = createClient<Database>(URL, PUB, opts);
    expect((await anon.rpc('start_practice', { p_block: 'geometriya', p_difficulty: null as unknown as string, p_mode: 'practice', p_count: 5 })).error?.code).toBe('42501');
    expect((await anon.rpc('get_practice_pool_stats')).error?.code).toBe('42501');
  });

  it("oddiy mashq: boshlash -> savollarda kalit yo'q -> javob -> tekshirish -> kalit va yechim ochiladi -> qulf", async () => {
    const { db } = await makeStudent();
    const start = await db.rpc('start_practice', { p_block: 'geometriya', p_difficulty: null as unknown as string, p_mode: 'practice', p_count: 5 });
    expect(start.error).toBeNull();
    const s = start.data as { session_id: string; question_count: number; deadline_at: string | null };
    expect(s.question_count).toBe(5);
    expect(s.deadline_at).toBeNull();

    const st0 = (await stateOf(db, s.session_id))!;
    expect(st0.items).toHaveLength(5);
    expect(JSON.stringify(st0.items)).not.toMatch(/correct|solution/); // kalit/yechim savollarda yo'q
    expect(st0.answers).toEqual([]);

    // y1 savolini topamiz va to'g'ri javob beramiz
    const y1 = st0.items.find((i) => i.type === 'y1')!;
    expect(y1, 'geometriyada y1 savol bor').toBeTruthy();
    const keyRow = (await admin.from('question_keys').select('key_json').eq('question_id', y1.question_id).single()).data!;
    const correct = (keyRow.key_json as { correct: string }).correct;

    expect((await db.rpc('save_practice_answer', { p_session: s.session_id, p_question: y1.question_id, p_value: correct })).error).toBeNull();
    const mid = (await stateOf(db, s.session_id))!;
    expect(mid.answers[0]).toMatchObject({ question_id: y1.question_id, value: correct });
    expect('correct_answer' in mid.answers[0]!).toBe(false); // tekshirilmaguncha ochilmaydi

    const { grade } = await gradeAndStore(s.session_id, y1.question_id, correct);
    expect(grade.correct).toBe(true);
    const after = (await stateOf(db, s.session_id))!;
    expect(after.answers[0]).toMatchObject({ is_correct: true, correct_answer: { correct } });
    expect(after.answers[0]!.solution_md).toBeTruthy();

    // tekshirilgan javobni o'zgartirib bo'lmaydi
    const again = await db.rpc('save_practice_answer', { p_session: s.session_id, p_question: y1.question_id, p_value: 'A' });
    expect(again.error?.message).toContain('already_answered');

    // ruxsatlar: talaba tekshiruv natijasini yoza olmaydi, tekshirilmagan javoblar ro'yxatini ham o'qiy olmaydi
    expect((await db.rpc('store_practice_result', { p_session: s.session_id, p_question: y1.question_id, p_correct: false })).error?.code).toBe('42501');
    expect((await db.rpc('list_ungraded_practice_answers', { p_session: s.session_id })).error?.code).toBe('42501');

    // yakunlash
    const fin = await db.rpc('finish_practice', { p_session: s.session_id });
    expect(fin.error).toBeNull();
    expect(fin.data).toMatchObject({ status: 'submitted', correct_count: 1, question_count: 5, answered: 1 });
    const closed = await db.rpc('save_practice_answer', { p_session: s.session_id, p_question: y1.question_id, p_value: 'B' });
    expect(closed.error?.message).toMatch(/practice_closed|already_answered/);

    // ro'yxatda ko'rinadi
    const list = (await db.rpc('list_my_practice', { p_limit: 5 })).data as { id: string; status: string; correct_count: number }[];
    expect(list[0]).toMatchObject({ id: s.session_id, status: 'submitted', correct_count: 1 });

    // tugagan mashqdagi savolni saqlash mumkin
    const toggle = await db.rpc('toggle_saved_question', { p_question_id: y1.question_id });
    expect(toggle.error).toBeNull();
    expect(toggle.data).toBe(true);
    const saved = (await db.rpc('get_my_saved', { p_lang: 'uz' })).data as { question_id: string; last_value: unknown; last_correct: boolean }[];
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ question_id: y1.question_id, last_value: correct, last_correct: true });
    expect(((await db.rpc('get_my_saved_ids')).data as string[])).toEqual([y1.question_id]);
  });

  it("imtihon rejimi: taymer bor, tugaguncha hech narsa ochilmaydi, yakunlagach hammasi; boshqa foydalanuvchi ko'rmaydi", async () => {
    const { db } = await makeStudent();
    const other = await makeStudent();
    const start = await db.rpc('start_practice', { p_block: 'tenglama', p_difficulty: 'L2', p_mode: 'exam', p_count: 3 });
    expect(start.error).toBeNull();
    const s = start.data as { session_id: string; question_count: number; deadline_at: string | null };
    expect(s.question_count).toBe(3);
    expect(s.deadline_at).not.toBeNull();

    const st = (await stateOf(db, s.session_id))!;
    const [q1, q2] = st.items;
    // yopiq savol bo'lmasligi mumkin (tenglama L2 y1 va o): turiga mos qiymat beramiz
    const val = (type: string) => (type === 'y1' ? 'A' : { a: '1', b: '2' });
    await db.rpc('save_practice_answer', { p_session: s.session_id, p_question: q1!.question_id, p_value: val(q1!.type) as Json });
    await db.rpc('save_practice_answer', { p_session: s.session_id, p_question: q2!.question_id, p_value: val(q2!.type) as Json });
    await db.rpc('save_practice_answer', { p_session: s.session_id, p_question: q1!.question_id, p_value: val(q1!.type) as Json }); // exam rejimda o'zgartirish mumkin
    const mid = (await stateOf(db, s.session_id))!;
    expect(mid.answers).toHaveLength(2);
    expect(mid.answers.every((a) => !('correct_answer' in a) && !('solution_md' in a))).toBe(true);

    // boshqa foydalanuvchi: holat null, saqlay/yakunlay olmaydi
    expect(await stateOf(other.db, s.session_id)).toBeNull();
    expect((await other.db.rpc('save_practice_answer', { p_session: s.session_id, p_question: q1!.question_id, p_value: 'A' })).error).not.toBeNull();
    expect((await other.db.rpc('finish_practice', { p_session: s.session_id })).error).not.toBeNull();

    // server yakunlashdan oldin tekshiradi (finishPracticeAction mantig'i)
    const pending = (await admin.rpc('list_ungraded_practice_answers', { p_session: s.session_id })).data as { question_id: string; value: unknown }[];
    expect(pending).toHaveLength(2);
    for (const p of pending) await gradeAndStore(s.session_id, p.question_id, p.value);

    const fin = await db.rpc('finish_practice', { p_session: s.session_id });
    expect(fin.error).toBeNull();
    expect(fin.data).toMatchObject({ status: 'submitted', question_count: 3, answered: 2 });
    const done = (await stateOf(db, s.session_id))!;
    expect(done.session.status).toBe('submitted');
    expect(done.answers.every((a) => a.is_correct !== undefined && a.is_correct !== null && a.correct_answer !== undefined)).toBe(true);
  });

  it("xato kirishlar: noma'lum bo'lim/rejim, soni; savoli yo'q bo'lim; saqlash tugamagan mashqdan mumkin emas", async () => {
    const { db } = await makeStudent();
    const start = (b: string, m: string, n: number, d: string | null = null) => db.rpc('start_practice', { p_block: b, p_difficulty: d as string, p_mode: m, p_count: n });
    expect((await start('yoq-blok', 'practice', 5)).error?.message).toContain('practice_invalid');
    expect((await start('geometriya', 'boshqa', 5)).error?.message).toContain('practice_invalid');
    expect((await start('geometriya', 'practice', 31)).error?.message).toContain('practice_invalid');
    expect((await start('sonlar', 'practice', 5, 'L3')).error?.message).toContain('no_questions'); // sonlar faqat L1

    const ok = (await start('sonlar', 'practice', 5)).data as { session_id: string };
    const q = (await stateOf(db, ok.session_id))!.items[0]!;
    await db.rpc('save_practice_answer', { p_session: ok.session_id, p_question: q.question_id, p_value: 'A' });
    expect((await db.rpc('toggle_saved_question', { p_question_id: q.question_id })).error?.message).toContain('question_not_available');
  });
});
