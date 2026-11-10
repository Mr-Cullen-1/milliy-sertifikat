'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { finishPracticeAction, submitPracticeAnswerAction, type PracticeReveal } from '@/app/practice/actions';
import { QuestionsDrawer } from '@/components/exam/questions-drawer';
import { QuestionView, type RunnerItem } from '@/components/exam/question-view';
import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import { ProOpenButton, CrownIcon } from '@/components/pro/pro-modal';
import { buttonClass, Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Clock, Grid } from '@/components/ui/icons';
import { describeKey, isAnswered, type AnswerValue } from '@/lib/exam/answer-state';
import { formatRemaining, timerPhase } from '@/lib/exam/timer';
import { feedbackImmediately, type PracticeMode } from '@/lib/practice/config';

interface Props {
  sessionId: string;
  mode: PracticeMode;
  title: string;
  items: RunnerItem[];
  initialAnswers: Record<string, AnswerValue>;
  /** Tekshirilgan savollar (practice/timed rejimda sahifa qayta ochilganda) */
  initialReveals: Record<string, PracticeReveal>;
  deadlineAt: string | null;
  serverNow: string;
}

type Busy = null | 'checking' | 'finishing';

/**
 * Mashq ekrani. practice/timed: javobni "Tekshirish" bilan tekshiradi (server), to'g'ri javob va yechim ko'rsatiladi,
 * tekshirilgan savol qulflanadi. exam: javoblar o'zi saqlanadi, natija mashq tugagach ko'rsatiladi.
 * Tekshirish va kalit faqat serverda (app/practice/actions.ts).
 */
export function PracticeRunner({ sessionId, mode, title, items, initialAnswers, initialReveals, deadlineAt, serverNow }: Props) {
  const t = useT();
  const router = useRouter();
  const feedback = feedbackImmediately(mode);

  const [answers, setAnswers] = useState(initialAnswers);
  const [reveals, setReveals] = useState(initialReveals);
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex((i) => !(i.questionId in initialAnswers) && !(i.questionId in initialReveals))));
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const finishing = useRef(false);
  // exam rejimda javoblar ketma-ket saqlanadi (tartib buzilmasin); har savol uchun kechiktirilgan saqlash
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const latest = useRef<Record<string, AnswerValue>>({ ...initialAnswers });

  const current = items[index]!;
  const reveal = reveals[current.questionId];
  const value = answers[current.questionId];
  const answered = isAnswered(current.payload.type, value);
  const answeredCount = items.filter((i) => isAnswered(i.payload.type, answers[i.questionId]) || i.questionId in reveals).length;
  const unanswered = items.length - answeredCount;
  const isLast = index === items.length - 1;

  // --- Saqlash (exam rejim) ---
  const enqueueSave = useCallback(
    (questionId: string) => {
      const v = latest.current[questionId];
      if (v === undefined) return;
      chain.current = chain.current.then(async () => {
        try {
          const r = await submitPracticeAnswerAction({ sessionId, questionId, value: v, check: false });
          if (!r.ok && r.code !== 'closed') setError(t('practice.errSave'));
          else if (r.ok) setError(null);
        } catch {
          setError(t('practice.errSave'));
        }
      });
    },
    [sessionId, t],
  );

  const flush = useCallback(async () => {
    for (const [qid, timer] of Object.entries(timers.current)) {
      clearTimeout(timer);
      delete timers.current[qid];
      enqueueSave(qid);
    }
    await chain.current;
  }, [enqueueSave]);

  const onChange = (v: AnswerValue) => {
    if (reveal || busy) return;
    latest.current[current.questionId] = v;
    setAnswers((a) => ({ ...a, [current.questionId]: v }));
    setError(null);
    if (!feedback) {
      const qid = current.questionId;
      clearTimeout(timers.current[qid]);
      timers.current[qid] = setTimeout(() => {
        delete timers.current[qid];
        enqueueSave(qid);
      }, 500);
    }
  };

  const goTo = async (next: number) => {
    if (next < 0 || next >= items.length || next === index) return;
    if (!feedback) await flush();
    setIndex(next);
    setError(null);
    window.scrollTo({ top: 0 });
  };

  // --- Tekshirish (practice/timed) ---
  const check = async () => {
    if (!answered || reveal || busy || value === undefined) return;
    setBusy('checking');
    setError(null);
    try {
      const r = await submitPracticeAnswerAction({ sessionId, questionId: current.questionId, value, check: true });
      if (r.ok && r.checked) setReveals((x) => ({ ...x, [current.questionId]: r.reveal }));
      else if (!r.ok && r.code === 'closed') setError(t('practice.errClosed'));
      else if (!r.ok && r.code === 'locked') setError(t('practice.errClosed'));
      else setError(t('practice.errSave'));
    } catch {
      setError(t('practice.errSave'));
    } finally {
      setBusy(null);
    }
  };

  // --- Yakunlash ---
  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setBusy('finishing');
    setError(null);
    try {
      if (!feedback) await flush();
      const r = await finishPracticeAction(sessionId);
      if (!r.ok) throw new Error('finish');
      router.replace(`/practice/${sessionId}/result`);
    } catch {
      finishing.current = false;
      setBusy(null);
      setError(t('practice.errFinish'));
      setFinishOpen(false);
    }
  }, [feedback, flush, router, sessionId, t]);

  // --- Taymer (taymerli rejimlar): server soatiga moslangan ---
  useEffect(() => {
    if (!deadlineAt) return;
    const offset = Date.parse(serverNow) - Date.now();
    const deadline = Date.parse(deadlineAt);
    const tick = () => {
      const left = deadline - (Date.now() + offset);
      setRemaining(left);
      if (left <= 0) void finish();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt, serverNow, finish]);

  const navItems = useMemo(
    () =>
      items.map((it, i) => ({
        position: i + 1,
        state: (i === index ? 'current' : isAnswered(it.payload.type, answers[it.questionId]) || it.questionId in reveals ? 'answered' : 'empty') as 'current' | 'answered' | 'empty',
      })),
    [items, index, answers, reveals],
  );

  const timer = remaining === null ? 'normal' : timerPhase(remaining);
  const y2Ids = current.payload.type === 'y2' ? current.payload.data.items.map((i) => i.id) : [];
  const correctText = reveal ? describeKey(current.payload.type, reveal.correctAnswer, y2Ids) : '';

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b-2 border-line bg-white shadow-nav">
        <div className="mx-auto flex w-full max-w-[1100px] items-center gap-3 px-4 py-1.5 lg:h-[72px] lg:px-8 lg:py-0">
          <p className="min-w-0 flex-1 truncate font-heading text-[17px] leading-tight font-semibold text-ink lg:text-[19px]">{title}</p>
          {remaining !== null && (
            <div
              role="timer"
              aria-label={t('exam.timerAria')}
              className={
                'flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-1.5 text-[18px] font-black tabular-nums lg:text-[20px] ' +
                (timer === 'over' ? 'bg-danger text-white' : timer === 'warning' ? 'bg-brand-tint text-brand-ink' : 'bg-surface text-ink')
              }
            >
              <Clock width={20} height={20} />
              <span suppressHydrationWarning>{formatRemaining(Math.max(0, remaining))}</span>
            </div>
          )}
          <Button variant="secondary" size="sm" className="shrink-0" onClick={() => setFinishOpen(true)} disabled={busy !== null}>
            {t('practice.finish')}
          </Button>
        </div>
        <div
          role="progressbar"
          aria-label={t('exam.progressAria', { a: answeredCount, b: items.length })}
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={answeredCount}
          className="h-1.5 bg-track"
        >
          <div className="h-full bg-brand transition-[width]" style={{ width: `${(answeredCount / items.length) * 100}%` }} />
        </div>
      </header>

      {busy === 'finishing' && remaining !== null && remaining <= 0 && (
        <div role="status" className="bg-brand-tint px-4 py-2.5 text-center text-[16px] font-extrabold text-brand-ink">
          {t('practice.timeUp')}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-4 px-4 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-8 lg:pb-28">
        <div className="rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-5 shadow-card sm:p-7 lg:flex lg:h-[clamp(480px,calc(100dvh-300px),700px)] lg:flex-col">
          <QuestionView item={current} value={value} onChange={onChange} locked={!!reveal} />
        </div>

        {reveal && (
          <section
            aria-live="polite"
            className={`flex flex-col gap-3 rounded-3xl border-2 border-b-[5px] p-5 ${
              reveal.isCorrect ? 'border-success-line bg-success-soft' : reveal.parts && (reveal.parts.a || reveal.parts.b) ? 'border-gold-edge bg-warn-soft' : 'border-[#f3c4c8] bg-[#fdecee]'
            }`}
          >
            <p className="font-heading text-[24px] leading-8 font-semibold text-ink">
              {reveal.isCorrect ? t('practice.correct') : reveal.parts && (reveal.parts.a || reveal.parts.b) ? t('practice.partial') : t('practice.wrong')}
            </p>
            {!reveal.isCorrect && correctText && (
              <p className="text-[17px] font-bold text-ink-soft">
                {t('result.correctAnswer')}: <span className="font-extrabold text-success-ink">{correctText}</span>
              </p>
            )}
            {reveal.solutionMd && (
              <div className="rounded-2xl bg-white/70 p-4">
                <p className="mb-1.5 text-[15px] font-extrabold text-brand-ink">{t('result.solution')}</p>
                <Markdown className="text-[17px] font-semibold text-ink">{reveal.solutionMd}</Markdown>
              </div>
            )}
            {reveal.mistakeNoteMd && !reveal.isCorrect && (
              <div className="rounded-2xl bg-white/70 p-4">
                <p className="mb-1.5 text-[15px] font-extrabold text-accent">{t('result.mistake')}</p>
                <Markdown className="text-[17px] font-semibold text-ink">{reveal.mistakeNoteMd}</Markdown>
              </div>
            )}
            {reveal.solutionLocked && (
              <div className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[16px] font-bold text-ink-soft">{t('practice.solutionLocked')}</p>
                <ProOpenButton className={buttonClass('accent', 'shrink-0', 'sm')}>
                  <CrownIcon size={18} />
                  {t('pro.cardButton')}
                </ProOpenButton>
              </div>
            )}
          </section>
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-[#fdecee] px-4 py-3 text-[16px] font-bold text-danger">
            {error}
          </p>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_16px_-10px_rgba(38,24,110,0.25)]">
        <div className="mx-auto flex h-[68px] w-full max-w-[1100px] items-center justify-between gap-2 px-3 sm:px-4 lg:h-[76px] lg:gap-3 lg:px-8">
          <Button variant="secondary" size="sm" className="shrink-0" onClick={() => void goTo(index - 1)} disabled={index === 0 || busy !== null} aria-label={t('exam.prev')}>
            <ArrowLeft />
            <span className="hidden sm:inline">{t('exam.back')}</span>
          </Button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('exam.allQuestions')}
            className="flex h-11 min-w-0 max-w-[240px] flex-1 items-center justify-center gap-2.5 rounded-2xl border-2 border-line bg-surface px-3 text-ink transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Grid width={22} height={22} />
            <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[15px] font-extrabold text-brand-ink tabular-nums">
              {answeredCount}/{items.length}
            </span>
          </button>

          {feedback && !reveal ? (
            <Button size="sm" className="shrink-0" onClick={() => void check()} disabled={!answered || busy !== null}>
              {busy === 'checking' ? t('practice.checking') : t('practice.check')}
            </Button>
          ) : isLast ? (
            <Button size="sm" className="shrink-0" onClick={() => setFinishOpen(true)} disabled={busy !== null}>
              {t('practice.finish')}
            </Button>
          ) : (
            <Button size="sm" className="shrink-0" onClick={() => void goTo(index + 1)} disabled={busy !== null} aria-label={t('exam.nextQ')}>
              <span className="hidden sm:inline">{t('practice.next')}</span>
              <ArrowRight />
            </Button>
          )}
        </div>
      </footer>

      <QuestionsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={title} items={navItems} onSelect={(i) => void goTo(i)} />

      <FinishDialog open={finishOpen} unanswered={unanswered} busy={busy === 'finishing'} onCancel={() => setFinishOpen(false)} onConfirm={() => void finish()} />
    </div>
  );
}

function FinishDialog({ open, unanswered, busy, onCancel, onConfirm }: { open: boolean; unanswered: number; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[min(92vw,460px)] rounded-3xl border-2 border-b-[6px] border-line-strong bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <h2 className="font-heading text-[26px] leading-8 font-semibold">{t('practice.finishTitle')}</h2>
      <p className={`mt-4 text-[18px] font-bold ${unanswered > 0 ? 'text-brand-ink' : 'text-success-ink'}`}>
        {unanswered > 0 ? t('practice.finishUnanswered', { n: unanswered }) : t('practice.finishAll')}
      </p>
      <p className="mt-3 text-[16px] font-semibold text-muted">{t('practice.finishLead')}</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t('practice.continue')}
        </Button>
        <Button onClick={onConfirm} disabled={busy}>
          {busy ? t('practice.finishing') : t('practice.finish')}
        </Button>
      </div>
    </dialog>
  );
}
