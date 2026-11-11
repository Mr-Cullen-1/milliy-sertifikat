'use client';

import { useEffect, useRef } from 'react';
import type { PracticeReveal } from '@/app/practice/actions';
import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import { CrownIcon, ProOpenButton } from '@/components/pro/pro-modal';
import { Button, buttonClass } from '@/components/ui/button';
import { ArrowRight, Close } from '@/components/ui/icons';

interface Props {
  open: boolean;
  reveal: PracticeReveal | undefined;
  /** To'g'ri javob matni (aniq kalit); noto'g'ri/qisman javobda ko'rsatiladi */
  correctText: string;
  /** Oxirgi savolda "Yakunlash", aks holda "Keyingi" */
  isLast: boolean;
  onClose: () => void;
  onNext: () => void;
}

type Tone = 'ok' | 'partial' | 'bad';

const toneOf = (r: PracticeReveal): Tone => (r.isCorrect ? 'ok' : r.parts && (r.parts.a || r.parts.b) ? 'partial' : 'bad');

const TONE_BOX: Record<Tone, string> = {
  ok: 'border-success-line bg-success-soft',
  partial: 'border-gold-edge bg-warn-soft',
  bad: 'border-[#f3c4c8] bg-[#fdecee]',
};

/**
 * Mashqda tekshirilgan javob oynasi: tepadan sirpanib tushadi (<dialog>), viewportning ~62% ini egallaydi
 * (to'liq ekran emas: pastda savol ko'rinib turadi). Esc, tashqariga bosish yoki "Yopish" bilan yopiladi;
 * "Keyingi" bir bosishda keyingi savolga o'tkazadi. Uzun yechim oyna ichida aylantiriladi.
 */
export function RevealSheet({ open, reveal, correctText, isLast, onClose, onNext }: Props) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && reveal && !d.open) d.showModal();
    if ((!open || !reveal) && d.open) d.close();
  }, [open, reveal]);

  const tone = reveal ? toneOf(reveal) : 'bad';
  const title = !reveal ? '' : reveal.isCorrect ? t('practice.correct') : tone === 'partial' ? t('practice.partial') : t('practice.wrong');

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="reveal-title"
      className="app-sheet-top flex-col rounded-b-3xl border-x-2 border-b-[5px] border-line-strong bg-white p-0 text-ink shadow-xl open:flex"
    >
      {reveal && (
        <>
          <div className={`flex shrink-0 items-center gap-3 border-b-2 px-4 py-3 sm:px-6 ${TONE_BOX[tone]}`}>
            <h2 id="reveal-title" role="status" aria-live="polite" className="min-w-0 flex-1 font-heading text-[24px] leading-8 font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-line bg-white text-muted transition hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Close width={18} height={18} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-6">
            {!reveal.isCorrect && correctText && (
              <p className="text-[17px] font-bold text-ink-soft">
                {t('result.correctAnswer')}: <span className="font-extrabold text-success-ink">{correctText}</span>
              </p>
            )}
            {reveal.solutionMd && (
              <div className="rounded-2xl bg-surface p-4">
                <p className="mb-1.5 text-[15px] font-extrabold text-brand-ink">{t('result.solution')}</p>
                <Markdown className="text-[17px] font-semibold text-ink">{reveal.solutionMd}</Markdown>
              </div>
            )}
            {reveal.mistakeNoteMd && !reveal.isCorrect && (
              <div className="rounded-2xl bg-surface p-4">
                <p className="mb-1.5 text-[15px] font-extrabold text-accent">{t('result.mistake')}</p>
                <Markdown className="text-[17px] font-semibold text-ink">{reveal.mistakeNoteMd}</Markdown>
              </div>
            )}
            {reveal.solutionLocked && (
              <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[16px] font-bold text-ink-soft">{t('practice.solutionLocked')}</p>
                <ProOpenButton className={buttonClass('accent', 'shrink-0', 'sm')}>
                  <CrownIcon size={18} />
                  {t('pro.cardButton')}
                </ProOpenButton>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t-2 border-line px-4 py-3 sm:px-6">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button size="sm" onClick={onNext} autoFocus>
              <span>{isLast ? t('practice.finish') : t('practice.next')}</span>
              <ArrowRight />
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
