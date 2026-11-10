import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ReviewGrid, type ReviewItem } from '@/components/exam/review-grid';
import { Watermark } from '@/components/exam/watermark';
import { PageShell } from '@/components/page-shell';
import { Art } from '@/components/art';
import { ART } from '@/components/art-data';
import { buttonClass } from '@/components/ui/button';
import { describeAnswer, describeKey } from '@/lib/exam/answer-state';
import { parseItems } from '@/lib/exam/attempt-state';
import { resolveAttempt } from '@/lib/exam/attempt.server';
import { blockBreakdown } from '@/lib/exam/breakdown';
import { formatScore } from '@/lib/format';
import { blockCodeOf } from '@/lib/i18n/blocks';
import { getI18n } from '@/lib/i18n/server';
import { getParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/page-skeleton';

/** Savollar tahlilida Pro obunasiz ochiq savollar soni (qolganlari yopiq, tafsiloti mijozga yuborilmaydi). */
const FREE_REVIEW_COUNT = 5;

async function ResultPageContent({ params, searchParams }: PageProps<'/attempts/[attemptId]/result'>) {
  const { attemptId } = await params;
  const autoReview = (await searchParams).review === '1';
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();

  const resolved = await resolveAttempt(attemptId);
  if (resolved.kind === 'missing') notFound();
  if (resolved.kind === 'running') redirect(`/attempts/${attemptId}`);

  const { t, lang } = await getI18n();

  if (resolved.kind === 'pending') {
    return (
      <PageShell active="exams">
        <main className="mx-auto flex w-full max-w-[920px] flex-1 flex-col gap-3 px-4 py-10">
          <h1 className="font-heading text-[28px] font-semibold text-ink">{t('result.pendingTitle')}</h1>
          <p className="text-[18px] font-semibold text-muted">{t('result.pendingLead')}</p>
        </main>
      </PageShell>
    );
  }

  const { state } = resolved;
  const { attempt } = state;
  const supabase = await createClient();
  const [exam, participant] = await Promise.all([supabase.from('exams').select('title').eq('id', attempt.exam_id).maybeSingle(), getParticipant()]);

  const items = parseItems(state.items);
  const answerOf = new Map(state.answers.map((a) => [a.question_id, a]));
  const rows = blockBreakdown(
    items.map((i) => ({ questionId: i.questionId, blockId: i.blockId })),
    state.answers.map((a) => ({
      questionId: a.question_id,
      isCorrect: a.is_correct,
      score: a.score,
      maxScore: a.max_score,
    })),
  );
  const correctTotal = rows.reduce((s, r) => s + r.correct, 0);
  const scaled = attempt.scaled_score ?? 0;
  const level = attempt.level;
  const blockLabel = (id: number) => {
    const code = blockCodeOf(id);
    return code ? t(`blocks.${code}`) : String(id);
  };
  const reviewItems: ReviewItem[] = items.map((item) => {
    if (!participant?.isPro && item.position > FREE_REVIEW_COUNT) {
      return {
        position: item.position,
        status: 'empty',
        block: blockLabel(item.blockId),
        scoreText: '',
        stemMd: '',
        figure: null,
        given: '',
        partsText: null,
        correct: null,
        solutionMd: null,
        mistakeNoteMd: null,
        locked: true,
      };
    }
    const a = answerOf.get(item.questionId);
    const y2Ids = item.payload.type === 'y2' ? item.payload.data.items.map((i) => i.id) : [];
    const noAnswer = t('answers.none');
    const given = describeAnswer(item.type, a?.value, y2Ids, noAnswer);
    return {
      position: item.position,
      status: a?.is_correct ? 'ok' : given !== noAnswer ? 'wrong' : 'empty',
      block: blockLabel(item.blockId),
      scoreText: `${formatScore(a?.score ?? 0, lang)}/${formatScore(a?.max_score ?? 0, lang)}`,
      stemMd: item.stemMd,
      figure: item.payload.data.figure ?? null,
      given,
      partsText:
        a?.parts && item.type === 'o'
          ? `(a: ${a.parts.a ? t('result.partCorrect') : t('result.partWrong')}, b: ${a.parts.b ? t('result.partCorrect') : t('result.partWrong')})`
          : null,
      correct: describeKey(item.type, item.correctAnswer, y2Ids) || null,
      solutionMd: item.solutionMd || null,
      mistakeNoteMd: item.mistakeNoteMd || null,
    };
  });
  const art = scaled >= 55 ? 'mascot-celebrate' : scaled >= 46 ? 'mascot-checklist' : 'mascot-pencil';
  const artWidth = Math.round((100 * ART[art].w) / ART[art].h);
  const dtmHref = `/dtm?score=${encodeURIComponent(String(scaled))}${level ? `&level=${encodeURIComponent(level)}` : ''}`;

  return (
    <>
      {participant && <Watermark text={`${participant.fullName} · ${participant.phone?.slice(-4) ?? ''}`} />}
      <PageShell active="exams">
        <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:gap-6">
          <section
            aria-label={t('result.overall')}
            className="flex flex-col gap-4 rounded-3xl border-2 border-b-[5px] border-success-line bg-success-soft p-5 shadow-card sm:px-7 sm:py-4 lg:flex-row lg:items-center lg:gap-8"
          >
            <div className="flex min-w-0 flex-col gap-1.5 lg:flex-1">
              <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">
                {exam.data?.title ?? t('exams.fallbackTitle')}
              </h1>
              <p className="text-[17px] leading-6 font-bold text-ink-soft">
                {scaled >= 55 ? t('result.cheerHigh') : scaled >= 46 ? t('result.cheerMid') : t('result.cheerLow')}
              </p>
              <p className="text-[15px] leading-6 font-bold text-muted">
                {t('result.raw', {
                  raw: formatScore(attempt.raw_score ?? 0, lang),
                  max: formatScore(attempt.max_raw ?? 0, lang),
                  correct: correctTotal,
                })}
              </p>
              {attempt.submit_reason === 'timeout' && <p className="text-[15px] leading-6 font-bold text-brand-ink">{t('result.timeout')}</p>}
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t-2 border-success-line pt-3 lg:w-[300px] lg:border-t-0 lg:border-l-2 lg:pt-0 lg:pl-8">
              <h2 className="text-[14px] leading-4 font-extrabold tracking-wider text-muted uppercase">{t('result.levelHint')}</h2>
              <div className="flex items-center gap-4">
                <p className="flex items-end gap-1.5 leading-none">
                  <span className="text-[48px] font-black text-success-ink">≈ {formatScore(scaled, lang)}</span>
                  <span className="pb-1.5 text-[20px] font-extrabold text-muted">/ 75</span>
                </p>
                {level && (
                  <span className="rounded-2xl border-2 border-b-[5px] border-gold-edge bg-gold px-4 py-1.5 text-[26px] leading-none font-black text-white">{level}</span>
                )}
              </div>
              {!level && <p className="text-[15px] leading-5 font-extrabold text-muted">{t('result.noLevel')}</p>}
            </div>

            <Art name={art} width={artWidth} className="hidden shrink-0 drop-shadow-[0_8px_8px_rgba(38,24,110,0.16)] xl:block" />
          </section>

          <div className="flex flex-col gap-5 lg:grid lg:h-[480px] lg:grid-cols-[1fr_1fr] lg:gap-6">
            <section className="relative min-w-0 rounded-3xl border-2 border-b-[5px] border-line-strong bg-white shadow-card" aria-label={t('result.byBlock')}>
              <div className="flex flex-col gap-3 p-4 sm:p-5 lg:absolute lg:inset-0">
                <h2 className="font-heading text-[22px] font-semibold text-ink">{t('result.byBlock')}</h2>
                <ul className="flex min-h-0 flex-col gap-2.5 lg:flex-1 lg:overflow-y-auto lg:pr-2 lg:[scrollbar-color:#cfc9ec_transparent] lg:[scrollbar-width:thin]">
                  {rows.map((r) => {
                    const pct = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
                    return (
                      <li key={r.blockId} className="flex flex-col gap-1.5 rounded-2xl border-2 border-line bg-surface px-4 py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                          <span className="text-[16px] font-extrabold text-ink">{blockLabel(r.blockId)}</span>
                          <span className="text-[14px] font-bold text-muted">
                            {t('result.blockLine', {
                              correct: r.correct,
                              total: r.total,
                              score: formatScore(r.score, lang),
                              max: formatScore(r.maxScore, lang),
                            })}
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-track" role="img" aria-label={`${pct}%`}>
                          <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            <div className="flex min-h-0 min-w-0 flex-col gap-4">
              <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
                <Link href={dtmHref} className={buttonClass('secondary', 'w-full px-2! text-[15px]! whitespace-nowrap', 'sm')}>
                  {t('result.toDtm')}
                </Link>
                <Link href="/mistakes" className={buttonClass('secondary', 'w-full px-2! text-[15px]! whitespace-nowrap', 'sm')}>
                  {t('result.toMistakes')}
                </Link>
                <Link href="/exams" className={buttonClass('primary', 'w-full px-2! text-[15px]! whitespace-nowrap', 'sm')}>
                  {t('result.toExams')}
                </Link>
              </div>
              <section className="flex min-h-0 flex-1 flex-col gap-3" aria-label={t('result.review')}>
                <h2 className="font-heading text-[22px] font-semibold text-ink">{t('result.review')}</h2>
                <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-1 lg:pr-2 lg:[scrollbar-color:#cfc9ec_transparent] lg:[scrollbar-width:thin]">
                  <ReviewGrid items={reviewItems} autoOpen={autoReview} listClassName="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 lg:gap-3" />
                </div>
              </section>
            </div>
          </div>
        </main>
      </PageShell>
    </>
  );
}

// Kontent URL ma'lumotiga (params/searchParams) bog'liq: Suspense ichida o'qiladi, qobiq esa darrov chiqadi.
export default function ResultPage(props: Parameters<typeof ResultPageContent>[0]) {
  return (
    <Suspense fallback={<PageSkeleton active="exams" />}>
      <ResultPageContent {...props} />
    </Suspense>
  );
}
