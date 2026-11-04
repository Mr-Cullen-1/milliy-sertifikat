import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { PageHero } from '@/components/page-hero';
import { CrownIcon, ProOpenButton } from '@/components/pro/pro-modal';
import { buttonClass } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { formatScore } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { requireParticipant } from '@/lib/participant.server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const durationOf = (formats: { duration_min: number } | { duration_min: number }[] | null) => (Array.isArray(formats) ? formats[0] : formats)?.duration_min;

export default async function ExamsPage() {
  const [{ t, lang }] = await Promise.all([getI18n(), requireParticipant('/exams')]);
  const supabase = await createClient();

  const [exams, active, done] = await Promise.all([
    supabase
      .from('exams')
      .select('id, title, sort, status, exam_formats(duration_min)')
      .in('status', ['published', 'draft', 'archived'])
      .order('sort')
      .order('published_at', { ascending: false }),
    supabase.from('attempts').select('id, exam_id').eq('status', 'in_progress'),
    supabase.from('attempts').select('id, exam_id, scaled_score, level, submitted_at').eq('status', 'submitted').order('submitted_at', { ascending: false }).limit(10),
  ]);
  // RLS: oddiy ishtirokchiga faqat nashr etilganlar, Pro huquqli ishtirokchiga qoralamalar ham keladi.
  // Qolgan nashr etilmagan variantlar (qoralama/arxiv): faqat nomi va holati bilan, o'chirilgan karta uchun. Savollar va id mijozga chiqarilmaydi.
  const hiddenRes = await createAdminClient().from('exams').select('id, title, status, sort, exam_formats(duration_min)').neq('status', 'published').order('sort');
  const hidden = { ...hiddenRes, data: (hiddenRes.data ?? []).filter((e) => !(exams.data ?? []).some((o) => o.id === e.id)) };
  if (hidden.error) throw new Error(`exams (nashr etilmagan): ${hidden.error.message}`);
  for (const r of [exams, active, done]) if (r.error) throw new Error(`exams: ${r.error.message}`);

  const titles = new Map((exams.data ?? []).map((e) => [e.id, e.title]));
  // Hammasi bitta ro'yxatda, tartib bo'yicha: ochiq variantlar faol, qolganlari o'chirilgan (disabled)
  const cards = [
    ...(exams.data ?? []).map((e) => ({
      kind: 'open' as const,
      key: e.id,
      id: e.id,
      title: e.title,
      sort: e.sort,
      minutes: durationOf(e.exam_formats) ?? 150,
      status: e.status,
    })),
    ...(hidden.data ?? []).map((e, i) => ({
      kind: 'locked' as const,
      key: `locked-${i}`,
      id: null,
      title: e.title,
      sort: e.sort,
      minutes: durationOf(e.exam_formats) ?? 150,
      status: e.status,
    })),
  ].sort((x, y) => (x.sort ?? 0) - (y.sort ?? 0));
  const activeByExam = new Map((active.data ?? []).map((a) => [a.exam_id, a.id]));

  return (
    <PageShell active="exams">
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-5 px-4 py-4 sm:px-6 lg:gap-5">
        <PageHero art="mascot-pencil">
          <Chip>{t('common.appName')}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">{t('exams.title')}</h1>
        </PageHero>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6" aria-label={t('exams.title')}>
          {cards.length === 0 && <p className="text-[19px] font-semibold text-muted md:col-span-2 lg:col-span-3">{t('exams.none')}</p>}
          {cards.map((exam) => {
            const attemptId = exam.id ? activeByExam.get(exam.id) : undefined;
            const locked = exam.kind === 'locked';
            return (
              <article
                key={exam.key}
                className={
                  'flex min-h-[150px] flex-col justify-between gap-4 rounded-3xl border-2 border-b-[5px] p-5 ' +
                  (locked ? 'border-line bg-surface' : 'border-line-strong bg-white shadow-card')
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-2.5">
                    <h2 className={`font-heading text-[24px] leading-8 font-semibold ${locked ? 'text-muted' : 'text-ink'}`}>{exam.title}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-[14px] font-extrabold text-ink-soft">
                      <span className="rounded-full border-2 border-line bg-white px-3 py-1">{t('intro.tasksPill', { n: 45 })}</span>
                      <span className="rounded-full border-2 border-line bg-white px-3 py-1">{t('intro.minutesPill', { minutes: exam.minutes })}</span>
                    </div>
                  </div>
                  {locked && (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-line bg-white text-muted">
                      <LockIcon />
                    </span>
                  )}
                </div>
                {locked ? (
                  <ProOpenButton className={buttonClass('accent', 'w-full')}>
                    <CrownIcon size={20} />
                    {t('pro.cardButton')}
                  </ProOpenButton>
                ) : attemptId ? (
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

/** Qulf belgisi: yopiq (arxiv) va hali ochilmagan (qoralama) variantlar kartasida. */
function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1" fill="currentColor" />
    </svg>
  );
}
