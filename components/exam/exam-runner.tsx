'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { finalizeAction, logTabSwitchAction, saveAnswerAction } from '@/app/attempts/actions';
import { LangSwitcher } from '@/components/i18n/lang-switcher';
import { useT } from '@/components/i18n/provider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Clock, Flag } from '@/components/ui/icons';
import { isAnswered, navState, type AnswerValue } from '@/lib/exam/answer-state';
import { SaveQueue, type QueueStatus } from '@/lib/exam/save-queue';
import { clockOffset, formatRemaining, remainingMs, timerPhase } from '@/lib/exam/timer';
import { Navigator } from './navigator';
import { QuestionView, type RunnerItem } from './question-view';
import { SubmitDialog } from './submit-dialog';
import { Watermark } from './watermark';

interface Props {
  attemptId: string;
  title: string;
  deadlineAt: string;
  items: RunnerItem[];
  initialAnswers: Record<string, AnswerValue>;
  initialFlags: Record<string, boolean>;
  initialSpent: Record<string, number>;
  /** Suv belgisi matni (ishtirokchi ismi) */
  watermark: string;
}

type Phase = 'running' | 'submitting' | 'finishing';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function ExamRunner({ attemptId, title, deadlineAt, items, initialAnswers, initialFlags, initialSpent, watermark }: Props) {
  const t = useT();
  const router = useRouter();
  const resultHref = `/attempts/${attemptId}/result`;

  const [answers, setAnswers] = useState(initialAnswers);
  const [flags, setFlags] = useState(initialFlags);
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex((i) => !isAnswered(i.payload.type, initialAnswers[i.questionId]))));
  const [save, setSave] = useState<{ status: QueueStatus; pending: number }>({ status: 'idle', pending: 0 });
  const [offsetMs, setOffsetMs] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('running');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const finishing = useRef(false);
  const spent = useRef<Record<string, number>>({ ...initialSpent });
  const enteredAt = useRef(0);

  const [queue] = useState(
    () =>
      new SaveQueue({
        storage: typeof window === 'undefined' ? undefined : window.localStorage,
        storageKey: `exam:${attemptId}:pending`,
        send: async (s) => {
          try {
            return await saveAnswerAction({ attemptId, ...s });
          } catch {
            return { ok: false, code: 'network' };
          }
        },
        onStatus: (status, pending) => setSave({ status, pending }),
        onSaved: (o) => {
          if (o.serverNow) setOffsetMs(clockOffset(o.serverNow, Date.now()));
        },
      }),
  );

  const current = items[index]!;

  // --- Savolda o'tkazilgan vaqt (sekund) ---
  const commitTime = useCallback(() => {
    const q = items[index];
    if (!q || enteredAt.current === 0) return;
    const elapsed = Math.round((Date.now() - enteredAt.current) / 1000);
    enteredAt.current = Date.now();
    if (elapsed <= 0) return;
    spent.current[q.questionId] = (spent.current[q.questionId] ?? 0) + elapsed;
    queue.enqueue({ questionId: q.questionId, timeSpent: spent.current[q.questionId] });
  }, [items, index, queue]);

  useEffect(() => {
    enteredAt.current = Date.now();
  }, [index]);

  // --- Navigatsiya va javoblar ---
  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= items.length || next === index) return;
      commitTime();
      setIndex(next);
      window.scrollTo({ top: 0 });
    },
    [commitTime, index, items.length],
  );

  const setAnswer = (value: AnswerValue) => {
    setAnswers((a) => ({ ...a, [current.questionId]: value }));
    queue.enqueue({ questionId: current.questionId, value });
  };

  const toggleFlag = () => {
    const next = !flags[current.questionId];
    setFlags((f) => ({ ...f, [current.questionId]: next }));
    queue.enqueue({ questionId: current.questionId, flagged: next });
  };

  // --- Yakunlash ---
  const autoFinish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setPhase('finishing');
    commitTime();
    await Promise.race([queue.flush(), sleep(4000)]);
    // Server soati bilan bir necha soniya farq bo'lishi mumkin: yopilguncha qisqa kutamiz.
    for (let i = 0; i < 60; i++) {
      try {
        const r = await finalizeAction(attemptId, true);
        if (!r.ok || r.status === 'submitted') break;
      } catch {
        // tarmoq: qayta urinamiz
      }
      await sleep(1000);
    }
    router.replace(resultHref);
  }, [attemptId, commitTime, queue, resultHref, router]);

  const submit = async () => {
    setPhase('submitting');
    setSubmitError(null);
    commitTime();
    const saved = await queue.flush();
    if (!saved && !queue.isClosed) {
      setPhase('running');
      setSubmitError(t('exam.dialog.errSave'));
      return;
    }
    try {
      const r = await finalizeAction(attemptId, false);
      if (!r.ok) throw new Error('finalize');
      finishing.current = true;
      router.replace(resultHref);
    } catch {
      setPhase('running');
      setSubmitError(t('exam.dialog.errSubmit'));
    }
  };

  // --- Effektlar ---
  useEffect(() => {
    void queue.flush(); // oldingi sessiyadan qolgan saqlanmagan javoblar
    const onOnline = () => void queue.retryNow();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (queue.pendingCount > 0) e.preventDefault();
    };
    // Tab almashtirish: faqat hisoblagich (jazo emas); administrator natijalarda ko'radi.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && !finishing.current) void logTabSwitchAction(attemptId).catch(() => {});
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      queue.dispose();
    };
  }, [queue, attemptId]);

  // Server soati bilan sinxronlash (+ muddat o'tgan bo'lsa lazy yopish): ochilganda va har daqiqada.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const r = await finalizeAction(attemptId, true);
        if (cancelled || !r.ok) return;
        if (r.serverNow) setOffsetMs(clockOffset(r.serverNow, Date.now()));
        if (r.status === 'submitted' && !finishing.current) {
          finishing.current = true;
          router.replace(resultHref);
        }
      } catch {
        // tarmoq: keyingi urinishda
      }
    };
    void sync();
    const id = setInterval(sync, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [attemptId, resultHref, router]);

  useEffect(() => {
    const tick = () => setRemaining(remainingMs(deadlineAt, offsetMs ?? 0, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt, offsetMs]);

  useEffect(() => {
    if ((remaining === 0 || save.status === 'closed') && !finishing.current) void autoFinish();
  }, [remaining, save.status, autoFinish]);

  // --- Ko'rinish ma'lumotlari ---
  const navItems = items.map((item, i) => ({
    position: item.position,
    state: navState({
      current: i === index,
      flagged: !!flags[item.questionId],
      answered: isAnswered(item.payload.type, answers[item.questionId]),
    }),
  }));
  const unanswered = items.filter((i) => !isAnswered(i.payload.type, answers[i.questionId])).length;
  const flaggedCount = items.filter((i) => flags[i.questionId]).length;
  const answeredCount = items.length - unanswered;
  const timer = remaining === null ? 'normal' : timerPhase(remaining);
  const isLast = index === items.length - 1;
  const busy = phase !== 'running';

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <Watermark text={watermark} />

      <header className="sticky top-0 z-10 border-b-2 border-line bg-white shadow-nav">
        <div className="mx-auto flex h-[72px] w-full max-w-[1480px] items-center gap-4 px-4 lg:px-8">
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-[18px] font-semibold text-ink">{title}</p>
            <p className="text-[14px] font-bold text-muted">{t('exam.noCalc')}</p>
          </div>

          <div
            className="hidden items-center gap-3 md:flex"
            aria-label={t('exam.progressAria', { a: answeredCount, b: items.length })}
          >
            <div className="flex w-[300px] gap-[2px]" aria-hidden>
              {items.map((item, i) => (
                <span
                  key={item.questionId}
                  className={
                    'h-3 flex-1 rounded-sm ' +
                    (i === index
                      ? 'border-2 border-brand-soft bg-brand-current'
                      : isAnswered(item.payload.type, answers[item.questionId])
                        ? 'bg-brand'
                        : 'bg-track')
                  }
                />
              ))}
            </div>
            <span className="text-[17px] font-extrabold text-muted">
              {answeredCount}/{items.length}
            </span>
          </div>

          <SaveIndicator status={save.status} pending={save.pending} />

          <LangSwitcher className="hidden sm:inline-flex" />

          <div
            className={
              'flex items-center gap-2 rounded-2xl px-3.5 py-2 text-[20px] font-black tabular-nums ' +
              (timer === 'over'
                ? 'bg-danger text-white'
                : timer === 'warning'
                  ? 'bg-brand-tint text-brand-ink'
                  : 'bg-surface text-ink')
            }
            role="timer"
            aria-label={t('exam.timerAria')}
          >
            <Clock width={20} height={20} />
            <span suppressHydrationWarning>{remaining === null ? '--:--' : formatRemaining(remaining)}</span>
          </div>

          <Button variant="secondary" className="hidden h-11 text-[16px] sm:inline-flex" onClick={() => setDialogOpen(true)} disabled={busy}>
            {t('exam.submit')}
          </Button>
        </div>
      </header>

      {timer === 'warning' && !busy && (
        <div role="alert" className="bg-warn-soft px-4 py-2.5 text-center text-[16px] font-extrabold text-brand-ink">
          {t('exam.warn5')}
        </div>
      )}
      {phase === 'finishing' && (
        <div role="status" className="bg-brand-tint px-4 py-2.5 text-center text-[16px] font-extrabold text-brand-ink">
          {t('exam.finishing')}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1480px] min-h-0 flex-1 gap-5 px-4 py-4 pb-28 lg:gap-6 lg:px-8 lg:pb-4">
        <main className="min-w-0 flex-1 lg:flex lg:min-h-0 lg:flex-col">
          <div className="rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-5 shadow-card sm:p-7 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <QuestionView item={current} value={answers[current.questionId]} onChange={setAnswer} />
          </div>

          <details className="mt-5 rounded-2xl border-2 border-line bg-white p-4 shadow-card lg:hidden">
            <summary className="cursor-pointer text-[17px] font-extrabold text-ink">{t('exam.allQuestions')}</summary>
            <div className="mt-4">
              <Navigator items={navItems} onSelect={goTo} />
            </div>
          </details>
        </main>

        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="flex h-full flex-col gap-[clamp(6px,1.2dvh,12px)] overflow-y-auto rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-[clamp(10px,1.8dvh,16px)] shadow-card">
            <h2 className="font-heading text-[20px] font-semibold text-ink">{t('exam.panel')}</h2>
            <Navigator items={navItems} onSelect={goTo} />
          </div>
        </aside>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-10 shrink-0 border-t-2 border-line bg-white lg:static shadow-[0_-6px_16px_-10px_rgba(38,24,110,0.25)]">
        <div className="mx-auto flex h-[88px] w-full max-w-[1480px] lg:h-[76px] items-center justify-between gap-3 px-4 lg:px-8">
          <Button variant="secondary" onClick={() => goTo(index - 1)} disabled={index === 0 || busy} aria-label={t('exam.prev')}>
            <ArrowLeft />
            <span className="ml-2 hidden sm:inline">{t('exam.back')}</span>
          </Button>

          <Button
            variant="secondary"
            onClick={toggleFlag}
            disabled={busy}
            aria-pressed={!!flags[current.questionId]}
            className={flags[current.questionId] ? 'border-gold-edge bg-warn-soft' : ''}
          >
            <Flag />
            <span className="ml-2">{flags[current.questionId] ? t('exam.flagged') : t('exam.flag')}</span>
          </Button>

          {isLast ? (
            <Button onClick={() => setDialogOpen(true)} disabled={busy}>
              {t('exam.submit')}
            </Button>
          ) : (
            <Button onClick={() => goTo(index + 1)} disabled={busy} aria-label={t('exam.nextQ')}>
              <span className="mr-2 hidden sm:inline">{t('exam.next')}</span>
              <ArrowRight />
            </Button>
          )}
        </div>
      </footer>

      <SubmitDialog
        open={dialogOpen}
        unanswered={unanswered}
        flagged={flaggedCount}
        submitting={phase === 'submitting'}
        error={submitError}
        onCancel={() => {
          setDialogOpen(false);
          setSubmitError(null);
        }}
        onConfirm={submit}
      />
    </div>
  );
}

function SaveIndicator({ status, pending }: { status: QueueStatus; pending: number }) {
  const t = useT();
  const map: Record<QueueStatus, { text: string; tone: string }> = {
    idle: { text: t('exam.saved'), tone: 'text-success-ink' },
    saving: { text: t('exam.saving'), tone: 'text-muted' },
    offline: { text: pending > 0 ? t('exam.offlinePending', { n: pending }) : t('exam.offline'), tone: 'text-danger' },
    closed: { text: t('exam.closed'), tone: 'text-danger' },
  };
  const { text, tone } = map[status];
  return (
    <p role="status" aria-live="polite" className={`hidden text-[14px] font-extrabold lg:block ${tone}`}>
      {text}
    </p>
  );
}
