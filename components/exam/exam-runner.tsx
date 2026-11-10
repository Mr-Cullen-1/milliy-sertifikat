'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { finalizeAction, logTabSwitchAction, saveAnswerAction } from '@/app/attempts/actions';
import { LangSwitcher } from '@/components/i18n/lang-switcher';
import { useT } from '@/components/i18n/provider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Clock, Grid } from '@/components/ui/icons';
import { isAnswered, navState, type AnswerValue } from '@/lib/exam/answer-state';
import { SaveQueue, type QueueStatus } from '@/lib/exam/save-queue';
import { clockOffset, formatRemaining, remainingMs, timerPhase } from '@/lib/exam/timer';
import { useShortcut } from './keyboard';
import { Navigator } from './navigator';
import { QuestionsDrawer } from './questions-drawer';
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
  // `?review=1`: natija sahifasida 1-savol tahlili oynasi avtomatik ochiladi.
  const resultHref = `/attempts/${attemptId}/result?review=1`;

  const [answers, setAnswers] = useState(initialAnswers);
  const [flags, setFlags] = useState(initialFlags);
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      items.findIndex((i) => !isAnswered(i.payload.type, initialAnswers[i.questionId])),
    ),
  );
  const [save, setSave] = useState<{ status: QueueStatus; pending: number }>({ status: 'idle', pending: 0 });
  const [offsetMs, setOffsetMs] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    type: item.payload.type,
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

  // Klaviatura: ←/→ savollar orasida (javob harflari javob komponentlarida)
  useShortcut((e) => {
    if (busy) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    }
  });
  const kbdKeys =
    current.payload.type === 'y1'
      ? 'A–D'
      : current.payload.type === 'y2'
        ? `A–${Object.keys(current.payload.data.options).at(-1) ?? 'F'}`
        : null;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <Watermark text={watermark} />

      <header className="sticky top-0 z-10 border-b-2 border-line bg-white shadow-nav">
        <div className="mx-auto flex w-full max-w-[1480px] items-center gap-x-3 px-4 py-1.5 lg:h-[72px] lg:gap-4 lg:px-8 lg:py-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-heading text-[17px] leading-tight font-semibold text-ink lg:text-[18px]">{title}</p>
              <span className="min-w-0 lg:hidden">
                <SaveIndicator status={save.status} pending={save.pending} compact />
              </span>
            </div>
            <p className="hidden truncate text-[14px] font-bold text-muted lg:block">{t('exam.noCalc')}</p>
          </div>

          <div className="hidden items-center gap-3 lg:flex" aria-label={t('exam.progressAria', { a: answeredCount, b: items.length })}>
            <div className="flex w-[300px] gap-[2px]" aria-hidden>
              {items.map((item, i) => (
                <span
                  key={item.questionId}
                  className={
                    'h-3 flex-1 rounded-sm ' +
                    (i === index ? 'border-2 border-brand-soft bg-brand-current' : isAnswered(item.payload.type, answers[item.questionId]) ? 'bg-brand' : 'bg-track')
                  }
                />
              ))}
            </div>
            <span className="text-[17px] font-extrabold text-muted">
              {answeredCount}/{items.length}
            </span>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <SaveIndicator status={save.status} pending={save.pending} />
            <LangSwitcher />
          </div>

          <div
            className={
              'flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-1.5 text-[18px] font-black tabular-nums lg:gap-2 lg:px-3.5 lg:py-2 lg:text-[20px] ' +
              (timer === 'over' ? 'bg-danger text-white' : timer === 'warning' ? 'bg-brand-tint text-brand-ink' : 'bg-surface text-ink')
            }
            role="timer"
            aria-label={t('exam.timerAria')}
          >
            <Clock width={20} height={20} />
            <span suppressHydrationWarning>{remaining === null ? '--:--' : formatRemaining(remaining)}</span>
          </div>

          <Button variant="secondary" size="sm" className="shrink-0" onClick={() => setDialogOpen(true)} disabled={busy}>
            {t('exam.submit')}
          </Button>
        </div>

        {/* Mobil: ingichka progress chizig'i (son pastki paneldagi tugmada; til almashtirgich yon panelda) */}
        <div
          role="progressbar"
          aria-label={t('exam.progressAria', { a: answeredCount, b: items.length })}
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={answeredCount}
          className="h-1.5 bg-track lg:hidden"
        >
          <div className="h-full bg-brand transition-[width]" style={{ width: `${(answeredCount / items.length) * 100}%` }} />
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

      <div className="mx-auto flex w-full max-w-[1480px] min-h-0 flex-1 gap-5 px-4 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:gap-6 lg:px-8 lg:pb-4">
        <main className="min-w-0 flex-1 lg:flex lg:min-h-0 lg:flex-col">
          <div className="rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-5 shadow-card sm:p-7 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <QuestionView
              item={current}
              value={answers[current.questionId]}
              onChange={setAnswer}
              flag={{ on: !!flags[current.questionId], disabled: busy, onToggle: toggleFlag }}
            />
          </div>
        </main>

        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="flex h-full flex-col gap-[clamp(6px,1.2dvh,12px)] overflow-y-auto rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-[clamp(10px,1.8dvh,16px)] shadow-card">
            {/* Past ekranlarda (balandligi < 760px) sarlavha yashiriladi: bo'limlar sarlavhalari va legenda scrollsiz sig'sin */}
            <h2 className="font-heading text-[20px] font-semibold text-ink [@media(max-height:760px)]:hidden">{t('exam.panel')}</h2>
            <Navigator items={navItems} onSelect={goTo} />
          </div>
        </aside>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-10 shrink-0 border-t-2 border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_16px_-10px_rgba(38,24,110,0.25)] lg:static lg:pb-0">
        <div className="mx-auto flex h-[68px] w-full max-w-[1480px] items-center justify-between gap-2 px-3 sm:px-4 lg:h-[76px] lg:gap-3 lg:px-8">
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 lg:h-14! lg:px-6! lg:text-[19px]!"
            onClick={() => goTo(index - 1)}
            disabled={index === 0 || busy}
            aria-label={t('exam.prev')}
          >
            <ArrowLeft />
            <span className="hidden sm:inline">{t('exam.back')}</span>
          </Button>

          <div className="flex min-w-0 flex-1 justify-center">
            {/* Mobil: barcha savollar yon panelini ochadigan tugma (javob berilgan soni bilan) */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('exam.allQuestions')}
              className="flex h-11 w-full max-w-[240px] items-center justify-center gap-2.5 rounded-2xl border-2 border-line bg-surface px-3 text-ink transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
            >
              <Grid width={22} height={22} />
              <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[15px] font-extrabold text-brand-ink tabular-nums">
                {answeredCount}/{items.length}
              </span>
            </button>
            {/* Kompyuter: klaviatura yorlig'i */}
            {kbdKeys && <p className="hidden truncate text-[15px] font-bold text-muted lg:block">{t('exam.kbd', { keys: kbdKeys })}</p>}
          </div>

          {isLast ? (
            <Button size="sm" className="shrink-0 lg:h-14! lg:px-6! lg:text-[19px]!" onClick={() => setDialogOpen(true)} disabled={busy}>
              {t('exam.submit')}
            </Button>
          ) : (
            <Button size="sm" className="shrink-0 lg:h-14! lg:px-6! lg:text-[19px]!" onClick={() => goTo(index + 1)} disabled={busy} aria-label={t('exam.nextQ')}>
              <span className="hidden sm:inline">{t('exam.next')}</span>
              <ArrowRight />
            </Button>
          )}
        </div>
      </footer>

      <QuestionsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={title} items={navItems} onSelect={goTo} />

      <SubmitDialog
        open={dialogOpen}
        answered={answeredCount}
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

function SaveIndicator({ status, pending, compact = false }: { status: QueueStatus; pending: number; compact?: boolean }) {
  const t = useT();
  const map: Record<QueueStatus, { text: string; tone: string }> = {
    idle: { text: t('exam.saved'), tone: 'text-success-ink' },
    saving: { text: t('exam.saving'), tone: 'text-muted' },
    offline: { text: pending > 0 ? t('exam.offlinePending', { n: pending }) : t('exam.offline'), tone: 'text-danger' },
    closed: { text: t('exam.closed'), tone: 'text-danger' },
  };
  const { text, tone } = map[status];
  // Mobil: saqlangan = yashil nuqta, saqlanmoqda = sekin yonib-o'chadigan nuqta (matn ekran o'qish dasturlari uchun);
  // faqat muammo (oflayn / vaqt tugagan) bo'lsa matn chiqadi, chunki u e'tibor talab qiladi.
  if (compact && (status === 'idle' || status === 'saving')) {
    return (
      <span role="status" className={`inline-block size-2.5 shrink-0 rounded-full ${status === 'idle' ? 'bg-success' : 'animate-pulse bg-faint'}`}>
        <span className="sr-only">{text}</span>
      </span>
    );
  }
  return (
    <p role="status" aria-live="polite" className={`truncate text-[13px] font-extrabold lg:text-[14px] ${tone}`}>
      {text}
    </p>
  );
}
