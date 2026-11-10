import type { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { as, buildExam, createDb, newUser } from './helpers';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
}, 60_000);

const one = async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> => (await db.query<T>(sql, params)).rows[0]!;

// "geometriya" bo'limiga n ta mashq savoli yuklaydi (service_role); y1, hammasida to'g'ri javob B
async function seedPool(n: number, opts: { block?: string; difficulty?: string; topic?: number } = {}): Promise<string[]> {
  const { block = 'geometriya', difficulty = 'L2', topic = 79 } = opts;
  const qs = Array.from({ length: n }, (_, i) => ({
    external_id: `pool-${randomUUID()}`,
    type: 'y1',
    block,
    topic,
    difficulty,
    pool: 'practice',
    stem_md: `Mashq savoli ${i}`,
    payload: { options: { A: '1', B: '2', C: '3', D: '4' } },
    key: { correct: 'B' },
    solution_md: `Yechim ${i}`,
    i18n: { ru: { stem_md: `Вопрос ${i}`, payload: { options: { A: '1', B: '2', C: '3', D: '4' } }, solution_md: `Решение ${i}` } },
  }));
  const r = await as(db, 'service_role', null, () => one<{ r: { question_ids: string[] } }>('select public.import_questions($1::jsonb) as r', [JSON.stringify(qs)]));
  return r.r.question_ids;
}

const start = (user: string, block: string, difficulty: string | null, mode: string, count: number) =>
  as(db, 'authenticated', user, () =>
    one<{ r: { session_id: string; question_count: number; deadline_at: string | null; mode: string } }>('select public.start_practice($1, $2, $3, $4) as r', [block, difficulty, mode, count]),
  ).then((x) => x.r);

const state = (user: string, session: string, lang = 'uz') =>
  as(db, 'authenticated', user, () =>
    one<{ s: { session: Record<string, unknown>; items: Record<string, unknown>[]; answers: Record<string, unknown>[] } | null }>('select public.get_practice_state($1, $2) as s', [session, lang]),
  ).then((x) => x.s);

const save = (user: string, session: string, question: string, value: unknown) =>
  as(db, 'authenticated', user, () => db.query('select public.save_practice_answer($1, $2, $3::jsonb)', [session, question, JSON.stringify(value)]));

const store = (session: string, question: string, correct: boolean, parts: unknown = null) =>
  as(db, 'service_role', null, () => db.query('select public.store_practice_result($1, $2, $3, $4::jsonb)', [session, question, correct, parts === null ? null : JSON.stringify(parts)]));

describe('start_practice', () => {
  it("faqat mashq zaxirasidan, tanlangan bo'lim va qiyinlikdagi savollarni tanlaydi; mock savollari kirmaydi", async () => {
    await seedPool(6, { block: 'geometriya', difficulty: 'L2' });
    await seedPool(4, { block: 'geometriya', difficulty: 'L3' });
    await seedPool(5, { block: 'sonlar', difficulty: 'L1', topic: 3 });
    const { questionIds: mockIds } = await buildExam(db, { publish: true }); // mock savollari (pool = exam)
    const user = await newUser(db);

    const a = await start(user, 'geometriya', 'L3', 'practice', 10);
    expect(a.question_count).toBe(4); // L3 da faqat 4 ta bor
    const st = await state(user, a.session_id);
    const ids = st!.items.map((i) => i.question_id as string);
    expect(ids).toHaveLength(4);
    const pools = (await db.query<{ pool: string; difficulty: string; block: string }>(
      'select q.pool, q.difficulty::text as difficulty, b.code as block from public.questions q join public.blocks b on b.id = q.block_id where q.id = any($1)', [ids])).rows;
    expect(pools.every((p) => p.pool === 'practice' && p.difficulty === 'L3' && p.block === 'geometriya')).toBe(true);
    expect(ids.some((id) => mockIds.includes(id))).toBe(false);

    const b = await start(user, 'geometriya', null, 'practice', 7);
    expect(b.question_count).toBe(7); // qiyinlik "barchasi": L2 + L3 dan
  });

  it('xato kirishlar: rejim, soni, bo\'lim, savol yo\'qligi; profil to\'liq bo\'lmasa', async () => {
    const user = await newUser(db);
    const bad = (block: string, mode: string, count: number) =>
      as(db, 'authenticated', user, () => db.query('select public.start_practice($1, null, $2, $3)', [block, mode, count]));
    await expect(bad('geometriya', 'boshqa', 5)).rejects.toThrow(/practice_invalid/);
    await expect(bad('geometriya', 'practice', 0)).rejects.toThrow(/practice_invalid/);
    await expect(bad('geometriya', 'practice', 31)).rejects.toThrow(/practice_invalid/);
    await expect(bad('yoq-blok', 'practice', 5)).rejects.toThrow(/noma'lum bo'lim/);
    await expect(bad('funksiyalar', 'practice', 5)).rejects.toThrow(/no_questions/); // bu bo'limda mashq savoli yo'q
    const incomplete = await newUser(db, 'student', { complete: false });
    await expect(as(db, 'authenticated', incomplete, () => db.query(`select public.start_practice('geometriya', null, 'practice', 5)`))).rejects.toThrow(/profile_incomplete/);
  });

  it("avval ko'rilmagan savollarga ustunlik beradi va faol mashqlar soni 5 ta bilan cheklangan", async () => {
    await seedPool(8, { block: 'tenglama', difficulty: 'L2', topic: 14 });
    const user = await newUser(db);
    const first = await start(user, 'tenglama', null, 'practice', 3);
    const firstIds = (await state(user, first.session_id))!.items.map((i) => i.question_id as string);
    for (const q of firstIds) {
      await save(user, first.session_id, q, 'B');
      await store(first.session_id, q, true);
    }
    const second = await start(user, 'tenglama', null, 'practice', 5);
    const secondIds = (await state(user, second.session_id))!.items.map((i) => i.question_id as string);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false); // 8 ta bor: 3 ta ko'rilgan, 5 ta yangi
    for (let i = 0; i < 3; i++) await start(user, 'tenglama', null, 'practice', 2); // jami 5 ta faol
    await expect(start(user, 'tenglama', null, 'practice', 2)).rejects.toThrow(/too_many_active/);
  });

  it("taymersiz rejimda muddat yo'q, taymerli rejimlarda savol boshiga 3 daqiqa", async () => {
    await seedPool(4, { block: 'analiz', difficulty: 'L2', topic: 25 });
    const user = await newUser(db);
    expect((await start(user, 'analiz', null, 'practice', 4)).deadline_at).toBeNull();
    const t = await start(user, 'analiz', null, 'timed', 4);
    const ex = await start(user, 'analiz', null, 'exam', 2);
    const secs = async (id: string) => (await one<{ s: number }>('select extract(epoch from deadline_at - started_at)::int as s from public.practice_sessions where id = $1', [id])).s;
    expect(await secs(t.session_id)).toBe(4 * 180);
    expect(await secs(ex.session_id)).toBe(2 * 180);
  });
});

describe('get_practice_state: kalit va yechim ochilishi', () => {
  it("practice rejimda faqat tekshirilgan savol uchun kalit/yechim ochiladi; ru tilida matn", async () => {
    await seedPool(3, { block: 'toplam', difficulty: 'L2', topic: 31 });
    const user = await newUser(db);
    const s = await start(user, 'toplam', null, 'practice', 3);
    let st = (await state(user, s.session_id, 'ru'))!;
    expect(st.items).toHaveLength(3);
    expect(st.items[0]!.stem_md).toMatch(/^Вопрос/);
    expect(JSON.stringify(st.items)).not.toMatch(/correct|Решение|Yechim/); // savollarda kalit yo'q
    expect(st.answers).toEqual([]);

    const q0 = st.items[0]!.question_id as string;
    await save(user, s.session_id, q0, 'B');
    st = (await state(user, s.session_id))!;
    expect(st.answers[0]).toEqual({ question_id: q0, value: 'B' }); // saqlangan, lekin hali tekshirilmagan: yechim ochilmaydi

    await store(s.session_id, q0, true);
    st = (await state(user, s.session_id))!;
    expect(st.answers[0]).toMatchObject({ question_id: q0, value: 'B', is_correct: true, correct_answer: { correct: 'B' } });
    expect(String(st.answers[0]!.solution_md)).toMatch(/^Yechim/);

    // tekshirilgan javobni o'zgartirib bo'lmaydi
    await expect(save(user, s.session_id, q0, 'A')).rejects.toThrow(/already_answered/);
  });

  it("exam rejimda mashq tugamaguncha hech narsa ochilmaydi; tugagach hammasi ochiladi, yakunlash hisoblaydi", async () => {
    await seedPool(4, { block: 'funksiyalar', difficulty: 'L3', topic: 20 });
    const user = await newUser(db);
    const s = await start(user, 'funksiyalar', null, 'exam', 4);
    const items = (await state(user, s.session_id))!.items.map((i) => i.question_id as string);

    await save(user, s.session_id, items[0]!, 'B');
    await save(user, s.session_id, items[1]!, 'A');
    await save(user, s.session_id, items[0]!, 'B'); // exam rejimda o'zgartirish mumkin
    await store(s.session_id, items[0]!, true);
    let st = (await state(user, s.session_id))!;
    expect(st.answers.every((a) => !('correct_answer' in a) && !('is_correct' in a))).toBe(true); // natija bor, lekin ochilmaydi

    await store(s.session_id, items[1]!, false);
    const fin = await as(db, 'authenticated', user, () => one<{ f: { status: string; correct_count: number; question_count: number; answered: number } }>('select public.finish_practice($1) as f', [s.session_id]));
    expect(fin.f).toEqual({ status: 'submitted', correct_count: 1, question_count: 4, answered: 2 });

    st = (await state(user, s.session_id))!;
    expect(st.answers.find((a) => a.question_id === items[0])).toMatchObject({ is_correct: true, correct_answer: { correct: 'B' } });
    expect(st.answers.find((a) => a.question_id === items[1])).toMatchObject({ is_correct: false });

    // tugagach javob saqlab bo'lmaydi; qayta yakunlash xavfsiz
    await expect(save(user, s.session_id, items[2]!, 'B')).rejects.toThrow(/practice_closed/);
    const again = await as(db, 'authenticated', user, () => one<{ f: { correct_count: number } }>('select public.finish_practice($1) as f', [s.session_id]));
    expect(again.f.correct_count).toBe(1);
  });

  it("boshqa foydalanuvchi sessiyani ko'rmaydi, javob saqlay va yakunlay olmaydi", async () => {
    await seedPool(2, { block: 'analiz', difficulty: 'L2', topic: 25 });
    const owner = await newUser(db);
    const other = await newUser(db);
    const s = await start(owner, 'analiz', null, 'practice', 2);
    const q = (await state(owner, s.session_id))!.items[0]!.question_id as string;
    expect(await state(other, s.session_id)).toBeNull();
    await expect(save(other, s.session_id, q, 'B')).rejects.toThrow(/practice_not_found/);
    await expect(as(db, 'authenticated', other, () => db.query('select public.finish_practice($1)', [s.session_id]))).rejects.toThrow(/practice_not_found/);
    expect((await as(db, 'authenticated', other, () => one<{ l: unknown[] }>('select public.list_my_practice() as l'))).l).toEqual([]);
  });

  it("muddat o'tgan taymerli mashqda javob saqlab bo'lmaydi", async () => {
    await seedPool(2, { block: 'analiz', difficulty: 'L2', topic: 25 });
    const user = await newUser(db);
    const s = await start(user, 'analiz', null, 'timed', 2);
    const q = (await state(user, s.session_id))!.items[0]!.question_id as string;
    await db.query(`update public.practice_sessions set deadline_at = now() - interval '1 minute' where id = $1`, [s.session_id]);
    await expect(save(user, s.session_id, q, 'B')).rejects.toThrow(/practice_closed/);
  });
});

describe('ruxsatlar va statistika', () => {
  it("jadvallarga to'g'ridan-to'g'ri kirish yo'q; store_practice_result faqat service_role; anon hech narsa", async () => {
    const user = await newUser(db);
    await as(db, 'authenticated', user, async () => {
      for (const t of ['practice_sessions', 'practice_items', 'practice_answers']) {
        await expect(db.query(`select * from public.${t}`)).rejects.toThrow(/permission denied/);
      }
      await expect(db.query('select public.store_practice_result($1, $2, true)', [randomUUID(), randomUUID()])).rejects.toThrow(/permission denied/);
    });
    await as(db, 'anon', null, async () => {
      await expect(db.query(`select public.start_practice('geometriya', null, 'practice', 5)`)).rejects.toThrow(/permission denied/);
      await expect(db.query('select public.get_practice_pool_stats()')).rejects.toThrow(/permission denied/);
    });
  });

  it("get_practice_pool_stats faqat mashq zaxirasini sanaydi", async () => {
    await seedPool(3, { block: 'sonlar', difficulty: 'L1', topic: 3 });
    const user = await newUser(db);
    const r = await as(db, 'authenticated', user, () => one<{ s: { block_id: number; difficulty: string; n: number }[] }>('select public.get_practice_pool_stats() as s'));
    const sonlarL1 = r.s.find((x) => x.block_id === 1 && x.difficulty === 'L1');
    expect(sonlarL1!.n).toBeGreaterThanOrEqual(3);
    const total = r.s.reduce((a, x) => a + x.n, 0);
    const real = (await one<{ n: number }>(`select count(*)::int as n from public.questions where pool = 'practice' and status = 'published'`)).n;
    expect(total).toBe(real);
  });

  it("tugagan mashqdagi savolni saqlash mumkin (tugamagan mashqdagini emas) va oxirgi javob ko'rinadi", async () => {
    await seedPool(2, { block: 'analiz', difficulty: 'L2', topic: 25 });
    const user = await newUser(db);
    const s = await start(user, 'analiz', null, 'practice', 2);
    const q = (await state(user, s.session_id))!.items[0]!.question_id as string;
    const toggle = () => as(db, 'authenticated', user, () => one<{ t: boolean }>('select public.toggle_saved_question($1) as t', [q]));

    await save(user, s.session_id, q, 'B');
    await store(s.session_id, q, true);
    await expect(toggle()).rejects.toThrow(/question_not_available/); // mashq hali tugamagan
    await as(db, 'authenticated', user, () => db.query('select public.finish_practice($1)', [s.session_id]));
    expect((await toggle()).t).toBe(true);

    const saved = await as(db, 'authenticated', user, () => one<{ m: Record<string, unknown>[] }>(`select public.get_my_saved('uz') as m`));
    expect(saved.m).toHaveLength(1);
    expect(saved.m[0]).toMatchObject({ question_id: q, last_value: 'B', last_correct: true });
  });
});

describe('list_ungraded_practice_answers', () => {
  it("faqat tekshirilmagan javoblarni qaytaradi; faqat service_role", async () => {
    await seedPool(3, { block: 'analiz', difficulty: 'L2', topic: 25 });
    const user = await newUser(db);
    const s = await start(user, 'analiz', null, 'exam', 3);
    const items = (await state(user, s.session_id))!.items.map((i) => i.question_id as string);
    await save(user, s.session_id, items[0]!, 'B');
    await save(user, s.session_id, items[1]!, 'C');
    await store(s.session_id, items[0]!, true);
    const r = await as(db, 'service_role', null, () => one<{ l: { question_id: string; value: unknown }[] }>('select public.list_ungraded_practice_answers($1) as l', [s.session_id]));
    expect(r.l).toEqual([{ question_id: items[1], value: 'C' }]);
    await as(db, 'authenticated', user, async () => {
      await expect(db.query('select public.list_ungraded_practice_answers($1)', [s.session_id])).rejects.toThrow(/permission denied/);
    });
  });
});
