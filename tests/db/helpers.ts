import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AttemptResult, CloseResult, ExamStore, ScoringData } from '../../lib/exam/finalize';

// Supabase muhitini taqlid qiluvchi minimal stub: rollar, auth sxemasi, default huquqlar.
const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, is_anonymous boolean not null default false,
  created_at timestamptz not null default now(), raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

// "Automatically expose new tables" yoqilgan bo'lsa Supabase yangi jadvallarga shu huquqlarni beradi.
const EXPOSE_NEW_TABLES = `
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`;

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

/** exposeTables=false (standart): dashboard'da "Automatically expose new tables" o'chirilgan holat. */
export async function createDb(opts: { exposeTables?: boolean } = {}): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  if (opts.exposeTables) await db.exec(EXPOSE_NEW_TABLES);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  }
  return db;
}

export type Role = 'anon' | 'authenticated' | 'service_role';

/** fn davomida berilgan rol va auth.uid() bilan ishlaydi; keyin superuserga qaytadi. */
export async function as<T>(db: PGlite, role: Role, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

/** complete=false: ism bor, telefon/sinf yo'q (ro'yxatdan o'tish tugallanmagan ishtirokchi). */
export async function newUser(
  db: PGlite,
  role: 'student' | 'editor' | 'admin' = 'student',
  opts: { complete?: boolean } = {},
): Promise<string> {
  const id = randomUUID();
  await db.query('insert into auth.users (id, raw_user_meta_data) values ($1, $2)', [id, JSON.stringify({ name: 'Test' })]);
  await db.query('update public.profiles set role = $2 where id = $1', [id, role]);
  if (opts.complete !== false) {
    await db.query(`update public.profiles set phone = '+998901234567', grade = '11', consent_at = now() where id = $1`, [id]);
  }
  return id;
}

/** buildExam yaratgan savollarning kalitlari va ularga mos to'g'ri javoblar. */
const KEYS = {
  y1: { correct: 'A' },
  y2: { pairs: { '1': 'A', '2': 'B', '3': 'C' } },
  o: { a: ['3/4', '0.75'], b: ['-2'] },
} as const;

export const CORRECT_ANSWERS = {
  y1: 'A',
  y2: { '1': 'A', '2': 'B', '3': 'C' },
  o: { a: '0,75', b: '−2' },
} as const;

/** Pozitsiya (1..45) bo'yicha savol turi: 1–32 y1, 33–35 y2, 36–45 o. */
export const typeAt = (position: number): 'y1' | 'y2' | 'o' => (position <= 32 ? 'y1' : position <= 35 ? 'y2' : 'o');

interface FormatSpec {
  sections: { type: 'y1' | 'y2' | 'o'; from: number; to: number }[];
  blueprint: Record<string, Partial<Record<'y1' | 'y2' | 'o', number>>>;
}

export interface BuiltExam {
  examId: string;
  /** position (1..45) bo'yicha question id */
  questionIds: string[];
}

/** Blueprint'ga to'liq mos 45 savollik mock (draft); opts.publish bo'lsa publish_exam chaqiriladi. */
export async function buildExam(db: PGlite, opts: { publish?: boolean; omitLast?: boolean; draftQuestions?: boolean } = {}): Promise<BuiltExam> {
  const { rows: fmts } = await db.query<{ id: string; spec: FormatSpec }>(
    `select id, spec from public.exam_formats where code = 'math-v1'`,
  );
  const fmt = fmts[0]!;
  const { rows: blocks } = await db.query<{ id: number; code: string }>('select id, code from public.blocks order by id');

  const byType: Record<'y1' | 'y2' | 'o', string[]> = { y1: [], y2: [], o: [] };
  for (const b of blocks) {
    const { rows } = await db.query<{ id: number }>('select min(id) as id from public.topics where block_id = $1', [b.id]);
    const topicId = rows[0]!.id;
    for (const type of ['y1', 'y2', 'o'] as const) {
      const n = fmt.spec.blueprint[b.code]?.[type] ?? 0;
      for (let i = 0; i < n; i++) {
        const q = await db.query<{ id: string }>(
          `insert into public.questions (type, block_id, primary_topic_id, stem_md, payload, difficulty, solution_md)
           values ($1, $2, $3, 'Savol $x$', '{}', 'L1', 'Yechim') returning id`,
          [type, b.id, topicId],
        );
        const id = q.rows[0]!.id;
        await db.query('insert into public.question_keys (question_id, key_json) values ($1, $2::jsonb)', [id, JSON.stringify(KEYS[type])]);
        if (!opts.draftQuestions) await db.query(`update public.questions set status = 'published' where id = $1`, [id]);
        byType[type].push(id);
      }
    }
  }

  const ex = await db.query<{ id: string }>(
    `insert into public.exams (title, format_id) values ('Test mock', $1) returning id`,
    [fmt.id],
  );
  const examId = ex.rows[0]!.id;

  const questionIds: string[] = [];
  for (const sec of fmt.spec.sections) {
    for (let pos = sec.from; pos <= sec.to; pos++) {
      const qid = byType[sec.type].shift()!;
      questionIds.push(qid);
      if (opts.omitLast && pos === 45) continue;
      await db.query('insert into public.exam_items (exam_id, position, question_id, section) values ($1, $2, $3, $4)', [
        examId,
        pos,
        qid,
        sec.type,
      ]);
    }
  }

  if (opts.publish) await db.query('select public.publish_exam($1)', [examId]);
  return { examId, questionIds };
}

/** ExamStore'ning PGlite realizatsiyasi — haqiqiy SQL funksiyalari orqali (Supabase adapterining test ekvivalenti). */
export function pgliteStore(db: PGlite): ExamStore {
  return {
    async closeAttempt(attemptId, onlyIfExpired): Promise<CloseResult> {
      const r = await as(db, 'service_role', null, () =>
        db.query<{ r: { status: CloseResult['status']; scored: boolean; server_now: string } }>('select public.close_attempt($1, $2) as r', [attemptId, onlyIfExpired]),
      );
      const { status, scored, server_now } = r.rows[0]!.r;
      return { status, scored, serverNow: server_now };
    },

    async loadScoringData(attemptId): Promise<ScoringData> {
      const { rows } = await db.query<{
        scoring: ScoringData['scoring'];
        question_id: string;
        type: 'y1' | 'y2' | 'o';
        difficulty: 'L1' | 'L2' | 'L3';
        weight: number | null;
        key_json: unknown;
        value_json: unknown;
      }>(
        `select f.scoring, ei.question_id, q.type, q.difficulty, q.weight::float8 as weight, k.key_json, an.value_json
           from public.attempts a
           join public.exams e on e.id = a.exam_id
           join public.exam_formats f on f.id = e.format_id
           join public.exam_items ei on ei.exam_id = a.exam_id
           join public.questions q on q.id = ei.question_id
           left join public.question_keys k on k.question_id = q.id
           left join public.answers an on an.attempt_id = a.id and an.question_id = q.id
          where a.id = $1
          order by ei.position`,
        [attemptId],
      );
      return {
        scoring: rows[0]!.scoring,
        items: rows.map((r) => ({
          item: { questionId: r.question_id, type: r.type, difficulty: r.difficulty, weight: r.weight },
          key: r.key_json,
          answer: r.value_json,
        })),
      };
    },

    async storeScore(attemptId, result: AttemptResult) {
      const r = await as(db, 'service_role', null, () =>
        db.query<{ r: boolean }>('select public.store_attempt_score($1, $2, $3, $4, $5, $6, $7::jsonb) as r', [
          attemptId,
          result.raw,
          result.maxRaw,
          result.scaled,
          result.level,
          result.scoringVersion,
          JSON.stringify(result.results),
        ]),
      );
      return r.rows[0]!.r;
    },
  };
}
