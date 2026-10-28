import Link from 'next/link';
import { Badge, Card, Pager, pageParam, QUESTION_STATUS, strParam, PageTitle, Table } from '@/components/admin/ui';
import { PAGE_SIZE } from '@/lib/admin/schemas';
import { BLOCK_CODES } from '@/config/topics';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { BlockSkeleton } from '@/components/page-skeleton';

const TYPES = ['y1', 'y2', 'o'] as const;
const STATUSES = ['draft', 'review', 'published', 'archived'] as const;
const LEVELS = ['L1', 'L2', 'L3'] as const;

async function AdminQuestionsPageContent({ searchParams }: PageProps<'/admin/questions'>) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const block = strParam(sp.block);
  const type = strParam(sp.type);
  const status = strParam(sp.status);
  const level = strParam(sp.level);
  const q = strParam(sp.q)?.slice(0, 60);

  const supabase = await createClient();
  let query = supabase
    .from('questions')
    .select('id, external_id, type, block_id, primary_topic_id, difficulty, status, created_at, i18n', { count: 'exact' })
    .order('external_id', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const blockIdx = block ? BLOCK_CODES.indexOf(block as (typeof BLOCK_CODES)[number]) : -1;
  if (blockIdx >= 0) query = query.eq('block_id', blockIdx + 1);
  if (type && (TYPES as readonly string[]).includes(type)) query = query.eq('type', type as (typeof TYPES)[number]);
  if (status && (STATUSES as readonly string[]).includes(status)) query = query.eq('status', status as (typeof STATUSES)[number]);
  if (level && (LEVELS as readonly string[]).includes(level)) query = query.eq('difficulty', level as (typeof LEVELS)[number]);
  if (q) query = query.ilike('external_id', `%${q.replace(/[%_]/g, '')}%`);

  const { data, count, error } = await query;
  if (error) throw new Error(`questions: ${error.message}`);

  const select = 'rounded-xl border-2 border-line bg-white px-2.5 py-1.5 text-[14px] font-bold text-ink';

  return (
    <>
      <PageTitle title="Savollar banki" />
      <Card>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="flex flex-col gap-1 text-[13px] font-extrabold text-muted">
            Bo&apos;lim
            <select name="block" defaultValue={block ?? ''} className={select}>
              <option value="">Hammasi</option>
              {BLOCK_CODES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-extrabold text-muted">
            Tur
            <select name="type" defaultValue={type ?? ''} className={select}>
              <option value="">Hammasi</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-extrabold text-muted">
            Qiyinlik
            <select name="level" defaultValue={level ?? ''} className={select}>
              <option value="">Hammasi</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-extrabold text-muted">
            Holat
            <select name="status" defaultValue={status ?? ''} className={select}>
              <option value="">Hammasi</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {QUESTION_STATUS[s]!.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-extrabold text-muted">
            ID qidirish
            <input name="q" defaultValue={q ?? ''} placeholder="gen-A-07" className={select} />
          </label>
          <button type="submit" className="rounded-xl border-2 border-b-4 border-brand-edge bg-brand px-4 py-1.5 text-[14px] font-extrabold text-white">
            Filtrlash
          </button>
        </form>
      </Card>

      <Pager basePath="/admin/questions" params={{ block, type, status, level, q }} page={page} total={count ?? 0} pageSize={PAGE_SIZE} />
      <Table head={['ID', 'Tur', "Bo'lim", 'Mavzu', 'Qiyinlik', 'Holat', 'Tillar']} empty={(data ?? []).length === 0 ? "Savol topilmadi" : undefined}>
        {(data ?? []).map((row) => {
          const langs = ['uz', ...Object.keys((row.i18n ?? {}) as Record<string, unknown>)];
          return (
            <tr key={row.id}>
              <td>
                <Link href={`/admin/questions/${row.id}`} className="text-accent underline underline-offset-4">
                  {row.external_id ?? row.id.slice(0, 8)}
                </Link>
              </td>
              <td>{row.type.toUpperCase()}</td>
              <td>{BLOCK_CODES[row.block_id - 1] ?? row.block_id}</td>
              <td>{row.primary_topic_id}</td>
              <td>{row.difficulty}</td>
              <td>
                <Badge tone={QUESTION_STATUS[row.status]!.tone}>{QUESTION_STATUS[row.status]!.label}</Badge>
              </td>
              <td className="text-[13px] text-muted">{langs.join(' · ')}</td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}

// Kontent URL ma'lumotiga (params/searchParams) bog'liq: Suspense ichida o'qiladi, qobiq esa darrov chiqadi.
export default function AdminQuestionsPage(props: Parameters<typeof AdminQuestionsPageContent>[0]) {
  return (
    <Suspense fallback={<BlockSkeleton />}>
      <AdminQuestionsPageContent {...props} />
    </Suspense>
  );
}
