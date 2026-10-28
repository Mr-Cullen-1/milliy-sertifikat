import Link from 'next/link';
import { Badge, Card, EXAM_STATUS, fmtDateTime, PageTitle, Stat, Table } from '@/components/admin/ui';
import { attemptsPageSchema, overviewSchema } from '@/lib/admin/schemas';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { BlockSkeleton } from '@/components/page-skeleton';

async function AdminDashboardContent({ searchParams }: PageProps<'/admin'>) {
  const supabase = await createClient();
  const [params, overviewRes, recentRes] = await Promise.all([
    searchParams,
    supabase.rpc('admin_overview'),
    supabase.rpc('admin_attempts', { p_limit: 8, p_offset: 0 }),
  ]);
  if (overviewRes.error) throw new Error(`admin_overview: ${overviewRes.error.message}`);
  if (recentRes.error) throw new Error(`admin_attempts: ${recentRes.error.message}`);

  const o = overviewSchema.parse(overviewRes.data);
  const recent = attemptsPageSchema.parse(recentRes.data);
  const levelOrder = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'none'];
  const maxLevel = Math.max(1, ...Object.values(o.levels));

  return (
    <>
      {params.denied && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-[15px] font-bold text-danger">Bu amal faqat admin roli uchun.</p>}
      <PageTitle title="Boshqaruv paneli" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Ishtirokchilar" value={o.participants} />
        <Stat label="Hozir imtihonda" value={o.attempts_active} />
        <Stat label="Topshirilgan" value={o.attempts_submitted} hint={`oxirgi 24 soatda boshlangan: ${o.attempts_24h}`} />
        <Stat label="O'rtacha ball (taxminiy)" value={o.avg_scaled === null ? '—' : o.avg_scaled} hint="75 ballik shkala" />
        <Stat label="Savollar" value={o.questions.total} hint={`nashr etilgan ${o.questions.published} · qoralama ${o.questions.draft}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Imtihonlar (variantlar)">
          <Table head={['Variant', 'Nomi', 'Holat', 'Topshiriq', 'Urinish', 'Topshirilgan', "O'rtacha"]} empty={o.exams.length === 0 ? "Hali mock yo'q" : undefined}>
            {o.exams.map((e) => (
              <tr key={e.id}>
                <td>{e.code ?? '—'}</td>
                <td>
                  <Link href={`/admin/exams/${e.id}`} className="text-accent underline underline-offset-4">
                    {e.title}
                  </Link>
                </td>
                <td>
                  <Badge tone={EXAM_STATUS[e.status]!.tone}>{EXAM_STATUS[e.status]!.label}</Badge>
                </td>
                <td>{e.items}</td>
                <td>{e.attempts}</td>
                <td>{e.submitted}</td>
                <td>{e.avg_scaled ?? '—'}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Darajalar taqsimoti">
          {Object.keys(o.levels).length === 0 ? (
            <p className="text-[15px] font-bold text-muted">Hali natija yo&apos;q</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {levelOrder
                .filter((l) => l in o.levels)
                .map((l) => (
                  <li key={l} className="flex items-center gap-3 text-[15px] font-bold text-ink">
                    <span className="w-12 shrink-0 font-extrabold">{l === 'none' ? '<46' : l}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-track">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${((o.levels[l] ?? 0) / maxLevel) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right">{o.levels[l]}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Oxirgi urinishlar">
        <Table head={['Ishtirokchi', 'Sinf', 'Variant', 'Holat', 'Ball', 'Daraja', 'Tab', 'Boshlangan']} empty={recent.rows.length === 0 ? "Hali urinish yo'q" : undefined}>
          {recent.rows.map((a) => (
            <tr key={a.id}>
              <td>{a.name || '—'}</td>
              <td>{a.grade ?? '—'}</td>
              <td>{a.exam_code ?? a.exam_title}</td>
              <td>
                <Badge tone={a.status === 'submitted' ? 'green' : 'purple'}>{a.status === 'submitted' ? 'Topshirgan' : 'Jarayonda'}</Badge>
              </td>
              <td>{a.scaled_score ?? '—'}</td>
              <td>{a.level ?? '—'}</td>
              <td>{a.tab_switches}</td>
              <td>{fmtDateTime(a.started_at)}</td>
            </tr>
          ))}
        </Table>
        <Link href="/admin/attempts" className="w-fit text-[15px] font-extrabold text-accent underline underline-offset-4">
          Hammasi →
        </Link>
      </Card>
    </>
  );
}

// Kontent URL ma'lumotiga (params/searchParams) bog'liq: Suspense ichida o'qiladi, qobiq esa darrov chiqadi.
export default function AdminDashboard(props: Parameters<typeof AdminDashboardContent>[0]) {
  return (
    <Suspense fallback={<BlockSkeleton />}>
      <AdminDashboardContent {...props} />
    </Suspense>
  );
}
