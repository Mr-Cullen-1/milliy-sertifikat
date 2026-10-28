import { notFound } from 'next/navigation';
import { startAttemptAction } from '@/app/attempts/actions';
import { Art } from '@/components/art';
import { PageShell } from '@/components/page-shell';
import { PageHero } from '@/components/page-hero';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { getI18n } from '@/lib/i18n/server';
import { requireParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/page-skeleton';

async function ExamIntroPageContent({ params }: PageProps<'/exams/[examId]'>) {
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
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:gap-6">
        <PageHero art="mascot-checklist">
          <Chip tone="brand">{t('intro.chip')}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">{exam.title}</h1>
        </PageHero>

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
          <ol className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border-2 border-b-[5px] border-line-strong bg-white px-4 py-4 shadow-card">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-brand text-[16px] font-black text-white">{i + 1}</span>
                <span className="text-[17px] leading-[23px] font-bold text-ink">{rule}</span>
              </li>
            ))}
          </ol>

          <aside className="flex flex-col items-center gap-4 rounded-3xl border-2 border-b-[5px] border-line-strong bg-linear-to-b from-white to-brand-tint p-6 text-center shadow-card lg:sticky lg:top-24">
            <Art name="trophy" width={104} />
            <div className="flex flex-col gap-1">
              <p className="font-heading text-[22px] font-semibold text-ink">{exam.title}</p>
              <p className="text-[16px] font-bold text-muted">{t('exams.meta', { minutes })}</p>
            </div>
            <form action={startAttemptAction.bind(null, examId)} className="w-full">
              <Button type="submit" className="w-full">
                {t('intro.start')}
              </Button>
            </form>
          </aside>
        </div>
      </main>
    </PageShell>
  );
}

// Kontent URL ma'lumotiga (params/searchParams) bog'liq: Suspense ichida o'qiladi, qobiq esa darrov chiqadi.
export default function ExamIntroPage(props: Parameters<typeof ExamIntroPageContent>[0]) {
  return (
    <Suspense fallback={<PageSkeleton active="exams" />}>
      <ExamIntroPageContent {...props} />
    </Suspense>
  );
}
