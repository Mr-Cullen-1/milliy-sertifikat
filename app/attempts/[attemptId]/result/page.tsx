import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FigureImage } from '@/components/exam/figure';
import { Watermark } from '@/components/exam/watermark';
import { Markdown } from '@/components/math/markdown';
import { SiteHeader } from '@/components/site-header';
import { buttonClass } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { describeAnswer, describeKey } from '@/lib/exam/answer-state';
import { parseItems } from '@/lib/exam/attempt-state';
import { resolveAttempt } from '@/lib/exam/attempt.server';
import { blockBreakdown } from '@/lib/exam/breakdown';
import { formatScore } from '@/lib/format';
import { blockCodeOf } from '@/lib/i18n/blocks';
import { getI18n } from '@/lib/i18n/server';
import { getParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';

export default async function ResultPage({ params }: PageProps<'/attempts/[attemptId]/result'>) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();

  const resolved = await resolveAttempt(attemptId);
  if (resolved.kind === 'missing') notFound();
  if (resolved.kind === 'running') redirect(`/attempts/${attemptId}`);

  const { t, lang } = await getI18n();

  if (resolved.kind === 'pending') {
    return (
      <>
        <SiteHeader active="exams" />
        <main className="mx-auto flex w-full max-w-[920px] flex-1 flex-col gap-3 px-4 py-10">
          <h1 className="font-heading text-[28px] font-semibold text-ink">{t('result.pendingTitle')}</h1>
          <p className="text-[18px] font-semibold text-muted">{t('result.pendingLead')}</p>
        </main>
      </>
    );
  }

  const { state } = resolved;
  const { attempt } = state;
  const supabase = await createClient();
  const [exam, participant] = await Promise.all([
    supabase.from('exams').select('title').eq('id', attempt.exam_id).maybeSingle(),
    getParticipant(),
  ]);

  const items = parseItems(state.items);
  const answerOf = new Map(state.answers.map((a) => [a.question_id, a]));
  const rows = blockBreakdown(
    items.map((i) => ({ questionId: i.questionId, blockId: i.blockId })),
    state.answers.map((a) => ({ questionId: a.question_id, isCorrect: a.is_correct, score: a.score, maxScore: a.max_score })),
  );
  const correctTotal = rows.reduce((s, r) => s + r.correct, 0);
  const scaled = attempt.scaled_score ?? 0;
  const level = attempt.level;
  const blockLabel = (id: number) => {
    const code = blockCodeOf(id);
    return code ? t(`blocks.${code}`) : String(id);
  };
  const dtmHref = `/dtm?score=${encodeURIComponent(String(scaled))}${level ? `&level=${encodeURIComponent(level)}` : ''}`;

  return (
    <>
      {participant && <Watermark text={`${participant.fullName} · ${participant.phone?.slice(-4) ?? ''}`} />}
      <SiteHeader active="exams" />
      <main className="mx-auto flex w-full max-w-[920px] flex-1 flex-col gap-8 px-4 py-10">
        <header className="flex flex-col gap-3">
          <Chip tone="success">{t('result.chip')}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">
            {exam.data?.title ?? t('exams.fallbackTitle')}
          </h1>
        </header>

        <div role="note" className="rounded-2xl bg-warn-soft px-4 py-3 text-[16px] leading-6 font-bold text-brand-ink">
          {t('result.note')}
        </div>

        <section
          aria-label={t('result.overall')}
          className="flex flex-col gap-5 rounded-[20px] border-2 border-b-[5px] border-success-line bg-success-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="flex flex-col gap-2">
            <p className="flex items-end gap-1.5 leading-none">
              <span className="text-[56px] font-black text-success-ink">≈ {formatScore(scaled, lang)}</span>
              <span className="pb-1.5 text-[24px] font-extrabold text-muted">/ 75</span>
            </p>
            <p className="text-[18px] font-bold text-ink-soft">
              {t('result.raw', {
                raw: formatScore(attempt.raw_score ?? 0, lang),
                max: formatScore(attempt.max_raw ?? 0, lang),
                correct: correctTotal,
              })}
            </p>
            {attempt.submit_reason === 'timeout' && <p className="text-[16px] font-bold text-brand-ink">{t('result.timeout')}</p>}
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            {level ? (
              <span className="rounded-2xl border-2 border-b-[5px] border-gold-edge bg-gold px-5 py-2 text-[32px] font-black text-white">{level}</span>
            ) : (
              <span className="rounded-2xl bg-white px-4 py-2 text-[17px] font-extrabold text-muted">{t('result.noLevel')}</span>
            )}
            <span className="text-[14px] font-bold text-muted">{t('result.levelHint')}</span>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href={dtmHref} className={buttonClass('secondary')}>
            {t('result.toDtm')}
          </Link>
          <Link href="/mistakes" className={buttonClass('secondary')}>
            {t('result.toMistakes')}
          </Link>
        </div>

        <section className="flex flex-col gap-3" aria-label={t('result.byBlock')}>
          <h2 className="font-heading text-[24px] font-semibold text-ink">{t('result.byBlock')}</h2>
          <ul className="flex flex-col gap-3">
            {rows.map((r) => {
              const pct = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
              return (
                <li key={r.blockId} className="flex flex-col gap-2 rounded-2xl border-2 border-line px-4 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="text-[18px] font-extrabold text-ink">{blockLabel(r.blockId)}</span>
                    <span className="text-[16px] font-bold text-muted">
                      {t('result.blockLine', {
                        correct: r.correct,
                        total: r.total,
                        score: formatScore(r.score, lang),
                        max: formatScore(r.maxScore, lang),
                      })}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-track" role="img" aria-label={`${pct}%`}>
                    <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-3" aria-label={t('result.review')}>
          <h2 className="font-heading text-[24px] font-semibold text-ink">{t('result.review')}</h2>
          <ol className="flex flex-col gap-3">
            {items.map((item) => {
              const a = answerOf.get(item.questionId);
              const y2Ids = item.payload.type === 'y2' ? item.payload.data.items.map((i) => i.id) : [];
              const noAnswer = t('answers.none');
              const given = describeAnswer(item.type, a?.value, y2Ids, noAnswer);
              const status = a?.is_correct ? 'ok' : given !== noAnswer ? 'wrong' : 'empty';
              const correctText = describeKey(item.type, item.correctAnswer, y2Ids);
              return (
                <li key={item.questionId}>
                  <details className="group rounded-2xl border-2 border-line open:border-line-strong">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5">
                      <span
                        className={
                          'flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[16px] font-black text-white ' +
                          (status === 'ok' ? 'bg-success' : status === 'wrong' ? 'bg-danger' : 'bg-faint')
                        }
                      >
                        {item.position}
                      </span>
                      <span className="flex-1 text-[17px] font-bold text-ink">
                        {status === 'ok' ? t('result.ok') : status === 'wrong' ? t('result.wrong') : t('result.empty')}
                        <span className="ml-2 font-semibold text-muted">· {blockLabel(item.blockId)}</span>
                      </span>
                      <span className="text-[16px] font-extrabold text-ink-soft">
                        {formatScore(a?.score ?? 0, lang)}/{formatScore(a?.max_score ?? 0, lang)}
                      </span>
                    </summary>
                    <div className="flex flex-col gap-4 border-t-2 border-line px-4 py-4">
                      <Markdown className="text-[19px] font-bold text-ink">{item.stemMd}</Markdown>
                      {item.payload.data.figure && <FigureImage figure={item.payload.data.figure} />}
                      <p className="text-[16px] font-bold text-muted">
                        {t('result.yourAnswer')}: <span className="font-extrabold text-ink">{given}</span>
                        {a?.parts && item.type === 'o' && (
                          <span className="ml-3">
                            (a: {a.parts.a ? t('result.partCorrect') : t('result.partWrong')}, b:{' '}
                            {a.parts.b ? t('result.partCorrect') : t('result.partWrong')})
                          </span>
                        )}
                      </p>
                      {correctText && (
                        <p className="text-[16px] font-bold text-muted">
                          {t('result.correctAnswer')}: <span className="font-extrabold text-success-ink">{correctText}</span>
                        </p>
                      )}
                      {item.solutionMd && (
                        <div className="rounded-2xl bg-brand-tint p-4">
                          <p className="mb-1.5 text-[15px] font-extrabold text-brand-ink">{t('result.solution')}</p>
                          <Markdown className="text-[17px] font-semibold text-ink">{item.solutionMd}</Markdown>
                        </div>
                      )}
                      {item.mistakeNoteMd && (
                        <div className="rounded-2xl bg-accent-soft p-4">
                          <p className="mb-1.5 text-[15px] font-extrabold text-accent">{t('result.mistake')}</p>
                          <Markdown className="text-[17px] font-semibold text-ink">{item.mistakeNoteMd}</Markdown>
                        </div>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </section>

        <div>
          <Link href="/exams" className={buttonClass('primary')}>
            {t('result.toExams')}
          </Link>
        </div>
      </main>
    </>
  );
}
