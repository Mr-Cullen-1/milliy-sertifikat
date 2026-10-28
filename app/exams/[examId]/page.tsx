import { notFound } from 'next/navigation';
import { startAttemptAction } from '@/app/attempts/actions';
import { PageShell } from '@/components/page-shell';
import { PageHero } from '@/components/page-hero';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { getI18n } from '@/lib/i18n/server';
import { requireParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';

export default async function ExamIntroPage({ params }: PageProps<'/exams/[examId]'>) {
  const { examId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(examId)) notFound();
  const [{ t }] = await Promise.all([getI18n(), requireParticipant(`/exams/${examId}`)]);

  const supabase = await createClient();
  const { data: exam, error } = await supabase.from('exams').select('id, title, exam_formats(duration_min)').eq('id', examId).maybeSingle();
  if (error) throw new Error(`exams: ${error.message}`);
  if (!exam) notFound();

  const formats = exam.exam_formats;
  const minutes = (Array.isArray(formats) ? formats[0] : formats)?.duration_min ?? 150;
  const rules = [t('intro.rule1', { minutes }), t('intro.rule2'), t('intro.rule3'), t('intro.rule4'), t('intro.rule5'), t('intro.rule6')];

  return (
    <PageShell active="exams">
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center gap-8 px-4 py-10">
        <PageHero art="mascot-checklist" artWidth={118}>
          <Chip tone="brand">{t('intro.chip')}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">{exam.title}</h1>
        </PageHero>
        <ol className="flex flex-col gap-3">
          {rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 rounded-2xl border-2 border-line bg-white px-4 py-3.5 shadow-card">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-brand text-[16px] font-black text-white">{i + 1}</span>
              <span className="text-[17px] leading-[23px] font-bold text-ink">{rule}</span>
            </li>
          ))}
        </ol>
        <form action={startAttemptAction.bind(null, examId)}>
          <Button type="submit" className="w-full">
            {t('intro.start')}
          </Button>
        </form>
      </main>
    </PageShell>
  );
}
