import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { as, buildExam, createDb, newUser } from './helpers';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
}, 60_000);

const one = async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> => {
  const { rows } = await db.query<T>(sql, params);
  return rows[0]!;
};

const startAttempt = async (userId: string, examId: string) => {
  const r = await as(db, 'authenticated', userId, () =>
    one<{ r: { attempt_id: string; deadline_at: string } }>('select public.start_attempt($1) as r', [examId]),
  );
  return r.r;
};

const saveAnswer = (userId: string, attemptId: string, questionId: string, ...rest: unknown[]) =>
  as(db, 'authenticated', userId, () =>
    db.query('select public.save_answer($1, $2, $3::jsonb, $4, $5) as r', [
      attemptId,
      questionId,
      rest[0] === undefined ? null : JSON.stringify(rest[0]),
      rest[1] ?? null,
      rest[2] ?? null,
    ]),
  );

describe('ma\'lumotnoma ma\'lumotlari', () => {
  it('7 blok, 103 mavzu, 1 format', async () => {
    expect((await one<{ n: number }>('select count(*)::int as n from public.blocks')).n).toBe(7);
    expect((await one<{ n: number }>('select count(*)::int as n from public.topics')).n).toBe(103);
    expect((await one<{ n: number }>('select count(*)::int as n from public.exam_formats')).n).toBe(1);
  });

  it('bloklar bo\'yicha mavzular soni 11/16/15/13/11/27/10', async () => {
    const { rows } = await db.query<{ n: number }>(
      'select count(t.id)::int as n from public.blocks b left join public.topics t on t.block_id = b.id group by b.id order by b.id',
    );
    expect(rows.map((r) => r.n)).toEqual([11, 16, 15, 13, 11, 27, 10]);
  });
});

describe('profil', () => {
  it('ro\'yxatdan o\'tganda student profili yaratiladi', async () => {
    const id = await newUser(db);
    const p = await one<{ role: string; name: string }>('select role, name from public.profiles where id = $1', [id]);
    expect(p).toEqual({ role: 'student', name: 'Test' });
  });
});

describe('publish_exam', () => {
  it('to\'liq mos mock nashr etiladi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const e = await one<{ status: string; published_at: string | null }>('select status, published_at from public.exams where id = $1', [examId]);
    expect(e.status).toBe('published');
    expect(e.published_at).not.toBeNull();
  });

  it('44 ta topshiriqli mock rad etiladi', async () => {
    const { examId } = await buildExam(db, { omitLast: true });
    await expect(db.query('select public.publish_exam($1)', [examId])).rejects.toThrow(/exam_blueprint_invalid.*jami 44 topshiriq, kerak 45/);
  });

  it('nashr etilmagan savol bor mock rad etiladi', async () => {
    const { examId, questionIds } = await buildExam(db);
    await db.query(`update public.questions set status = 'archived' where id = $1`, [questionIds[0]]);
    await expect(db.query('select public.publish_exam($1)', [examId])).rejects.toThrow(/arxivlangan/);
  });

  it('blok bo\'yicha son mos kelmasa rad etiladi', async () => {
    const { examId } = await buildExam(db);
    // 1-pozitsiyadagi (sonlar) savol o'rniga algebra bloki savolini qo'yib, blueprint'ni buzamiz.
    const q = await one<{ id: string }>(
      `insert into public.questions (type, block_id, primary_topic_id, stem_md, payload, difficulty)
       values ('y1', 2, 12, 'x', '{}', 'L1') returning id`,
    );
    await db.query(`insert into public.question_keys (question_id, key_json) values ($1, '{}')`, [q.id]);
    await db.query(`update public.questions set status = 'published' where id = $1`, [q.id]);
    await db.query('update public.exam_items set question_id = $1 where exam_id = $2 and position = 1', [q.id, examId]);
    await expect(db.query('select public.publish_exam($1)', [examId])).rejects.toThrow(/sonlar\/y1: 1 ta, kerak 2/);
  });

  it('talaba nashr qila olmaydi, staff qila oladi', async () => {
    const { examId } = await buildExam(db);
    const student = await newUser(db);
    await expect(as(db, 'authenticated', student, () => db.query('select public.publish_exam($1)', [examId]))).rejects.toThrow(/forbidden/);
    const editor = await newUser(db, 'editor');
    await as(db, 'authenticated', editor, () => db.query('select public.publish_exam($1)', [examId]));
    expect((await one<{ status: string }>('select status from public.exams where id = $1', [examId])).status).toBe('published');
  });
});

describe('o\'zgarmaslik qoidalari', () => {
  it('nashr etilgan savol matni va kaliti o\'zgarmaydi, arxivlash mumkin', async () => {
    const { questionIds } = await buildExam(db, { publish: true });
    const q = questionIds[0];
    await expect(db.query(`update public.questions set stem_md = 'boshqa' where id = $1`, [q])).rejects.toThrow(/question_published_immutable/);
    await expect(db.query(`update public.questions set status = 'draft' where id = $1`, [q])).rejects.toThrow(/question_published_immutable/);
    await expect(db.query(`update public.question_keys set key_json = '{"correct":"B"}' where question_id = $1`, [q])).rejects.toThrow(/question_published_immutable/);
    await db.query(`update public.questions set solution_md = 'tuzatilgan yechim' where id = $1`, [q]);
    await db.query(`update public.questions set status = 'archived' where id = $1`, [q]);
  });

  it('nashr etilgan mock tarkibi o\'zgarmaydi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    await expect(db.query('delete from public.exam_items where exam_id = $1 and position = 1', [examId])).rejects.toThrow(/exam_published_immutable/);
  });
});

describe('RLS va huquqlar', () => {
  it('talaba kalit va savollar jadvalini ko\'ra olmaydi', async () => {
    await buildExam(db, { publish: true });
    const student = await newUser(db);
    await as(db, 'authenticated', student, async () => {
      expect((await one<{ n: number }>('select count(*)::int as n from public.question_keys')).n).toBe(0);
      expect((await one<{ n: number }>('select count(*)::int as n from public.questions')).n).toBe(0);
    });
  });

  it('staff kalitlarni ko\'ra oladi', async () => {
    await buildExam(db);
    const editor = await newUser(db, 'editor');
    await as(db, 'authenticated', editor, async () => {
      expect((await one<{ n: number }>('select count(*)::int as n from public.question_keys')).n).toBeGreaterThan(0);
    });
  });

  it('talaba faqat nashr etilgan mockni ko\'radi', async () => {
    const draft = await buildExam(db);
    const published = await buildExam(db, { publish: true });
    const student = await newUser(db);
    await as(db, 'authenticated', student, async () => {
      const { rows } = await db.query<{ id: string }>('select id from public.exams');
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(published.examId);
      expect(ids).not.toContain(draft.examId);
    });
  });

  it('talaba attempts/answers ga to\'g\'ridan-to\'g\'ri yoza olmaydi va rolini o\'zgartira olmaydi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    await as(db, 'authenticated', student, async () => {
      await expect(
        db.query(`insert into public.attempts (user_id, exam_id, deadline_at) values ($1, $2, now() + interval '1 day')`, [student, examId]),
      ).rejects.toThrow(/permission denied/);
      await expect(db.query('update public.profiles set role = \'admin\' where id = $1', [student])).rejects.toThrow(/permission denied/);
      await db.query(`update public.profiles set name = 'Yangi' where id = $1`, [student]);
    });
  });

  it('boshqa foydalanuvchi attempt\'ini ko\'rmaydi va o\'qiy olmaydi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const owner = await newUser(db);
    const other = await newUser(db);
    const { attempt_id } = await startAttempt(owner, examId);
    await as(db, 'authenticated', other, async () => {
      expect((await one<{ n: number }>('select count(*)::int as n from public.attempts')).n).toBe(0);
      await expect(db.query('select public.get_attempt_state($1)', [attempt_id])).rejects.toThrow(/attempt_not_found/);
    });
  });

  it('anon va talaba server funksiyalarini chaqira olmaydi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    const { attempt_id } = await startAttempt(student, examId);
    await as(db, 'anon', null, async () => {
      await expect(db.query('select public.start_attempt($1)', [examId])).rejects.toThrow(/permission denied/);
    });
    await as(db, 'authenticated', student, async () => {
      await expect(db.query('select public.close_attempt($1, false)', [attempt_id])).rejects.toThrow(/permission denied/);
      await expect(db.query('select public.store_attempt_score($1, 0, 0, 0, null, \'x\', \'[]\')', [attempt_id])).rejects.toThrow(/permission denied/);
    });
  });
});

describe('start_attempt', () => {
  it('deadline = start + 150 daqiqa va idempotent', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    const first = await startAttempt(student, examId);
    const second = await startAttempt(student, examId);
    expect(second.attempt_id).toBe(first.attempt_id);
    const ok = await one<{ ok: boolean }>(`select deadline_at - started_at = interval '150 minutes' as ok from public.attempts where id = $1`, [first.attempt_id]);
    expect(ok.ok).toBe(true);
  });

  it('nashr etilmagan mock va autentifikatsiyasiz chaqiruv rad etiladi', async () => {
    const draft = await buildExam(db);
    const published = await buildExam(db, { publish: true });
    const student = await newUser(db);
    await expect(startAttempt(student, draft.examId)).rejects.toThrow(/exam_not_available/);
    await as(db, 'authenticated', null, async () => {
      await expect(db.query('select public.start_attempt($1)', [published.examId])).rejects.toThrow(/not_authenticated/);
    });
  });

  it('profil to\'liq bo\'lmasa (telefon, sinf yoki ism yo\'q) imtihon boshlanmaydi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const noPhone = await newUser(db, 'student', { complete: false });
    await expect(startAttempt(noPhone, examId)).rejects.toThrow(/profile_incomplete/);

    // faqat telefon bor, sinf yo'q
    await db.query(`update public.profiles set phone = '+998901234567' where id = $1`, [noPhone]);
    await expect(startAttempt(noPhone, examId)).rejects.toThrow(/profile_incomplete/);

    // ism bo'sh
    await db.query(`update public.profiles set grade = '10', name = '  ' where id = $1`, [noPhone]);
    await expect(startAttempt(noPhone, examId)).rejects.toThrow(/profile_incomplete/);

    await db.query(`update public.profiles set name = 'Ali Valiyev' where id = $1`, [noPhone]);
    // konsentsiz ham boshlanmaydi
    await expect(startAttempt(noPhone, examId)).rejects.toThrow(/profile_incomplete/);

    await db.query(`update public.profiles set consent_at = now() where id = $1`, [noPhone]);
    await expect(startAttempt(noPhone, examId)).resolves.toHaveProperty('attempt_id');
  });

  it('talaba o\'z profilini (ism, telefon, sinf) yangilay oladi, telefon formati tekshiriladi', async () => {
    const student = await newUser(db, 'student', { complete: false });
    await as(db, 'authenticated', student, async () => {
      await db.query(`update public.profiles set name = 'Ali Valiyev', phone = '+998901112233', grade = '9' where id = $1`, [student]);
      await expect(db.query(`update public.profiles set phone = '901112233' where id = $1`, [student])).rejects.toThrow(/check constraint/);
      await expect(db.query(`update public.profiles set name = $2 where id = $1`, [student, 'x'.repeat(101)])).rejects.toThrow(/profiles_name_len/);
    });
  });

  it('bitta foydalanuvchida ikkita faol attempt bo\'lishi mumkin emas', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    await startAttempt(student, examId);
    await expect(
      db.query(`insert into public.attempts (user_id, exam_id, deadline_at) values ($1, $2, now() + interval '1 day')`, [student, examId]),
    ).rejects.toThrow(/duplicate key|attempts_one_active_idx/);
  });
});

describe('save_answer', () => {
  it('javobni saqlaydi, belgilash qiymatni o\'chirmaydi, JSON null tozalaydi', async () => {
    const { examId, questionIds } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    const { attempt_id } = await startAttempt(student, examId);
    const q = questionIds[0]!;

    await saveAnswer(student, attempt_id, q, 'B', false, 12);
    await saveAnswer(student, attempt_id, q, undefined, true);
    let row = await one<{ value_json: string; flagged: boolean; time_spent_sec: number }>('select value_json, flagged, time_spent_sec from public.answers where attempt_id = $1 and question_id = $2', [attempt_id, q]);
    expect(row).toEqual({ value_json: 'B', flagged: true, time_spent_sec: 12 });

    await saveAnswer(student, attempt_id, q, null);
    row = await one('select value_json, flagged, time_spent_sec from public.answers where attempt_id = $1 and question_id = $2', [attempt_id, q]);
    expect(row.value_json).toBeNull();
    expect(row.flagged).toBe(true);
  });

  it('boshqa foydalanuvchi, mockda yo\'q savol va katta qiymat rad etiladi', async () => {
    const { examId, questionIds } = await buildExam(db, { publish: true });
    const foreign = await buildExam(db, { publish: true });
    const owner = await newUser(db);
    const other = await newUser(db);
    const { attempt_id } = await startAttempt(owner, examId);

    await expect(saveAnswer(other, attempt_id, questionIds[0]!, 'A')).rejects.toThrow(/attempt_not_found/);
    await expect(saveAnswer(owner, attempt_id, foreign.questionIds[0]!, 'A')).rejects.toThrow(/question_not_in_exam/);
    await expect(saveAnswer(owner, attempt_id, questionIds[0]!, 'x'.repeat(2500))).rejects.toThrow(/value_too_large/);
  });

  it('muddat + grace (5 s) ichida qabul, undan keyin rad', async () => {
    const { examId, questionIds } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    const { attempt_id } = await startAttempt(student, examId);

    await db.query(`update public.attempts set deadline_at = now() - interval '2 seconds' where id = $1`, [attempt_id]);
    await saveAnswer(student, attempt_id, questionIds[0]!, 'A');

    await db.query(`update public.attempts set deadline_at = now() - interval '10 seconds' where id = $1`, [attempt_id]);
    await expect(saveAnswer(student, attempt_id, questionIds[0]!, 'B')).rejects.toThrow(/deadline_passed/);
  });
});

describe('get_attempt_state', () => {
  it('45 savol tartib bilan, kalitsiz va yechimsiz; topshirilgach yechim bilan', async () => {
    const { examId, questionIds } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    const { attempt_id } = await startAttempt(student, examId);
    await saveAnswer(student, attempt_id, questionIds[2]!, 'C', true, 7);

    type State = {
      attempt: { status: string };
      items: { position: number; section: string; solution_md?: string }[];
      answers: unknown[];
    };
    const get = () => as(db, 'authenticated', student, () => one<{ s: State }>('select public.get_attempt_state($1) as s', [attempt_id]));

    let { s } = await get();
    expect(s.items).toHaveLength(45);
    expect(s.items.map((i) => i.position)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    expect(s.items[0].section).toBe('y1');
    expect(s.items[44].section).toBe('o');
    expect(s.answers).toHaveLength(1);
    const text = JSON.stringify(s);
    expect(text).not.toContain('key_json');
    expect(text).not.toContain('correct');
    expect(text).not.toContain('Yechim');
    expect(s.attempt.status).toBe('in_progress');

    await as(db, 'service_role', null, () => db.query('select public.close_attempt($1, false)', [attempt_id]));
    ({ s } = await get());
    expect(s.attempt.status).toBe('submitted');
    expect(s.items[0].solution_md).toBe('Yechim');
  });
});

describe('close_attempt va store_attempt_score', () => {
  const close = (attemptId: string, onlyIfExpired: boolean) =>
    as(db, 'service_role', null, () =>
      one<{ r: { status: string; submit_reason: string | null } }>('select public.close_attempt($1, $2) as r', [attemptId, onlyIfExpired]),
    );

  it('lazy finalize: muddat o\'tmaguncha yopmaydi, o\'tgach deadline vaqti bilan timeout', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    const { attempt_id } = await startAttempt(student, examId);

    expect((await close(attempt_id, true)).r.status).toBe('in_progress');

    await db.query(`update public.attempts set deadline_at = now() - interval '1 minute' where id = $1`, [attempt_id]);
    const closed = (await close(attempt_id, true)).r;
    expect(closed.status).toBe('submitted');
    expect(closed.submit_reason).toBe('timeout');
    const same = await one<{ ok: boolean }>('select submitted_at = deadline_at as ok from public.attempts where id = $1', [attempt_id]);
    expect(same.ok).toBe(true);
    expect((await close(attempt_id, true)).r.submit_reason).toBe('timeout');
  });

  it('talaba topshirishi (muddat ichida) user sababi bilan yopiladi; keyin saqlash rad etiladi', async () => {
    const { examId, questionIds } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    const { attempt_id } = await startAttempt(student, examId);
    const closed = (await close(attempt_id, false)).r;
    expect(closed.submit_reason).toBe('user');
    await expect(saveAnswer(student, attempt_id, questionIds[0]!, 'A')).rejects.toThrow(/attempt_closed/);
  });

  it('muddat o\'tgach "topshirish" ham timeout deb yoziladi', async () => {
    const { examId } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    const { attempt_id } = await startAttempt(student, examId);
    await db.query(`update public.attempts set deadline_at = now() - interval '1 minute' where id = $1`, [attempt_id]);
    expect((await close(attempt_id, false)).r.submit_reason).toBe('timeout');
  });

  it('ball bir marta yoziladi (idempotent), yopilmagan attempt\'ga yozib bo\'lmaydi', async () => {
    const { examId, questionIds } = await buildExam(db, { publish: true });
    const student = await newUser(db);
    const { attempt_id } = await startAttempt(student, examId);
    await saveAnswer(student, attempt_id, questionIds[0]!, 'A');

    const store = (raw: number) =>
      as(db, 'service_role', null, () =>
        one<{ r: boolean }>('select public.store_attempt_score($1, $2, 91, 30, $3, $4, $5::jsonb) as r', [
          attempt_id,
          raw,
          null,
          'phaseA-linear-v1',
          JSON.stringify([
            { question_id: questionIds[0], is_correct: true, score: 1.3, max_score: 1.3, parts: null },
            { question_id: questionIds[1], is_correct: false, score: 0, max_score: 1.3, parts: null },
            { question_id: randomForeignId, is_correct: true, score: 9, max_score: 9, parts: null },
          ]),
        ]),
      );
    const randomForeignId = (await buildExam(db)).questionIds[0];

    await expect(store(1.3)).rejects.toThrow(/attempt_not_closed/);
    await close(attempt_id, false);
    expect((await store(1.3)).r).toBe(true);
    expect((await store(50)).r).toBe(false);

    const a = await one<{ raw_score: string; scaled_score: string; level: string | null; is_estimate: boolean }>('select raw_score, scaled_score, level, is_estimate from public.attempts where id = $1', [attempt_id]);
    expect(Number(a.raw_score)).toBe(1.3);
    expect(Number(a.scaled_score)).toBe(30);
    expect(a.level).toBeNull();
    expect(a.is_estimate).toBe(true);

    const rows = await db.query<{ question_id: string; value_json: string | null; is_correct: boolean }>('select question_id, value_json, is_correct from public.answers where attempt_id = $1', [attempt_id]);
    expect(rows.rows).toHaveLength(2); // mockda bo'lmagan savol e'tiborsiz qoldirildi
    expect(rows.rows.find((r) => r.question_id === questionIds[0])!.value_json).toBe('A');
    expect(rows.rows.find((r) => r.question_id === questionIds[1])!.value_json).toBeNull();
  });
});
