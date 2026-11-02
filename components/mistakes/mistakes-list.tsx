'use client';

import { useEffect, useRef, useState } from 'react';
import { FigureImage } from '@/components/exam/figure';
import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import { ProOpenButton, useProModal } from '@/components/pro/pro-modal';
import { Button } from '@/components/ui/button';
import type { Figure } from '@/lib/exam/payload';

export interface MistakeDetail {
  stemMd: string;
  figure: Figure | null;
  lastText: string;
  correct: string | null;
  solutionMd: string | null;
  mistakeNoteMd: string | null;
}

export interface MistakeRow {
  id: string;
  timesText: string;
  topicText: string;
  /** Pro obuna talab qiladi: tafsilot serverda olib tashlanadi (detail = null). */
  locked: boolean;
  detail: MistakeDetail | null;
}

export interface MistakeGroup {
  blockId: number;
  label: string;
  rows: MistakeRow[];
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

const rowBase =
  'flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition sm:px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * Xatolar ro'yxati: bo'lim kartalari ichida qatorlar (chapda necha marta xato, mavzu; o'ngda amal).
 * Ochiq qatorni bosganda tahlil katta oynada ochiladi; yopiq (Pro) qator Pro obuna oynasini ochadi.
 */
export function MistakesList({ groups }: { groups: MistakeGroup[] }) {
  const t = useT();
  const pro = useProModal();
  const flat = groups.flatMap((g) => g.rows.map((r) => ({ ...r, block: g.label })));
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const current = open !== null ? flat[open] : null;
  const detail = current?.detail ?? null;
  const next = open !== null ? flat[open + 1] : undefined;
  const offsets = groups.map((_, gi) => groups.slice(0, gi).reduce((n, g) => n + g.rows.length, 0));

  return (
    <>
      <div className="flex flex-col gap-5">
        {groups.map((g, gi) => (
          <section
            key={g.blockId}
            className="flex flex-col gap-3 rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-4 shadow-card sm:p-5"
            aria-label={g.label}
          >
            <h2 className="flex items-center justify-between gap-3 font-heading text-[20px] font-semibold text-ink">
              <span className="min-w-0">{g.label}</span>
              <span className="shrink-0 rounded-full bg-brand-tint px-2.5 py-0.5 text-[14px] font-extrabold text-brand-ink">{g.rows.length}</span>
            </h2>
            <ul className="flex flex-col gap-2.5">
              {g.rows.map((r, ri) => {
                const index = offsets[gi] + ri;
                const content = (
                  <>
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                      <span className="shrink-0 rounded-full bg-brand-tint px-2.5 py-0.5 text-[14px] font-extrabold text-brand-ink">{r.timesText}</span>
                      <span className="min-w-0 text-[16px] leading-6 font-bold text-ink">
                        {t('mistakes.topic')}: {r.topicText}
                      </span>
                    </span>
                    <span
                      className={
                        'flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-white ' +
                        (r.locked ? 'border-line text-muted' : 'border-line-strong text-ink')
                      }
                      aria-hidden
                    >
                      {r.locked ? <LockIcon /> : <ChevronIcon />}
                    </span>
                  </>
                );
                return (
                  <li key={r.id}>
                    {r.locked ? (
                      <ProOpenButton
                        aria-label={`${r.topicText}: ${t('pro.cardButton')}`}
                        aria-disabled="true"
                        className={`${rowBase} cursor-pointer border-line bg-surface hover:bg-white`}
                      >
                        {content}
                      </ProOpenButton>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpen(index)}
                        aria-label={`${r.topicText}: ${t('mistakes.view')}`}
                        className={`${rowBase} border-line bg-surface hover:border-line-strong hover:bg-white`}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <dialog
        ref={ref}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(null);
        }}
        aria-labelledby="mistake-title"
        className="m-auto h-[min(92dvh,max(70dvh,520px))] w-[min(94vw,max(70vw,720px))] rounded-3xl border-2 border-b-[6px] border-line-strong bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40 backdrop:backdrop-blur-md"
      >
        {current && detail && open !== null && (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b-2 border-line px-5 py-4 sm:px-7">
              <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[14px] font-extrabold text-brand-ink">{current.timesText}</span>
              <div className="min-w-0 flex-1 leading-tight">
                <p id="mistake-title" className="text-[18px] font-extrabold text-ink">
                  {t('mistakes.topic')}: {current.topicText}
                </p>
                <p className="truncate text-[14px] font-bold text-muted">{current.block}</p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-7">
              <Markdown className="text-[20px] font-bold text-ink">{detail.stemMd}</Markdown>
              {detail.figure && <FigureImage figure={detail.figure} />}
              <p className="text-[16px] font-bold text-muted">
                {t('mistakes.lastAnswer')}: <span className="font-extrabold text-danger">{detail.lastText}</span>
              </p>
              {detail.correct && (
                <p className="text-[16px] font-bold text-muted">
                  {t('mistakes.correct')}: <span className="font-extrabold text-success-ink">{detail.correct}</span>
                </p>
              )}
              {detail.solutionMd && (
                <div className="rounded-2xl bg-brand-tint p-4 sm:p-5">
                  <p className="mb-1.5 text-[15px] font-extrabold text-brand-ink">{t('mistakes.solution')}</p>
                  <Markdown className="text-[17px] font-semibold text-ink">{detail.solutionMd}</Markdown>
                </div>
              )}
              {detail.mistakeNoteMd && (
                <div className="rounded-2xl bg-accent-soft p-4 sm:p-5">
                  <p className="mb-1.5 text-[15px] font-extrabold text-accent">{t('mistakes.mistake')}</p>
                  <Markdown className="text-[17px] font-semibold text-ink">{detail.mistakeNoteMd}</Markdown>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t-2 border-line px-5 py-3.5 sm:px-7">
              <Button variant="secondary" size="sm" onClick={() => setOpen(open - 1)} disabled={open === 0}>
                {t('common.back')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setOpen(null)}>
                {t('common.close')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (next?.locked) {
                    setOpen(null);
                    pro.open();
                  } else setOpen(open + 1);
                }}
                disabled={!next}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
