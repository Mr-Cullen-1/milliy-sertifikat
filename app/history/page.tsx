import Link from 'next/link';
import { z } from 'zod';
import { ScoreChart } from '@/components/score-chart';
import { PageShell } from '@/components/page-shell';
import { EmptyState, PageHero } from '@/components/page-hero';
import { buttonClass } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { summarize, topicStatSchema, weakTopics } from '@/lib/exam/stats';
import { formatScore } from '@/lib/format';
import { blockCodeOf } from '@/lib/i18n/blocks';
import { getI18n } from '@/lib/i18n/server';
import { topicName } from '@/lib/i18n/topics';
import { requireParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';

const MIN_TOPIC_QUESTIONS = 2;

export default async function HistoryPage() {
  const [{ t, lang }] = await Promise.all([getI18n(), requireParticipant('/history')]);
  const supabase = await createClient();

  const [attempts, exams, topics, stats] = await Promise.all([
    supabase
      .from('attempts')
      .select('id, exam_id, scaled_score, level, submitted_at')
      .eq('status', 'submitted')
      .not('scaled_score', 'is', null)
      .order('submitted_at', { ascending: true }),
    supabase.from('exams').select('id, title'),
    supabase.from('topics').select('id, name_uz'),
    supabase.rpc('get_my_topic_stats'),
  ]);
  for (const r of [attempts, exams, topics, stats]) if (r.error) throw new Error(`history: ${r.error.message}`);

  const title = new Map((exams.data ?? []).map((e) => [e.id, e.title]));
  const uzName = new Map((topics.data ?? []).map((x) => [x.id, x.name_uz]));
  const rows = (attempts.data ?? []).map((a) => ({
    id: a.id,
    exam: title.get(a.exam_id) ?? t('exams.fallbackTitle'),
    score: a.scaled_score ?? 0,
    level: a.level,
    at: a.submitted_at ? new Date(a.submitted_at) : null,
  }));
  const summary = summarize(rows.map((r) => r.score));
  const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString(lang === 'kaa' ? 'uz-UZ' : lang === 'en' ? 'en-GB' : lang === 'ru' ? 'ru-RU' : 'uz-UZ') : '—');
  const chartPoints = rows.slice(-12).map((r) => ({
    id: r.id,
    label: r.at ? `${r.at.getDate()}.${String(r.at.getMonth() + 1).padStart(2, '0')}` : '',
    score: r.score,
  }));
  const weak = weakTopics(z.array(topicStatSchema).parse(stats.data ?? []), {
    minTotal: MIN_TOPIC_QUESTIONS,
  });

  return (
    <PageShell active="history">
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:gap-6">
        <PageHero art="chart">
          <Chip>{t('common.appName')}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">{t('history.title')}</h1>
        </PageHero>

        {rows.length === 0 ? (
          <EmptyState art="mascot-checklist">
            <p className="text-[19px] font-semibold text-muted">{t('history.empty')}</p>
            <Link href="/exams" className={buttonClass('primary')}>
              {t('history.startFirst')}
            </Link>
          </EmptyState>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-3 sm:gap-5" aria-label={t('history.title')}>
              <Stat label={t('history.attempts')} value={String(summary.attempts)} />
              <Stat label={t('history.best')} value={`≈ ${formatScore(summary.best ?? 0, lang)}`} />
              <Stat label={t('history.average')} value={`≈ ${formatScore(summary.average ?? 0, lang)}`} />
            </section>

            <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
              <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
                <section className="flex flex-col gap-3 rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-4 shadow-card sm:p-5">
                  <h2 className="font-heading text-[22px] font-semibold text-ink">{t('history.chart')}</h2>
                  <ScoreChart points={chartPoints} ariaLabel={t('history.chartAria')} lang={lang} />
                </section>

                <section className="flex flex-col gap-3" aria-label={t('history.title')}>
                  <div className="overflow-x-auto rounded-3xl border-2 border-b-[5px] border-line-strong bg-white shadow-card">
                    <table className="w-full min-w-[460px] border-collapse text-left text-[16px]">
                      <thead className="bg-surface text-[14px] font-extrabold text-muted">
                        <tr>
                          <th className="px-3 py-2.5">{t('history.date')}</th>
                          <th className="px-3 py-2.5">{t('history.exam')}</th>
                          <th className="px-3 py-2.5">{t('history.score')}</th>
                          <th className="px-3 py-2.5">{t('history.level')}</th>
                        </tr>
                      </thead>
                      <tbody className="font-bold text-ink">
                        {[...rows].reverse().map((r) => (
                          <tr key={r.id} className="border-t-2 border-line">
                            <td className="px-3 py-2.5">{fmtDate(r.at)}</td>
                            <td className="px-3 py-2.5">
                              <Link href={`/attempts/${r.id}/result`} className="text-accent underline underline-offset-4">
                                {r.exam}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5">≈ {formatScore(r.score, lang)}</td>
                            <td className="px-3 py-2.5">{r.level ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <section
                className="flex min-w-0 flex-col gap-3 rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-4 shadow-card sm:p-5"
                aria-label={t('history.weakTitle')}
              >
                <h2 className="font-heading text-[22px] font-semibold text-ink">{t('history.weakTitle')}</h2>
                <p className="text-[16px] font-semibold text-muted">{t('history.weakLead', { n: MIN_TOPIC_QUESTIONS })}</p>
                {weak.length === 0 ? (
                  <p className="text-[17px] font-bold text-muted">{t('history.weakNone')}</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {weak.map((w) => {
                      const code = blockCodeOf(w.block_id);
                      return (
                        <li key={w.topic_id} className="flex flex-col gap-2 rounded-2xl border-2 border-line bg-surface px-4 py-3.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                            <span className="text-[17px] font-extrabold text-ink">{topicName(w.topic_id, lang, uzName.get(w.topic_id))}</span>
                            <span className="text-[15px] font-bold text-muted">
                              {t('history.accuracy', {
                                correct: w.correct,
                                total: w.total,
                                pct: w.pct,
                              })}
                            </span>
                          </div>
                          {code && <span className="text-[14px] font-bold text-muted">{t(`blocks.${code}`)}</span>}
                          <div className="h-2.5 overflow-hidden rounded-full bg-track" role="img" aria-label={`${w.pct}%`}>
                            <div className="h-full rounded-full bg-brand" style={{ width: `${w.pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Link href="/mistakes" className={buttonClass('secondary', 'w-fit')}>
                  {t('history.goMistakes')}
                </Link>
              </section>
            </div>
          </>
        )}
      </main>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border-2 border-b-[5px] border-line-strong bg-white px-4 py-3.5 shadow-card">
      <span className="text-[14px] font-extrabold text-muted">{label}</span>
      <span className="text-[28px] font-black text-ink">{value}</span>
    </div>
  );
}
