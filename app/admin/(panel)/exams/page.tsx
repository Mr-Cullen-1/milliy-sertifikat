import Link from 'next/link';
import { Badge, EXAM_STATUS, fmtDateTime, PageTitle, Table } from '@/components/admin/ui';
import { overviewSchema } from '@/lib/admin/schemas';
import { requireAdmin } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';
import { ExamActions } from './exam-actions';

export default async function AdminExamsPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_overview');
  if (error) throw new Error(`admin_overview: ${error.message}`);
  const exams = overviewSchema.parse(data).exams;

  return (
    <>
      <PageTitle title="Imtihonlar (variantlar)">
        <Link href="/admin/import" className="text-[15px] font-extrabold text-accent underline underline-offset-4">
          Yangi variant yuklash →
        </Link>
      </PageTitle>
      <p className="text-[15px] leading-6 font-semibold text-muted">
        Faqat <b>Ochiq</b> holatdagi variantlarni talabalar ko&apos;radi. Qoralamani ochishda tizim 45 ta topshiriq, bo&apos;limlar bo&apos;yicha sonlar va kalitlar to&apos;g&apos;riligini tekshiradi.
        Nashrdan keyin savollar o&apos;zgarmas bo&apos;ladi; muammo bo&apos;lsa mockni yoping (arxiv) va yangisini yuklang.
        {admin.role !== 'admin' && <b className="text-brand-ink"> Ochish/yopish faqat admin roli uchun.</b>}
      </p>
      <Table head={['Variant', 'Nomi', 'Holat', 'Topshiriq', 'Urinish', 'Topshirilgan', "O'rtacha", 'Nashr vaqti', admin.role === 'admin' ? 'Amal' : '']}>
        {exams.map((e) => (
          <tr key={e.id}>
            <td className="font-extrabold">{e.code ?? '—'}</td>
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
            <td>{fmtDateTime(e.published_at)}</td>
            <td>{admin.role === 'admin' ? <ExamActions examId={e.id} status={e.status} /> : null}</td>
          </tr>
        ))}
      </Table>
      {exams.length === 0 && <p className="text-[16px] font-bold text-muted">Hali mock yo&apos;q. Savollarni JSON orqali yuklang.</p>}
    </>
  );
}
