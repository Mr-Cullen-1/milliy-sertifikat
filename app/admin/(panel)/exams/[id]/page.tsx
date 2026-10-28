import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, EXAM_STATUS, fmtDateTime, PageTitle, Stat, Table } from '@/components/admin/ui';
import { questionStatsSchema } from '@/lib/admin/schemas';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { BlockSkeleton } from '@/components/page-skeleton';

async function AdminExamDetailContent({ params }: PageProps<'/admin/exams/[id]'>) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [exam, items, statsRes, blocks] = await Promise.all([
    supabase.from('exams').select('id, title, code, status, published_at, created_at, exam_formats(duration_min)').eq('id', id).maybeSingle(),
    supabase
      .from('exam_items')
      .select('position, section, question_id, questions(external_id, block_id, primary_topic_id, difficulty, status)')
      .eq('exam_id', id)
      .order('position'),
    supabase.rpc('admin_question_stats', { p_exam: id }),
    supabase.from('blocks').select('id, name_uz'),
  ]);
  if (exam.error) throw new Error(`exams: ${exam.error.message}`);
  if (!exam.data) notFound();
  for (const r of [items, statsRes, blocks]) if (r.error) throw new Error(`exam detail: ${r.error.message}`);

  const stats = new Map(questionStatsSchema.parse(statsRes.data).map((s) => [s.question_id, s]));
  const blockName = new Map((blocks.data ?? []).map((b) => [b.id, b.name_uz]));
  const first = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const e = exam.data;
  const minutes = first(e.exam_formats)?.duration_min ?? 150;
  const st = EXAM_STATUS[e.status]!;

  return (
    <>
      <PageTitle title={`${e.code ? `${e.code} · ` : ''}${e.title}`}>
        <Badge tone={st.tone}>{st.label}</Badge>
      </PageTitle>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Topshiriqlar" value={(items.data ?? []).length} />
        <Stat label="Vaqt" value={`${minutes} daq`} />
        <Stat label="Yaratilgan" value={fmtDateTime(e.created_at)} />
        <Stat label="Nashr vaqti" value={fmtDateTime(e.published_at)} />
      </div>
      <Card title="Topshiriqlar va haqiqiy natijalar">
        <p className="text-[14px] font-semibold text-muted">
          &quot;To&apos;g&apos;ri %&quot; — topshirilgan urinishlar bo&apos;yicha. Kutilganidan keskin farq qilsa (juda oson/qiyin yoki kalit xatosi), savolni tekshiring.
        </p>
        <Table head={['#', 'Tur', "Bo'lim", 'Mavzu', 'Qiyinlik', 'ID', 'Holat', 'Javob', "To'g'ri %"]}>
          {(items.data ?? []).map((it) => {
            const q = first(it.questions);
            const s = stats.get(it.question_id);
            const pct = s && s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : null;
            return (
              <tr key={it.position}>
                <td className="font-extrabold">{it.position}</td>
                <td>{it.section.toUpperCase()}</td>
                <td className="max-w-[220px] truncate">{q ? blockName.get(q.block_id) : '—'}</td>
                <td>{q?.primary_topic_id ?? '—'}</td>
                <td>{q?.difficulty ?? '—'}</td>
                <td>
                  <Link href={`/admin/questions/${it.question_id}`} className="text-accent underline underline-offset-4">
                    {q?.external_id ?? it.question_id.slice(0, 8)}
                  </Link>
                </td>
                <td>{q?.status ?? '—'}</td>
                <td>{s?.answered ?? 0}</td>
                <td>{pct === null ? '—' : `${pct}%`}</td>
              </tr>
            );
          })}
        </Table>
      </Card>
      <Link href={`/admin/attempts?exam=${id}`} className="w-fit text-[15px] font-extrabold text-accent underline underline-offset-4">
        Shu variant urinishlari →
      </Link>
    </>
  );
}

// Kontent URL ma'lumotiga (params/searchParams) bog'liq: Suspense ichida o'qiladi, qobiq esa darrov chiqadi.
export default function AdminExamDetail(props: Parameters<typeof AdminExamDetailContent>[0]) {
  return (
    <Suspense fallback={<BlockSkeleton />}>
      <AdminExamDetailContent {...props} />
    </Suspense>
  );
}
