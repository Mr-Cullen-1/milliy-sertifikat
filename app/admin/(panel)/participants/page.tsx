import { Card, fmtDateTime, PageTitle, Pager, pageParam, strParam, Table } from '@/components/admin/ui';
import { PAGE_SIZE, participantsPageSchema } from '@/lib/admin/schemas';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { BlockSkeleton } from '@/components/page-skeleton';

async function AdminParticipantsPageContent({ searchParams }: PageProps<'/admin/participants'>) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const q = strParam(sp.q)?.slice(0, 60);

  const supabase = await createClient();
  const { data: raw, error } = await supabase.rpc('admin_participants', { p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE, p_search: q });
  if (error) throw new Error(`admin_participants: ${error.message}`);
  const data = participantsPageSchema.parse(raw);

  return (
    <>
      <PageTitle title="Ishtirokchilar" />
      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[13px] font-extrabold text-muted">
            Ism yoki telefon
            <input name="q" defaultValue={q ?? ''} className="rounded-xl border-2 border-line bg-white px-2.5 py-1.5 text-[14px] font-bold text-ink" />
          </label>
          <button type="submit" className="rounded-xl border-2 border-b-4 border-brand-edge bg-brand px-4 py-1.5 text-[14px] font-extrabold text-white">
            Qidirish
          </button>
        </form>
      </Card>
      <Pager basePath="/admin/participants" params={{ q }} page={page} total={data.total} pageSize={PAGE_SIZE} />
      <Table head={['Ism familiya', 'Telefon', 'Sinf', 'Til', 'Urinishlar', 'Eng yaxshi ball', 'Oxirgi urinish', "Ro'yxatdan o'tgan", 'Rozilik']} empty={data.rows.length === 0 ? 'Topilmadi' : undefined}>
        {data.rows.map((p) => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td className="whitespace-nowrap">{p.phone ?? '—'}</td>
            <td>{p.grade ?? '—'}</td>
            <td>{p.lang ?? '—'}</td>
            <td>{p.attempts}</td>
            <td>{p.best_scaled ?? '—'}</td>
            <td className="whitespace-nowrap">{fmtDateTime(p.last_attempt_at)}</td>
            <td className="whitespace-nowrap">{fmtDateTime(p.created_at)}</td>
            <td>{p.consent_at ? 'ha' : "yo'q"}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

// Kontent URL ma'lumotiga (params/searchParams) bog'liq: Suspense ichida o'qiladi, qobiq esa darrov chiqadi.
export default function AdminParticipantsPage(props: Parameters<typeof AdminParticipantsPageContent>[0]) {
  return (
    <Suspense fallback={<BlockSkeleton />}>
      <AdminParticipantsPageContent {...props} />
    </Suspense>
  );
}
