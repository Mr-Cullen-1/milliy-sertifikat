import { notFound, redirect } from 'next/navigation';
import { ExamRunner } from '@/components/exam/exam-runner';
import type { AnswerValue } from '@/lib/exam/answer-state';
import { parseItems } from '@/lib/exam/attempt-state';
import { resolveAttempt } from '@/lib/exam/attempt.server';
import { parseAnswer } from '@/lib/exam/schemas';
import { blockCodeOf } from '@/lib/i18n/blocks';
import { getI18n } from '@/lib/i18n/server';
import { getParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';

export default async function AttemptPage({ params }: PageProps<'/attempts/[attemptId]'>) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();

  const resolved = await resolveAttempt(attemptId);
  if (resolved.kind === 'missing') notFound();
  if (resolved.kind !== 'running') redirect(`/attempts/${attemptId}/result`);
  const { state } = resolved;

  const supabase = await createClient();
  const [{ t }, participant, exam] = await Promise.all([
    getI18n(),
    getParticipant(),
    supabase.from('exams').select('title').eq('id', state.attempt.exam_id).maybeSingle(),
  ]);

  const parsed = parseItems(state.items);
  const typeOf = new Map(parsed.map((i) => [i.questionId, i.type]));

  const initialAnswers: Record<string, AnswerValue> = {};
  const initialFlags: Record<string, boolean> = {};
  const initialSpent: Record<string, number> = {};
  for (const a of state.answers) {
    const type = typeOf.get(a.question_id);
    const value = type ? parseAnswer(type, a.value) : undefined;
    if (value !== undefined) initialAnswers[a.question_id] = value;
    if (a.flagged) initialFlags[a.question_id] = true;
    if (a.time_spent_sec > 0) initialSpent[a.question_id] = a.time_spent_sec;
  }

  const watermark = participant ? `${participant.fullName} · ${participant.phone?.slice(-4) ?? ''}` : 'mock';

  return (
    <ExamRunner
      attemptId={attemptId}
      title={exam.data?.title ?? t('exams.fallbackTitle')}
      deadlineAt={state.attempt.deadline_at}
      items={parsed.map((i) => {
        const code = blockCodeOf(i.blockId);
        return {
          position: i.position,
          questionId: i.questionId,
          blockName: code ? t(`blocks.${code}`) : '',
          stemMd: i.stemMd,
          payload: i.payload,
        };
      })}
      initialAnswers={initialAnswers}
      initialFlags={initialFlags}
      initialSpent={initialSpent}
      watermark={watermark}
    />
  );
}
