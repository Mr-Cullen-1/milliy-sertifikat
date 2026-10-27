import type { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { finalizeAttempt } from '../../lib/exam/finalize';
import { as, buildExam, CORRECT_ANSWERS, createDb, newUser, pgliteStore, typeAt } from './helpers';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
}, 60_000);

const one = async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> => (await db.query<T>(sql, params)).rows[0]!;

async function startFor(userId: string, examId: string): Promise<string> {
  const r = await as(db, 'authenticated', userId, () => one<{ r: { attempt_id: string } }>('select public.start_attempt($1) as r', [examId]));
  return r.r.attempt_id;
}

async function answerAll(userId: string, attemptId: string, questionIds: string[], pick: (pos: number) => unknown) {
  for (let pos = 1; pos <= 45; pos++) {
    const v = pick(pos);
    if (v === null) continue;
    await as(db, 'authenticated', userId, () =>
      db.query('select public.save_answer($1, $2, $3::jsonb)', [attemptId, questionIds[pos - 1], JSON.stringify(v)]),
    );
  }
}

describe('publish_exam: savollarni muzlatish va holat qoidalari', () => {
  it('qoralama savollar nashrda published bo\'ladi va o\'zgarmas', async () => {
    const { examId, questionIds } = await buildExam(db, { draftQuestions: true });
    expect((await one<{ n: number }>(`select count(*)::int as n from public.questions where id = any($1) and status = 'draft'`, [questionIds])).n).toBe(45);
    await db.query('select public.publish_exam($1)', [examId]);
    expect((await one<{ n: number }>(`select count(*)::int as n from public.questions where id = any($1) and status = 'published'`, [questionIds])).n).toBe(45);
    await expect(db.query(`update public.questions set stem_md = 'o''zgartirish' where id = $1`, [questionIds[0]])).rejects.toThrow(/question_published_immutable/);
  });

  it('nashr etilgan mock qoralamaga qaytmaydi, lekin arxivlanadi va qayta ochiladi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    await expect(db.query(`update public.exams set status = 'draft' where id = $1`, [examId])).rejects.toThrow(/exam_status_immutable/);
    await db.query(`update public.exams set status = 'archived' where id = $1`, [examId]);
    await expect(db.query(`update public.exams set status = 'draft' where id = $1`, [examId])).rejects.toThrow(/exam_status_immutable/);
    await db.query(`update public.exams set status = 'published' where id = $1`, [examId]);
  });

  it('exam code/sort va savol external_id noyob', async () => {
    const a = await buildExam(db);
    const b = await buildExam(db);
    await db.query(`update public.exams set code = 'Z1' where id = $1`, [a.examId]);
    await expect(db.query(`update public.exams set code = 'Z1' where id = $1`, [b.examId])).rejects.toThrow(/duplicate key|unique/);
    await db.query(`update public.questions set external_id = 'x-1' where id = $1`, [a.questionIds[0]]);
    await expect(db.query(`update public.questions set external_id = 'x-1' where id = $1`, [a.questionIds[1]])).rejects.toThrow(/duplicate key|unique/);
  });
});

describe('get_attempt_state: til va to\'g\'ri javob', () => {
  it('so\'ralgan tilda matn beradi, tarjima yo\'q bo\'lsa o\'zbekchaga qaytadi', async () => {
    const { examId, questionIds } = await buildExam(db, { publish: true });
    await db.query(
      `update public.questions set i18n = $2::jsonb where id = $1`,
      [
        questionIds[0],
        JSON.stringify({
          ru: { stem_md: 'Русский текст', payload: { options: { A: 'а', B: 'б', C: 'в', D: 'г' } }, solution_md: 'Решение' },
        }),
      ],
    );
    const user = await newUser(db);
    const attemptId = await startFor(user, examId);

    const get = (lang?: string) =>
      as(db, 'authenticated', user, () =>
        one<{ s: { items: { stem_md: string; payload: { options: Record<string, string> } }[] } }>(
          lang ? 'select public.get_attempt_state($1, $2) as s' : 'select public.get_attempt_state($1) as s',
          lang ? [attemptId, lang] : [attemptId],
        ),
      );

    expect((await get()).s.items[0]!.stem_md).toBe('Savol $x$');
    expect((await get('ru')).s.items[0]!.stem_md).toBe('Русский текст');
    expect((await get('ru')).s.items[0]!.payload.options.A).toBe('а');
    // tarjimasi yo'q til va noma'lum til -> uz
    expect((await get('en')).s.items[0]!.stem_md).toBe('Savol $x$');
    expect((await get('xx')).s.items[0]!.stem_md).toBe('Savol $x$');
    // tarjimasi yo'q savollar ru da ham uz
    expect((await get('ru')).s.items[1]!.stem_md).toBe('Savol $x$');
  });

  it('to\'g\'ri javob faqat topshirilgandan keyin keladi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const user = await newUser(db);
    const attemptId = await startFor(user, examId);
    const state = () =>
      as(db, 'authenticated', user, () => one<{ s: { items: Record<string, unknown>[] } }>('select public.get_attempt_state($1) as s', [attemptId]));

    const before = (await state()).s.items[0]!;
    expect(before).not.toHaveProperty('correct_answer');
    expect(JSON.stringify(before)).not.toContain('Yechim');

    await finalizeAttempt(pgliteStore(db), attemptId, { onlyIfExpired: false });
    const after = (await state()).s.items;
    expect(after[0]).toMatchObject({ correct_answer: { correct: 'A' }, solution_md: 'Yechim' });
    expect(after[34]).toMatchObject({ correct_answer: { pairs: { '1': 'A', '2': 'B', '3': 'C' } } });
    expect(after[44]).toMatchObject({ correct_answer: { a: ['3/4', '0.75'], b: ['-2'] } });
  });
});

describe('tab almashtirish logi', () => {
  it('faqat o\'z faol attempt\'ida hisoblaydi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const owner = await newUser(db);
    const other = await newUser(db);
    const attemptId = await startFor(owner, examId);

    await as(db, 'authenticated', owner, () => db.query('select public.log_tab_switch($1)', [attemptId]));
    await as(db, 'authenticated', owner, () => db.query('select public.log_tab_switch($1)', [attemptId]));
    await as(db, 'authenticated', other, () => db.query('select public.log_tab_switch($1)', [attemptId]));
    expect((await one<{ n: number }>('select tab_switches as n from public.attempts where id = $1', [attemptId])).n).toBe(2);

    await finalizeAttempt(pgliteStore(db), attemptId, { onlyIfExpired: false });
    await as(db, 'authenticated', owner, () => db.query('select public.log_tab_switch($1)', [attemptId]));
    expect((await one<{ n: number }>('select tab_switches as n from public.attempts where id = $1', [attemptId])).n).toBe(2);
  });
});

describe('rate_limit_hit va audit', () => {
  const hit = (key: string, limit: number, sec = 60) =>
    as(db, 'service_role', null, async () => (await one<{ r: boolean }>('select public.rate_limit_hit($1, $2, $3) as r', [key, limit, sec])).r);

  it('limitgacha ruxsat, undan keyin rad; oyna tugagach qayta boshlanadi; kalitlar alohida', async () => {
    const key = `t:${randomUUID()}`;
    expect([await hit(key, 3), await hit(key, 3), await hit(key, 3), await hit(key, 3), await hit(key, 3)]).toEqual([true, true, true, false, false]);
    expect(await hit(`${key}:other`, 3)).toBe(true);

    await db.query(`update public.rate_limits set window_start = now() - interval '2 minutes' where key = $1`, [key]);
    expect(await hit(key, 3)).toBe(true);
  });

  it('talaba rate_limit_hit va log_audit ni chaqira olmaydi', async () => {
    const student = await newUser(db);
    await as(db, 'authenticated', student, async () => {
      await expect(db.query(`select public.rate_limit_hit('x', 1, 1)`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select public.log_audit(null, 'x')`)).rejects.toThrow(/permission denied/);
      await expect(db.query('select * from public.rate_limits')).rejects.toThrow(/permission denied/);
    });
  });

  it('audit yozuvlarini faqat staff o\'qiydi', async () => {
    const admin = await newUser(db, 'admin');
    const student = await newUser(db);
    await as(db, 'service_role', null, () =>
      db.query(`select public.log_audit($1, 'exam.publish', 'exam', 'e1', '{"title":"A"}'::jsonb)`, [admin]),
    );
    await as(db, 'authenticated', admin, async () => {
      const r = await db.query<{ action: string }>('select action from public.audit_log');
      expect(r.rows.map((x) => x.action)).toContain('exam.publish');
    });
    await as(db, 'authenticated', student, async () => {
      expect((await one<{ n: number }>('select count(*)::int as n from public.audit_log')).n).toBe(0);
    });
  });
});

describe('xatolar daftari va mavzu statistikasi', () => {
  it('faqat oxirgi urinishda xato qilingan savollar, to\'g\'ri javob va yechim bilan', async () => {
    const { examId, questionIds } = await buildExam(db, { publish: true });
    const user = await newUser(db);

    // 1-urinish: y1 hammasi to'g'ri, qolganlari javobsiz
    let attemptId = await startFor(user, examId);
    await answerAll(user, attemptId, questionIds, (pos) => (pos <= 32 ? CORRECT_ANSWERS.y1 : null));
    await finalizeAttempt(pgliteStore(db), attemptId, { onlyIfExpired: false });

    const mistakes = () => as(db, 'authenticated', user, () => one<{ m: Record<string, unknown>[] }>(`select public.get_my_mistakes('uz') as m`));
    let m = (await mistakes()).m;
    expect(m).toHaveLength(13); // 3 ta y2 + 10 ta o
    expect(m[0]).toMatchObject({ solution_md: 'Yechim', times_wrong: 1, times_seen: 1 });
    expect(m.find((x) => x.type === 'o')).toMatchObject({ correct_answer: { a: ['3/4', '0.75'], b: ['-2'] }, last_value: null });

    // 2-urinish: endi y2 to'g'ri, y1 dagi 1-savol xato
    attemptId = await startFor(user, examId);
    await answerAll(user, attemptId, questionIds, (pos) => (pos === 1 ? 'D' : pos >= 33 && pos <= 35 ? CORRECT_ANSWERS.y2 : null));
    await finalizeAttempt(pgliteStore(db), attemptId, { onlyIfExpired: false });

    m = (await mistakes()).m;
    // y2 (3 ta) o'zlashtirildi (oxirgi urinishda to'g'ri). Qolganlari xato yoki javobsiz: 1-savol (D, xato) + 31 ta javobsiz y1 + 10 ta o
    expect(m).toHaveLength(42);
    const first = m.find((x) => x.question_id === questionIds[0])!;
    expect(first).toMatchObject({ times_wrong: 1, times_seen: 2, last_value: 'D' });
    expect(m.some((x) => x.type === 'y2')).toBe(false);

    const stats = await as(db, 'authenticated', user, () => one<{ s: { topic_id: number; block_id: number; total: number; correct: number }[] }>('select public.get_my_topic_stats() as s'));
    expect(stats.s.length).toBeGreaterThan(0);
    const total = stats.s.reduce((sum, r) => sum + r.total, 0);
    const correct = stats.s.reduce((sum, r) => sum + r.correct, 0);
    expect(total).toBe(90); // 2 urinish x 45 savol
    expect(correct).toBe(32 + 3); // 1-urinish: 32 ta y1; 2-urinish: 3 ta y2

    // boshqa foydalanuvchi bularni ko'rmaydi
    const other = await newUser(db);
    const otherM = await as(db, 'authenticated', other, () => one<{ m: unknown[] }>(`select public.get_my_mistakes('uz') as m`));
    expect(otherM.m).toEqual([]);
  });
});

describe('admin funksiyalari', () => {
  it('talaba chaqira olmaydi (forbidden), staff va service_role oladi', async () => {
    const student = await newUser(db);
    const editor = await newUser(db, 'editor');
    await as(db, 'authenticated', student, async () => {
      await expect(db.query('select public.admin_overview()')).rejects.toThrow(/forbidden/);
      await expect(db.query('select public.admin_attempts()')).rejects.toThrow(/forbidden/);
      await expect(db.query('select public.admin_participants()')).rejects.toThrow(/forbidden/);
      await expect(db.query('select public.admin_question_stats()')).rejects.toThrow(/forbidden/);
    });
    await as(db, 'authenticated', editor, async () => {
      await expect(db.query('select public.admin_overview()')).resolves.toBeDefined();
    });
    await as(db, 'service_role', null, async () => {
      await expect(db.query('select public.admin_overview()')).resolves.toBeDefined();
    });
    await as(db, 'anon', null, async () => {
      await expect(db.query('select public.admin_overview()')).rejects.toThrow(/permission denied/);
    });
  });

  it('statistika ishtirokchi, attempt va natijalarni to\'g\'ri sanaydi', async () => {
    const { examId, questionIds } = await buildExam(db, { publish: true });
    const admin = await newUser(db, 'admin');
    const user = await newUser(db);
    await db.query(`update public.profiles set name = 'Ali Valiyev', phone = '+998901112233', grade = '10' where id = $1`, [user]);
    await db.query(`update public.exams set code = 'T', title = 'Test variant' where id = $1`, [examId]);
    const attemptId = await startFor(user, examId);
    await answerAll(user, attemptId, questionIds, (pos) => (pos <= 32 ? CORRECT_ANSWERS.y1 : null));
    await as(db, 'authenticated', user, () => db.query('select public.log_tab_switch($1)', [attemptId]));
    await finalizeAttempt(pgliteStore(db), attemptId, { onlyIfExpired: false });

    await as(db, 'authenticated', admin, async () => {
      type Ov = { attempts_submitted: number; participants: number; exams: { id: string; avg_scaled: string | number | null }[] };
      const o = (await one<{ o: Ov }>('select public.admin_overview() as o')).o;
      expect(o.attempts_submitted).toBeGreaterThanOrEqual(1);
      expect(o.participants).toBeGreaterThanOrEqual(1);
      const exam = o.exams.find((e: { id: string }) => e.id === examId);
      expect(exam).toMatchObject({ code: 'T', title: 'Test variant', status: 'published', items: 45, attempts: 1, submitted: 1 });
      expect(Number(exam!.avg_scaled)).toBeGreaterThan(0);

      const a = (await one<{ a: { total: number; rows: Record<string, unknown>[] } }>('select public.admin_attempts(10, 0, $1, null) as a', [examId])).a;
      expect(a.total).toBe(1);
      expect(a.rows[0]).toMatchObject({ name: 'Ali Valiyev', phone: '+998901112233', grade: '10', exam_code: 'T', status: 'submitted', tab_switches: 1 });

      const none = (await one<{ a: { total: number } }>(`select public.admin_attempts(10, 0, $1, 'in_progress') as a`, [examId])).a;
      expect(none.total).toBe(0);

      const p = (await one<{ p: { total: number; rows: Record<string, unknown>[] } }>(`select public.admin_participants(10, 0, 'valiyev') as p`)).p;
      expect(p.total).toBe(1);
      expect(p.rows[0]).toMatchObject({ name: 'Ali Valiyev', attempts: 1 });
      expect(Number((p.rows[0] as { best_scaled: string }).best_scaled)).toBeGreaterThan(0);

      const qs = (await one<{ q: Record<string, unknown>[] }>('select public.admin_question_stats($1) as q', [examId])).q;
      expect(qs).toHaveLength(45);
      expect(qs[0]).toMatchObject({ position: 1, answered: 1, correct: 1 });
      expect(qs[44]).toMatchObject({ position: 45, answered: 0, correct: 0 });
    });
  });
});

describe('cleanup_guest_users', () => {
  it('eski, attempt\'siz mehmon va anonim hisoblarni o\'chiradi; qolganlariga tegmaydi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const mk = async (email: string | null, anon: boolean, ageDays: number) => {
      const id = randomUUID();
      await db.query(
        `insert into auth.users (id, email, is_anonymous, created_at, raw_user_meta_data) values ($1, $2, $3, now() - make_interval(days => $4), '{}')`,
        [id, email, anon, ageDays],
      );
      return id;
    };
    const oldGuest = await mk(`g-${randomUUID()}@guest.invalid`, false, 10);
    const oldAnon = await mk(null, true, 10);
    const newGuest = await mk(`g-${randomUUID()}@guest.invalid`, false, 1);
    const realUser = await mk('real@example.com', false, 30);
    const guestWithAttempt = await mk(`g-${randomUUID()}@guest.invalid`, false, 10);
    await db.query(`update public.profiles set name = 'X Y', phone = '+998901234567', grade = '9', consent_at = now() where id = $1`, [guestWithAttempt]);
    await startFor(guestWithAttempt, examId);

    const n = await as(db, 'service_role', null, async () => (await one<{ n: number }>('select public.cleanup_guest_users() as n')).n);
    expect(n).toBeGreaterThanOrEqual(2);

    const exists = async (id: string) => (await one<{ n: number }>('select count(*)::int as n from auth.users where id = $1', [id])).n === 1;
    expect(await exists(oldGuest)).toBe(false);
    expect(await exists(oldAnon)).toBe(false);
    expect(await exists(newGuest)).toBe(true);
    expect(await exists(realUser)).toBe(true);
    expect(await exists(guestWithAttempt)).toBe(true);
    // profil ham o'chadi (cascade)
    expect((await one<{ n: number }>('select count(*)::int as n from public.profiles where id = $1', [oldGuest])).n).toBe(0);
  });

  it('talaba chaqira olmaydi', async () => {
    const student = await newUser(db);
    await as(db, 'authenticated', student, async () => {
      await expect(db.query('select public.cleanup_guest_users()')).rejects.toThrow(/permission denied/);
    });
  });
});

describe('typeAt (yordamchi mosligi)', () => {
  it('pozitsiya turlari', () => {
    expect([typeAt(1), typeAt(33), typeAt(36)]).toEqual(['y1', 'y2', 'o']);
  });
});
