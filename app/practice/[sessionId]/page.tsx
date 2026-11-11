import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { finishPracticeAction, type PracticeReveal } from '@/app/practice/actions';
import type { RunnerItem } from '@/components/exam/question-view';
import { PageSkeleton } from '@/components/page-skeleton';
import { PracticeRunner } from '@/components/practice/practice-runner';
import { ProProvider } from '@/components/pro/pro-modal';
import { BLOCK_CODES } from '@/config/topics';
import { elementLabelKey } from '@/lib/practice/config';
import type { AnswerValue } from '@/lib/exam/answer-state';
import { getI18n } from '@/lib/i18n/server';
import { getParticipant, requireParticipant } from '@/lib/participant.server';
import { feedbackImmediately } from '@/lib/practice/config';
import { isRevealed, practiceStateSchema } from '@/lib/practice/state';
import { answerValueOf, parseItems, solutionOpen } from '@/lib/practice/view';
import { createClient } from '@/lib/supabase/server';

async function PracticeRunnerPage({ params }: PageProps<'/practice/[sessionId]'>) {
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const [{ t, lang }] = await Promise.all([getI18n(), requireParticipant(`/practice/${sessionId}`)]);

  const supabase = await createClient();
  const res = await supabase.rpc('get_practice_state', { p_session: sessionId, p_lang: lang });
  if (res.error || res.data === null) notFound();
  const state = practiceStateSchema.parse(res.data);
  const { session } = state;
  const result = `/practice/${sessionId}/result`;

  if (session.status === 'submitted') redirect(result);
  // Taymer tugagan, lekin yakunlanmagan: server yopadi (tekshirilmagan javoblar tekshiriladi)
  if (session.deadline_at && Date.parse(session.deadline_at) <= Date.parse(session.server_now)) {
    await finishPracticeAction(sessionId);
    redirect(result);
  }

  const participant = await getParticipant();
  const isPro = !!participant?.isPro;
  const items = parseItems(state.items);
  const answerOf = new Map(state.answers.map((a) => [a.question_id, a]));
  const blockName = session.element_code
    ? `${session.element_code} ${t(elementLabelKey(session.element_code))}`
    : t(`blocks.${BLOCK_CODES[session.block_id - 1] ?? 'sonlar'}`);

  const runnerItems: RunnerItem[] = items.map((it) => ({
    position: it.position,
    questionId: it.question_id,
    blockName,
    stemMd: it.stem_md,
    payload: it.parsed,
  }));
  const initialAnswers: Record<string, AnswerValue> = {};
  const initialReveals: Record<string, PracticeReveal> = {};
  for (const it of items) {
    const a = answerOf.get(it.question_id);
    const v = answerValueOf(it.type, a);
    if (v !== undefined) initialAnswers[it.question_id] = v;
    if (feedbackImmediately(session.mode) && a && isRevealed(a)) {
      const open = solutionOpen(it.position, isPro);
      initialReveals[it.question_id] = {
        isCorrect: a.is_correct === true,
        parts: a.parts ?? null,
        correctAnswer: a.correct_answer ?? null,
        solutionMd: open ? (a.solution_md ?? null) : null,
        mistakeNoteMd: open ? (a.mistake_note_md ?? null) : null,
        solutionLocked: !open,
      };
    }
  }
  if (runnerItems.length === 0) notFound();

  return (
    <ProProvider>
      <PracticeRunner
        sessionId={sessionId}
        mode={session.mode}
        title={t('practice.runnerTitle', { block: blockName })}
        items={runnerItems}
        initialAnswers={initialAnswers}
        initialReveals={initialReveals}
        deadlineAt={session.deadline_at}
        serverNow={session.server_now}
      />
    </ProProvider>
  );
}

// Kontent URL ma'lumotiga bog'liq: Suspense ichida o'qiladi
export default function Page(props: Parameters<typeof PracticeRunnerPage>[0]) {
  return (
    <Suspense fallback={<PageSkeleton active="practice" />}>
      <PracticeRunnerPage {...props} />
    </Suspense>
  );
}
