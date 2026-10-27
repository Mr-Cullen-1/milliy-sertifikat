import { describe, expect, it } from 'vitest';
import { createDb } from './helpers';

const PRIVS = ['select', 'insert', 'update', 'delete'] as const;

const READ = ['audit_log', 'blocks', 'topics', 'exam_formats', 'profiles', 'exams', 'exam_items', 'attempts', 'answers', 'questions', 'question_topics', 'question_keys'];
const WRITE = ['questions', 'question_topics', 'question_keys', 'exams', 'exam_items', 'exam_formats'];

const expectedFor = (role: string, table: string, priv: (typeof PRIVS)[number]): boolean => {
  if (role === 'service_role') return true;
  if (role === 'anon') return false;
  if (priv === 'select') return READ.includes(table);
  if (priv === 'update' && table === 'profiles') return false; // faqat name ustuni (ustun darajasida)
  return WRITE.includes(table);
};

// Dashboard sozlamasidan qat'i nazar (jadvallar avtomatik ochilgan yoki yo'q) huquqlar bir xil bo'lishi shart.
describe.each([false, true])('jadval huquqlari (exposeTables=%s)', (exposeTables) => {
  it('anon hech narsa, authenticated faqat kerakli, service_role hammasi', async () => {
    const db = await createDb({ exposeTables });
    const { rows: tables } = await db.query<{ tablename: string }>(`select tablename from pg_tables where schemaname = 'public'`);
    expect(tables.length).toBeGreaterThanOrEqual(13);

    const mismatches: string[] = [];
    for (const { tablename } of tables) {
      for (const role of ['anon', 'authenticated', 'service_role']) {
        for (const priv of PRIVS) {
          const { rows } = await db.query<{ ok: boolean }>('select has_table_privilege($1, $2, $3) as ok', [role, `public.${tablename}`, priv]);
          if (rows[0]!.ok !== expectedFor(role, tablename, priv)) mismatches.push(`${role} ${priv} ${tablename}`);
        }
      }
    }
    expect(mismatches).toEqual([]);

    for (const column of ['name', 'phone', 'grade', 'consent_at', 'lang']) {
      const r = await db.query<{ ok: boolean }>(`select has_column_privilege('authenticated', 'public.profiles', '${column}', 'update') as ok`);
      expect(r.rows[0]!.ok, `${column} yangilanishi kerak`).toBe(true);
    }
    const role = await db.query<{ ok: boolean }>(`select has_column_privilege('authenticated', 'public.profiles', 'role', 'update') as ok`);
    expect(role.rows[0]!.ok).toBe(false);
  }, 60_000);
});
