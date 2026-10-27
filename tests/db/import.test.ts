import type { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { as, createDb, newUser } from './helpers';

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
}, 60_000);

const y1 = (ext: string, block = 'sonlar', topic = 3) => ({
  external_id: ext,
  type: 'y1',
  block,
  topic,
  difficulty: 'L1',
  stem_md: 'Savol $x$',
  payload: { options: { A: '1', B: '2', C: '3', D: '4' } },
  key: { correct: 'B' },
  solution_md: 'Yechim',
  extra_topics: [4],
  i18n: { ru: { stem_md: 'Вопрос', payload: { options: { A: '1', B: '2', C: '3', D: '4' } } } },
});

const run = (questions: unknown[], exam?: unknown) =>
  as(db, 'service_role', null, async () => {
    const r = await db.query<{ r: { question_ids: string[]; created: number; existing: number; exam_id: string | null } }>(
      'select public.import_questions($1::jsonb, $2::jsonb) as r',
      [JSON.stringify(questions), exam === undefined ? null : JSON.stringify(exam)],
    );
    return r.rows[0]!.r;
  });

describe('import_questions', () => {
  it('savol, kalit, qo\'shimcha mavzu va tarjimani yozadi; qoralama holatida', async () => {
    const ext = `t-${randomUUID()}`;
    const r = await run([y1(ext)]);
    expect(r).toMatchObject({ created: 1, existing: 0, exam_id: null });
    const q = (await db.query<{ status: string; i18n: { ru: { stem_md: string } }; block_id: number; primary_topic_id: number }>('select status, i18n, block_id, primary_topic_id from public.questions where external_id = $1', [ext])).rows[0]!;
    expect(q).toMatchObject({ status: 'draft', block_id: 1, primary_topic_id: 3 });
    expect(q.i18n.ru.stem_md).toBe('Вопрос');
    expect((await db.query('select * from public.question_keys where question_id = $1', [r.question_ids[0]])).rows[0]).toMatchObject({ key_json: { correct: 'B' } });
    expect((await db.query('select topic_id from public.question_topics where question_id = $1', [r.question_ids[0]])).rows).toEqual([{ topic_id: 4 }]);
  });

  it('external_id bo\'yicha idempotent: qayta yuklash dublikat yaratmaydi', async () => {
    const ext = `t-${randomUUID()}`;
    const first = await run([y1(ext)]);
    const second = await run([y1(ext)]);
    expect(second).toMatchObject({ created: 0, existing: 1 });
    expect(second.question_ids).toEqual(first.question_ids);
  });

  it('xatoda hammasi bekor qilinadi (tranzaksiya)', async () => {
    const good = `t-${randomUUID()}`;
    await expect(run([y1(good), y1(`t-${randomUUID()}`, 'noma\'lum')])).rejects.toThrow(/noma'lum blok/);
    expect((await db.query('select count(*)::int as n from public.questions where external_id = $1', [good])).rows[0]).toEqual({ n: 0 });
  });

  it('mockni 45 ta pozitsiya bilan yaratadi va publish_exam muzlatadi', async () => {
    // blueprint: sonlar 2 y1, algebra 11, tenglama 6, funksiyalar 2, analiz 2, geometriya 7, toplam 2; y2 geometriya 3; o: tenglama 2, funksiyalar 1, analiz 2, geometriya 4, toplam 1
    const plan: [string, number, string, number][] = [
      ['sonlar', 2, 'y1', 3], ['algebra', 11, 'y1', 13], ['tenglama', 6, 'y1', 30], ['funksiyalar', 2, 'y1', 45], ['analiz', 2, 'y1', 60], ['geometriya', 7, 'y1', 70], ['toplam', 2, 'y1', 96],
      ['geometriya', 3, 'y2', 70],
      ['tenglama', 2, 'o', 30], ['funksiyalar', 1, 'o', 45], ['analiz', 2, 'o', 60], ['geometriya', 4, 'o', 70], ['toplam', 1, 'o', 96],
    ];
    const tag = randomUUID().slice(0, 8);
    const questions: unknown[] = [];
    for (const [block, n, type, topic] of plan) {
      for (let i = 0; i < n; i++) {
        const base = { external_id: `e-${tag}-${questions.length}`, block, topic, difficulty: 'L1', stem_md: 'Savol', solution_md: 'Yechim' };
        questions.push(
          type === 'y1'
            ? { ...base, type, payload: { options: { A: '1', B: '2', C: '3', D: '4' } }, key: { correct: 'A' } }
            : type === 'y2'
              ? { ...base, type, payload: { options: { A: 'a', B: 'b' }, items: [{ id: '1', text_md: 'x' }] }, key: { pairs: { '1': 'A' } } }
              : { ...base, type, payload: { parts: { a: { prompt_md: 'q' } } }, key: { a: ['1'] } },
        );
      }
    }
    const r = await run(questions, { title: `Test ${tag}`, code: `T${tag}`, sort: 3 });
    expect(r.question_ids).toHaveLength(45);
    expect(r.exam_id).not.toBeNull();

    const exam = (await db.query<{ status: string; code: string; sort: number }>('select status, code, sort from public.exams where id = $1', [r.exam_id])).rows[0]!;
    expect(exam).toMatchObject({ status: 'draft', code: `T${tag}`, sort: 3 });
    const sections = (await db.query<{ position: number; section: string }>('select position, section from public.exam_items where exam_id = $1 order by position', [r.exam_id])).rows;
    expect(sections.map((s) => s.section)).toEqual([...Array(32).fill('y1'), ...Array(3).fill('y2'), ...Array(10).fill('o')]);

    // nashr: qoralama savollar muzlatiladi
    await db.query('select public.publish_exam($1)', [r.exam_id]);
    expect((await db.query('select count(*)::int as n from public.questions where id = any($1) and status = $2', [r.question_ids, 'published'])).rows[0]).toEqual({ n: 45 });
  });

  it('talaba va anon chaqira olmaydi; staff (RLS orqali emas, _assert_staff) o\'tkaza olmaydi — faqat service_role', async () => {
    const student = await newUser(db);
    const editor = await newUser(db, 'editor');
    await as(db, 'authenticated', student, async () => {
      await expect(db.query('select public.import_questions($1::jsonb)', ['[]'])).rejects.toThrow(/permission denied/);
    });
    await as(db, 'authenticated', editor, async () => {
      await expect(db.query('select public.import_questions($1::jsonb)', ['[]'])).rejects.toThrow(/permission denied/);
    });
    await as(db, 'anon', null, async () => {
      await expect(db.query('select public.import_questions($1::jsonb)', ['[]'])).rejects.toThrow(/permission denied/);
    });
    await expect(run([])).resolves.toMatchObject({ created: 0 });
  });
});
