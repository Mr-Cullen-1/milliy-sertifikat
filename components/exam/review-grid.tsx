'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import { Button } from '@/components/ui/button';
import type { Figure } from '@/lib/exam/payload';
import { FigureImage } from './figure';

export type ReviewStatus = 'ok' | 'wrong' | 'empty';

export interface ReviewItem {
  position: number;
  status: ReviewStatus;
  block: string;
  scoreText: string;
  stemMd: string;
  figure: Figure | null;
  given: string;
  partsText: string | null;
  correct: string | null;
  solutionMd: string | null;
  mistakeNoteMd: string | null;
}

const badge: Record<ReviewStatus, string> = { ok: 'bg-success', wrong: 'bg-danger', empty: 'bg-faint' };
const tile: Record<ReviewStatus, string> = {
  ok: 'border-success-line bg-success-soft/60 hover:bg-success-soft',
  wrong: 'border-[#f3c4c8] bg-[#fdecee] hover:bg-[#fbdde0]',
  empty: 'border-line bg-white hover:bg-surface',
};

/**
 * Savollar tahlili: bir xil o'lchamli kartalar to'ri; kartani bosganda yechim oynasi ochiladi (oldingi/keyingi savolga o'tish bilan).
 * Natija (to'g'ri/noto'g'ri/javobsiz) rangi va yorlig'i bilan ko'rinadi.
 */
export function ReviewGrid({ items }: { items: ReviewItem[] }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const statusLabel = (s: ReviewStatus) => (s === 'ok' ? t('result.ok') : s === 'wrong' ? t('result.wrong') : t('result.empty'));
  const item = open !== null ? items[open] : null;

  return (
    <>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
        {items.map((it, i) => (
          <li key={it.position}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className={
                'flex h-[124px] w-full flex-col justify-between sm:h-[112px] rounded-2xl border-2 border-b-[5px] px-3.5 py-3 text-left shadow-card transition ' +
                'hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
                tile[it.status]
              }
            >
              <span className="flex items-center gap-2.5">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[16px] font-black text-white ${badge[it.status]}`}>
                  {it.position}
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-[16px] font-extrabold text-ink">{statusLabel(it.status)}</span>
                  <span className="text-[13px] font-extrabold text-ink-soft">{it.scoreText}</span>
                </span>
              </span>
              <span className="text-[12px] leading-4 font-bold text-muted">{it.block}</span>
            </button>
          </li>
        ))}
      </ol>

      <dialog
        ref={ref}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(null);
        }}
        className="m-auto w-[min(94vw,820px)] rounded-3xl border-2 border-b-[6px] border-line-strong bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        {item && open !== null && (
          <div className="flex max-h-[88dvh] flex-col">
            <div className="flex items-center gap-3 border-b-2 border-line px-5 py-4">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[17px] font-black text-white ${badge[item.status]}`}>
                {item.position}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[18px] font-extrabold text-ink">{statusLabel(item.status)}</p>
                <p className="truncate text-[14px] font-bold text-muted">{item.block}</p>
              </div>
              <span className="text-[17px] font-extrabold text-ink-soft">{item.scoreText}</span>
            </div>

            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-5">
              <Markdown className="text-[19px] font-bold text-ink">{item.stemMd}</Markdown>
              {item.figure && <FigureImage figure={item.figure} />}
              <p className="text-[16px] font-bold text-muted">
                {t('result.yourAnswer')}: <span className="font-extrabold text-ink">{item.given}</span>
                {item.partsText && <span className="ml-3">{item.partsText}</span>}
              </p>
              {item.correct && (
                <p className="text-[16px] font-bold text-muted">
                  {t('result.correctAnswer')}: <span className="font-extrabold text-success-ink">{item.correct}</span>
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

            <div className="flex items-center justify-between gap-3 border-t-2 border-line px-5 py-3.5">
              <Button variant="secondary" size="sm" onClick={() => setOpen(open - 1)} disabled={open === 0}>
                {t('common.back')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setOpen(null)}>
                {t('common.close')}
              </Button>
              <Button size="sm" onClick={() => setOpen(open + 1)} disabled={open === items.length - 1}>
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
