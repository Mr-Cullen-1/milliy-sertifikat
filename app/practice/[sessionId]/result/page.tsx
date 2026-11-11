import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { ReviewGrid, type ReviewItem } from '@/components/exam/review-grid';
import { ReviewLink } from '@/components/exam/review-link';
import { PageShell } from '@/components/page-shell';
import { PageSkeleton } from '@/components/page-skeleton';
import { buttonClass } from '@/components/ui/button';
import { ArrowDown } from '@/components/ui/icons';
import { BLOCK_CODES } from '@/config/topics';
import { elementLabelKey } from '@/lib/practice/config';
import { isAnswered } from '@/lib/exam/answer-state';
import { getI18n } from '@/lib/i18n/server';
import { getParticipant, requireParticipant } from '@/lib/participant.server';
import { practiceStateSchema } from '@/lib/practice/state';
import { answerValueOf, describeAnswer, describeKey, parseItems, solutionOpen, y2IdsOf } from '@/lib/practice/view';
import { createClient } from '@/lib/supabase/server';

async function PracticeResult({ params }: PageProps<'/practice/[sessionId]/result'>) {
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const [{ t, lang }] = await Promise.all([getI18n(), requireParticipant(`/practice/${sessionId}/result`)]);

  const supabase = await createClient();
  const [res, savedRes, participant] = await Promise.all([
    supabase.rpc('get_practice_state', { p_session: sessionId, p_lang: lang }),
    supabase.rpc('get_my_saved_ids'),
    getParticipant(),
  ]);
  if (res.error || res.data === null) notFound();
  const state = practiceStateSchema.parse(res.data);
  if (state.session.status !== 'submitted') redirect(`/practice/${sessionId}`);

  const isPro = !!participant?.isPro;
  const savedIds = z.array(z.string()).catch([]).parse(savedRes.data ?? []);
  const items = parseItems(state.items);
  const answerOf = new Map(state.answers.map((a) => [a.question_id, a]));
  const blockName = state.session.element_code
    ? `${state.session.element_code} ${t(elementLabelKey(state.session.element_code))}`
    : t(`blocks.${BLOCK_CODES[state.session.block_id - 1] ?? 'sonlar'}`);

  const correct = state.session.correct_count ?? 0;
  const total = state.session.question_count;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const noAnswer = t('answers.none');

  const reviewItems: ReviewItem[] = items.map((it) => {
    // Bepul chegaradan keyingi savollar: tafsilot serverda olib tashlanadi (Pro oynasi ochiladi)
    if (!solutionOpen(it.position, isPro)) {
      return { position: it.position, status: 'empty', block: blockName, scoreText: '', stemMd: '', figure: null, given: '', partsText: null, correct: null, solutionMd: null, mistakeNoteMd: null, locked: true };
    }
    const a = answerOf.get(it.question_id);
    const value = answerValueOf(it.type, a);
    const y2Ids = y2IdsOf(it.parsed);
    return {
      position: it.position,
      questionId: it.question_id,
      status: a?.is_correct ? 'ok' : isAnswered(it.type, value) ? 'wrong' : 'empty',
      block: blockName,
      scoreText: '',
      stemMd: it.stem_md,
      figure: it.parsed.data.figure ?? null,
      given: describeAnswer(it.type, value, y2Ids, noAnswer),
      partsText:
        a?.parts && it.type === 'o' ? `(a: ${a.parts.a ? t('result.partCorrect') : t('result.partWrong')}, b: ${a.parts.b ? t('result.partCorrect') : t('result.partWrong')})` : null,
      correct: describeKey(it.type, a?.correct_answer, y2Ids) || null,
      solutionMd: a?.solution_md || null,
      mistakeNoteMd: a?.mistake_note_md || null,
    };
  });

  return (
    <PageShell active="practice">
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:gap-6">
        <section
          aria-label={t('practice.resultTitle')}
          className="flex flex-col gap-3 rounded-3xl border-2 border-b-[5px] border-success-line bg-success-soft p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[13px] font-extrabold tracking-wider text-muted uppercase">{t('practice.resultTitle')}</p>
            <h1 className="font-heading text-[26px] leading-8 font-semibold text-ink sm:text-[32px] sm:leading-10">{blockName}</h1>
          </div>
          <p className="flex items-end gap-3 leading-none">
            <span className="text-[34px] font-black text-success-ink sm:text-[44px]">{t('practice.resultLine', { c: correct, n: total })}</span>
            <span className="pb-1 text-[20px] font-extrabold text-muted">{t('practice.resultPct', { p: pct })}</span>
          </p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/practice" className={buttonClass('primary', 'w-full sm:w-fit', 'sm')}>
            {t('practice.again')}
          </Link>
          <ReviewLink>
            {t('result.review')}
            <ArrowDown width={20} height={20} />
          </ReviewLink>
        </div>

        <section id="review" className="flex scroll-mt-24 flex-col gap-3" aria-label={t('result.review')}>
          <h2 className="font-heading text-[22px] font-semibold text-ink">{t('result.review')}</h2>
          <ReviewGrid items={reviewItems} savedIds={savedIds} />
        </section>
      </main>
    </PageShell>
  );
}

export default function Page(props: Parameters<typeof PracticeResult>[0]) {
  return (
    <Suspense fallback={<PageSkeleton active="practice" />}>
      <PracticeResult {...props} />
    </Suspense>
  );
}
