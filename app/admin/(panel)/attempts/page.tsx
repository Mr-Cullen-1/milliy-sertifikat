import { Badge, Card, fmtDateTime, PageTitle, Pager, pageParam, strParam, Table } from '@/components/admin/ui';
import { attemptsPageSchema, overviewSchema, PAGE_SIZE } from '@/lib/admin/schemas';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { BlockSkeleton } from '@/components/page-skeleton';

async function AdminAttemptsPageContent({ searchParams }: PageProps<'/admin/attempts'>) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const exam = strParam(sp.exam);
  const status = strParam(sp.status);
  const examId = exam && /^[0-9a-f-]{36}$/i.test(exam) ? exam : undefined;
  const st = status === 'submitted' || status === 'in_progress' ? status : undefined;

  const supabase = await createClient();
  const [res, ov] = await Promise.all([
    supabase.rpc('admin_attempts', { p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE, p_exam: examId, p_status: st }),
    supabase.rpc('admin_overview'),
  ]);
  if (res.error) throw new Error(`admin_attempts: ${res.error.message}`);
  if (ov.error) throw new Error(`admin_overview: ${ov.error.message}`);
  const data = attemptsPageSchema.parse(res.data);
  const exams = overviewSchema.parse(ov.data).exams;

  const sel = 'rounded-xl border-2 border-line bg-white px-2.5 py-1.5 text-[14px] font-bold text-ink';
  const mins = (a: { started_at: string; submitted_at: string | null }) =>
    a.submitted_at ? `${Math.round((Date.parse(a.submitted_at) - Date.parse(a.started_at)) / 60000)} daq` : '—';

  return (
    <>
      <PageTitle title="Natijalar (urinishlar)" />
      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[13px] font-extrabold text-muted">
            Variant
            <select name="exam" defaultValue={examId ?? ''} className={sel}>
              <option value="">Hammasi</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code ?? e.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-extrabold text-muted">
            Holat
            <select name="status" defaultValue={st ?? ''} className={sel}>
              <option value="">Hammasi</option>
              <option value="submitted">Topshirgan</option>
              <option value="in_progress">Jarayonda</option>
            </select>
          </label>
          <button type="submit" className="rounded-xl border-2 border-b-4 border-brand-edge bg-brand px-4 py-1.5 text-[14px] font-extrabold text-white">
            Filtrlash
          </button>
        </form>
      </Card>

      <Pager basePath="/admin/attempts" params={{ exam: examId, status: st }} page={page} total={data.total} pageSize={PAGE_SIZE} />
      <Table
        head={['Ishtirokchi', 'Telefon', 'Sinf', 'Variant', 'Holat', 'Xom/max', 'Ball', 'Daraja', 'Sarflangan', 'Tab', 'Sabab', 'Boshlangan']}
        empty={data.rows.length === 0 ? "Urinish topilmadi" : undefined}
      >
        {data.rows.map((a) => (
          <tr key={a.id}>
            <td>{a.name || '—'}</td>
            <td className="whitespace-nowrap">{a.phone ?? '—'}</td>
            <td>{a.grade ?? '—'}</td>
            <td>{a.exam_code ?? a.exam_title}</td>
            <td>
              <Badge tone={a.status === 'submitted' ? 'green' : 'purple'}>{a.status === 'submitted' ? 'Topshirgan' : 'Jarayonda'}</Badge>
            </td>
            <td>{a.raw_score === null ? '—' : `${a.raw_score}/${a.max_raw}`}</td>
            <td>{a.scaled_score ?? '—'}</td>
            <td>{a.level ?? '—'}</td>
            <td>{mins(a)}</td>
            <td className={a.tab_switches > 5 ? 'text-danger' : ''}>{a.tab_switches}</td>
            <td>{a.submit_reason === 'timeout' ? 'vaqt tugadi' : a.submit_reason === 'user' ? 'o\'zi' : '—'}</td>
            <td className="whitespace-nowrap">{fmtDateTime(a.started_at)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

// Kontent URL ma'lumotiga (params/searchParams) bog'liq: Suspense ichida o'qiladi, qobiq esa darrov chiqadi.
export default function AdminAttemptsPage(props: Parameters<typeof AdminAttemptsPageContent>[0]) {
  return (
    <Suspense fallback={<BlockSkeleton />}>
      <AdminAttemptsPageContent {...props} />
    </Suspense>
  );
}
