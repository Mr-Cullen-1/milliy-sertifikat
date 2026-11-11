'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { finishPracticeAction, submitPracticeAnswerAction, type PracticeReveal } from '@/app/practice/actions';
import { useShortcut } from '@/components/exam/keyboard';
import { Navigator } from '@/components/exam/navigator';
import { QuestionsDrawer } from '@/components/exam/questions-drawer';
import { QuestionView, type RunnerItem } from '@/components/exam/question-view';
import { LangSwitcher } from '@/components/i18n/lang-switcher';
import { useT } from '@/components/i18n/provider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Clock, Grid } from '@/components/ui/icons';
import { describeKey, isAnswered, navState, type AnswerValue } from '@/lib/exam/answer-state';
import { formatRemaining, timerPhase } from '@/lib/exam/timer';
import { feedbackImmediately, type PracticeMode } from '@/lib/practice/config';
import { RevealSheet } from './reveal-sheet';

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
  // Tekshirilgandan so'ng javob oynasi tepadan tushadi; yopilgach savol ostida "Javobni ko'rish" paneli qoladi
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

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

  // Bayroq (belgilash): mockdagi kabi tugma; mashqda faqat joriy ochiq sahifada eslab qolinadi (bazaga yozilmaydi)
  const toggleFlag = () => setFlags((f) => ({ ...f, [current.questionId]: !f[current.questionId] }));

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
    setSheetOpen(false);
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
      if (r.ok && r.checked) {
        setReveals((x) => ({ ...x, [current.questionId]: r.reveal }));
        setSheetOpen(true);
      }
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
        type: it.payload.type,
        state: navState({ current: i === index, flagged: !!flags[it.questionId], answered: isAnswered(it.payload.type, answers[it.questionId]) || it.questionId in reveals }),
      })),
    [items, index, answers, reveals, flags],
  );

  const timer = remaining === null ? 'normal' : timerPhase(remaining);
  const y2Ids = current.payload.type === 'y2' ? current.payload.data.items.map((i) => i.id) : [];
  const correctText = reveal ? describeKey(current.payload.type, reveal.correctAnswer, y2Ids) : '';

  const busyAny = busy !== null;
  const revealTone = reveal ? (reveal.isCorrect ? 'ok' : reveal.parts && (reveal.parts.a || reveal.parts.b) ? 'partial' : 'bad') : null;

  // Klaviatura: ←/→ savollar orasida (javob harflari javob komponentlarida), mockdagidek
  useShortcut((e) => {
    if (busyAny) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      void goTo(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      void goTo(index - 1);
    }
  });
  const kbdKeys = current.payload.type === 'y1' ? 'A–D' : current.payload.type === 'y2' ? `A–${Object.keys(current.payload.data.options).at(-1) ?? 'F'}` : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="sticky top-0 z-10 border-b-2 border-line bg-white shadow-nav">
        <div className="mx-auto flex w-full max-w-[1480px] items-center gap-x-3 px-4 py-1.5 lg:h-[72px] lg:gap-4 lg:px-8 lg:py-0">
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-[17px] leading-tight font-semibold text-ink lg:text-[18px]">{title}</p>
            <p className="hidden truncate text-[14px] font-bold text-muted lg:block">{t('exam.noCalc')}</p>
          </div>

          <div className="hidden items-center gap-3 lg:flex" aria-label={t('exam.progressAria', { a: answeredCount, b: items.length })}>
            <div className="flex w-[300px] gap-[2px]" aria-hidden>
              {items.map((item, i) => (
                <span
                  key={item.questionId}
                  className={
                    'h-3 flex-1 rounded-sm ' +
                    (i === index ? 'border-2 border-brand-soft bg-brand-current' : isAnswered(item.payload.type, answers[item.questionId]) || item.questionId in reveals ? 'bg-brand' : 'bg-track')
                  }
                />
              ))}
            </div>
            <span className="text-[17px] font-extrabold text-muted">
              {answeredCount}/{items.length}
            </span>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <LangSwitcher />
          </div>

          {remaining !== null && (
            <div
              role="timer"
              aria-label={t('exam.timerAria')}
              className={
                'flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-1.5 text-[18px] font-black tabular-nums lg:gap-2 lg:px-3.5 lg:py-2 lg:text-[20px] ' +
                (timer === 'over' ? 'bg-danger text-white' : timer === 'warning' ? 'bg-brand-tint text-brand-ink' : 'bg-surface text-ink')
              }
            >
              <Clock width={20} height={20} />
              <span suppressHydrationWarning>{formatRemaining(Math.max(0, remaining))}</span>
            </div>
          )}

          <Button variant="secondary" size="sm" className="shrink-0" onClick={() => setFinishOpen(true)} disabled={busyAny}>
            {t('practice.finish')}
          </Button>
        </div>

        {/* Mobil: ingichka progress chizig'i (son pastki paneldagi tugmada) */}
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

      {busy === 'finishing' && remaining !== null && remaining <= 0 && (
        <div role="status" className="bg-brand-tint px-4 py-2.5 text-center text-[16px] font-extrabold text-brand-ink">
          {t('practice.timeUp')}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1480px] min-h-0 flex-1 gap-5 px-3 py-3 sm:px-4 lg:gap-6 lg:px-8 lg:py-4">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-3.5 shadow-card sm:p-6 lg:p-7 flex min-h-0 flex-1 flex-col">
            <QuestionView
              item={current}
              value={value}
              onChange={onChange}
              locked={!!reveal}
              fit
              flag={{ on: !!flags[current.questionId], disabled: busyAny, onToggle: toggleFlag }}
            />
          </div>

          {/* Javob oynasi yopilgach: natija qisqa panelda qoladi, "Javobni ko'rish" qayta ochadi */}
          {reveal && !sheetOpen && (
            <div
              className={`flex shrink-0 items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-2.5 ${
                revealTone === 'ok' ? 'border-success-line bg-success-soft' : revealTone === 'partial' ? 'border-gold-edge bg-warn-soft' : 'border-[#f3c4c8] bg-[#fdecee]'
              }`}
            >
              <p className="min-w-0 flex-1 truncate font-heading text-[19px] font-semibold text-ink">
                {revealTone === 'ok' ? t('practice.correct') : revealTone === 'partial' ? t('practice.partial') : t('practice.wrong')}
              </p>
              <Button variant="secondary" size="sm" className="shrink-0" onClick={() => setSheetOpen(true)}>
                {t('practice.viewAnswer')}
              </Button>
            </div>
          )}

          {error && (
            <p role="alert" className="shrink-0 rounded-2xl bg-[#fdecee] px-4 py-3 text-[16px] font-bold text-danger">
              {error}
            </p>
          )}
        </main>

        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="flex h-full flex-col gap-[clamp(6px,1.2dvh,12px)] overflow-y-auto rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-[clamp(10px,1.8dvh,16px)] shadow-card">
            <h2 className="font-heading text-[20px] font-semibold text-ink [@media(max-height:760px)]:hidden">{t('exam.panel')}</h2>
            <Navigator items={navItems} onSelect={(i) => void goTo(i)} />
          </div>
        </aside>
      </div>

      <footer className="z-10 shrink-0 border-t-2 border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_16px_-10px_rgba(38,24,110,0.25)] lg:pb-0">
        <div className="mx-auto flex h-[68px] w-full max-w-[1480px] items-center justify-between gap-2 px-3 sm:px-4 lg:h-[76px] lg:gap-3 lg:px-8">
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 lg:h-14! lg:px-6! lg:text-[19px]!"
            onClick={() => void goTo(index - 1)}
            disabled={index === 0 || busyAny}
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

          {feedback && !reveal ? (
            <Button size="sm" className="shrink-0 lg:h-14! lg:px-6! lg:text-[19px]!" onClick={() => void check()} disabled={!answered || busyAny}>
              {busy === 'checking' ? t('practice.checking') : t('practice.check')}
            </Button>
          ) : isLast ? (
            <Button size="sm" className="shrink-0 lg:h-14! lg:px-6! lg:text-[19px]!" onClick={() => setFinishOpen(true)} disabled={busyAny}>
              {t('practice.finish')}
            </Button>
          ) : (
            <Button size="sm" className="shrink-0 lg:h-14! lg:px-6! lg:text-[19px]!" onClick={() => void goTo(index + 1)} disabled={busyAny} aria-label={t('exam.nextQ')}>
              <span className="hidden sm:inline">{t('practice.next')}</span>
              <ArrowRight />
            </Button>
          )}
        </div>
      </footer>

      <QuestionsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={title} items={navItems} onSelect={(i) => void goTo(i)} />

      <RevealSheet
        open={sheetOpen}
        reveal={reveal}
        correctText={correctText}
        isLast={isLast}
        onClose={() => setSheetOpen(false)}
        onNext={() => {
          setSheetOpen(false);
          if (isLast) setFinishOpen(true);
          else void goTo(index + 1);
        }}
      />

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
