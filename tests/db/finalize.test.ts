import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { finalizeAttempt, type ExamStore } from '../../lib/exam/finalize';
import { as, buildExam, CORRECT_ANSWERS, createDb, newUser, pgliteStore, typeAt } from './helpers';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
}, 60_000);

interface AttemptRow {
  status: string;
  submit_reason: string | null;
  raw_score: string | null;
  max_raw: string | null;
  scaled_score: string | null;
  level: string | null;
  scoring_version: string | null;
}

const attemptRow = async (id: string): Promise<AttemptRow> =>
  (await db.query<AttemptRow>('select status, submit_reason, raw_score, max_raw, scaled_score, level, scoring_version from public.attempts where id = $1', [id])).rows[0]!;

/** Mock + talaba + boshlangan attempt; answer(position) null qaytarsa savol javobsiz qoladi. */
async function setup(answer: (position: number) => unknown) {
  const { examId, questionIds } = await buildExam(db, { publish: true });
  const student = await newUser(db);
  const started = await as(db, 'authenticated', student, () =>
    db.query<{ r: { attempt_id: string } }>('select public.start_attempt($1) as r', [examId]),
  );
  const attemptId = started.rows[0]!.r.attempt_id;
  for (let pos = 1; pos <= 45; pos++) {
    const value = answer(pos);
    if (value === null) continue;
    await as(db, 'authenticated', student, () =>
      db.query('select public.save_answer($1, $2, $3::jsonb)', [attemptId, questionIds[pos - 1], JSON.stringify(value)]),
    );
  }
  return { attemptId, questionIds, student };
}

describe('finalizeAttempt (haqiqiy SQL ustida)', () => {
  it('hammasi to\'g\'ri: 75 ball, A+, barcha javoblar to\'g\'ri deb belgilanadi', async () => {
    const { attemptId } = await setup((pos) => CORRECT_ANSWERS[typeAt(pos)]);
    const out = await finalizeAttempt(pgliteStore(db), attemptId, { onlyIfExpired: false });
    expect(out.status).toBe('submitted');

    const a = await attemptRow(attemptId);
    expect(a.status).toBe('submitted');
    expect(a.submit_reason).toBe('user');
    expect(Number(a.raw_score)).toBe(80.2); // 32×1,3 + 3×2,2 + 10×3,2
    expect(Number(a.max_raw)).toBe(80.2);
    expect(Number(a.scaled_score)).toBe(75);
    expect(a.level).toBe('A+');
    expect(a.scoring_version).toBe('phaseA-linear-v1');

    const { rows } = await db.query<{ n: number; correct: number }>(
      'select count(*)::int as n, count(*) filter (where is_correct)::int as correct from public.answers where attempt_id = $1',
      [attemptId],
    );
    expect(rows[0]).toEqual({ n: 45, correct: 45 });
  });

  it('faqat Y-1 to\'g\'ri: 41,6 xom ball, ~38,9, daraja berilmaydi', async () => {
    const { attemptId } = await setup((pos) => (pos <= 32 ? CORRECT_ANSWERS.y1 : null));
    await finalizeAttempt(pgliteStore(db), attemptId, { onlyIfExpired: false });
    const a = await attemptRow(attemptId);
    expect(Number(a.raw_score)).toBe(41.6);
    expect(Number(a.scaled_score)).toBe(38.9);
    expect(a.level).toBeNull();
  });

  it('ochiq savolda faqat a band yuborilgan (b kelmagan): 1,5 ball, bandlar alohida saqlanadi', async () => {
    const { attemptId, questionIds } = await setup((pos) => (pos === 36 ? { a: '3/4' } : null));
    await finalizeAttempt(pgliteStore(db), attemptId, { onlyIfExpired: false });
    expect(Number((await attemptRow(attemptId)).raw_score)).toBe(1.5);
    const row = (
      await db.query<{ score: string; score_part: { a: boolean; b: boolean } }>(
        'select score, score_part from public.answers where attempt_id = $1 and question_id = $2',
        [attemptId, questionIds[35]],
      )
    ).rows[0]!;
    expect(Number(row.score)).toBe(1.5);
    expect(row.score_part).toEqual({ a: true, b: false });
  });

  it('yaroqsiz javob shakli xato bermaydi, 0 ball hisoblanadi', async () => {
    const { attemptId } = await setup((pos) => (pos === 1 ? { noto: "g'ri" } : null));
    await finalizeAttempt(pgliteStore(db), attemptId, { onlyIfExpired: false });
    expect(Number((await attemptRow(attemptId)).raw_score)).toBe(0);
  });

  it('lazy finalize: muddat o\'tmaguncha yopilmaydi, o\'tgach timeout bilan ballanadi', async () => {
    const { attemptId } = await setup((pos) => (pos <= 32 ? CORRECT_ANSWERS.y1 : null));
    const store = pgliteStore(db);

    const early = await finalizeAttempt(store, attemptId, { onlyIfExpired: true });
    expect(early).toMatchObject({ status: 'in_progress' });
    expect(Date.parse((early as { serverNow: string }).serverNow)).not.toBeNaN(); // taymerni sinxronlash uchun
    expect((await attemptRow(attemptId)).status).toBe('in_progress');

    await db.query(`update public.attempts set deadline_at = now() - interval '1 minute' where id = $1`, [attemptId]);
    await finalizeAttempt(store, attemptId, { onlyIfExpired: true });
    const a = await attemptRow(attemptId);
    expect(a.status).toBe('submitted');
    expect(a.submit_reason).toBe('timeout');
    expect(Number(a.raw_score)).toBe(41.6);
  });

  it('takroriy chaqiruv ballni qayta hisoblamaydi va yozmaydi', async () => {
    const { attemptId } = await setup((pos) => (pos === 1 ? 'A' : null));
    const store = pgliteStore(db);
    const storeScore = vi.spyOn(store, 'storeScore');
    await finalizeAttempt(store, attemptId, { onlyIfExpired: false });
    await finalizeAttempt(store, attemptId, { onlyIfExpired: false });
    await finalizeAttempt(store, attemptId, { onlyIfExpired: true });
    expect(storeScore).toHaveBeenCalledTimes(1);
  });

  it('yozish uzilsa attempt yopiq-ballsiz qoladi va keyingi chaqiruv ballni tiklaydi', async () => {
    const { attemptId } = await setup((pos) => (pos <= 32 ? CORRECT_ANSWERS.y1 : null));
    const real = pgliteStore(db);
    let fail = true;
    const flaky: ExamStore = {
      ...real,
      async storeScore(id, result) {
        if (fail) throw new Error('tarmoq uzildi');
        return real.storeScore(id, result);
      },
    };

    await expect(finalizeAttempt(flaky, attemptId, { onlyIfExpired: false })).rejects.toThrow(/tarmoq uzildi/);
    const mid = await attemptRow(attemptId);
    expect(mid.status).toBe('submitted');
    expect(mid.raw_score).toBeNull();

    fail = false;
    await finalizeAttempt(flaky, attemptId, { onlyIfExpired: true });
    expect(Number((await attemptRow(attemptId)).raw_score)).toBe(41.6);
  });
});
