import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { PageHero } from '@/components/page-hero';
import { buttonClass } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { formatScore } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { requireParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';

const durationOf = (formats: { duration_min: number } | { duration_min: number }[] | null) => (Array.isArray(formats) ? formats[0] : formats)?.duration_min;

export default async function ExamsPage() {
  const [{ t, lang }] = await Promise.all([getI18n(), requireParticipant('/exams')]);
  const supabase = await createClient();

  const [exams, active, done] = await Promise.all([
    supabase.from('exams').select('id, title, exam_formats(duration_min)').eq('status', 'published').order('sort').order('published_at', { ascending: false }),
    supabase.from('attempts').select('id, exam_id').eq('status', 'in_progress'),
    supabase.from('attempts').select('id, exam_id, scaled_score, level, submitted_at').eq('status', 'submitted').order('submitted_at', { ascending: false }).limit(10),
  ]);
  for (const r of [exams, active, done]) if (r.error) throw new Error(`exams: ${r.error.message}`);

  const titles = new Map((exams.data ?? []).map((e) => [e.id, e.title]));
  const activeByExam = new Map((active.data ?? []).map((a) => [a.exam_id, a.id]));

  return (
    <PageShell active="exams">
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:gap-6">
        <PageHero art="mascot-pencil">
          <Chip>{t('common.appName')}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">{t('exams.title')}</h1>
        </PageHero>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5" aria-label={t('exams.title')}>
          {(exams.data ?? []).length === 0 && <p className="text-[19px] font-semibold text-muted md:col-span-2 lg:col-span-3">{t('exams.none')}</p>}
          {(exams.data ?? []).map((exam) => {
            const attemptId = activeByExam.get(exam.id);
            return (
              <article key={exam.id} className="flex flex-col justify-between gap-4 rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-5 shadow-card">
                <div className="flex flex-col gap-1">
                  <h2 className="font-heading text-[22px] font-semibold text-ink">{exam.title}</h2>
                  <p className="text-[16px] font-bold text-muted">
                    {t('exams.meta', {
                      minutes: durationOf(exam.exam_formats) ?? 150,
                    })}
                  </p>
                </div>
                {attemptId ? (
                  <Link href={`/attempts/${attemptId}`} className={buttonClass('primary')}>
                    {t('exams.resume')}
                  </Link>
                ) : (
                  <Link href={`/exams/${exam.id}`} className={buttonClass('primary')}>
                    {t('exams.start')}
                  </Link>
                )}
              </article>
            );
          })}
        </section>

        {(done.data ?? []).length > 0 && (
          <section className="flex flex-col gap-3" aria-label={t('exams.previous')}>
            <h2 className="font-heading text-[22px] font-semibold text-ink">{t('exams.previous')}</h2>
            <ul className="grid gap-3 md:grid-cols-2 lg:gap-4">
              {(done.data ?? []).map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/attempts/${a.id}/result`}
                    className="flex items-center justify-between gap-4 rounded-2xl border-2 border-line bg-white px-4 py-3.5 shadow-card hover:bg-surface"
                  >
                    <span className="min-w-0 truncate text-[18px] font-bold text-ink">{titles.get(a.exam_id) ?? t('exams.fallbackTitle')}</span>
                    <span className="shrink-0 text-[18px] font-extrabold text-ink">
                      {a.scaled_score === null ? '—' : `≈ ${formatScore(a.scaled_score, lang)}`}
                      {a.level && <span className="ml-2 rounded-full bg-success-soft px-2.5 py-0.5 text-[15px] text-success-ink">{a.level}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/history" className="w-fit text-[17px] font-extrabold text-accent underline underline-offset-4">
              {t('nav.history')}
            </Link>
          </section>
        )}
      </main>
    </PageShell>
  );
}
