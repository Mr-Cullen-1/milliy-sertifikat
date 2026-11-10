'use client';

import { useActionState, useState } from 'react';
import { startPracticeAction, type StartPracticeState } from '@/app/practice/actions';
import { useT } from '@/components/i18n/provider';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_PRACTICE_COUNT,
  PRACTICE_COUNTS,
  PRACTICE_DIFFICULTIES,
  PRACTICE_MODES,
  type PracticeDifficulty,
  type PracticeMode,
} from '@/lib/practice/config';

export interface SetupBlock {
  code: string;
  label: string;
  /** mavjud mashq savollari: barchasi va qiyinlik bo'yicha */
  counts: Record<PracticeDifficulty, number>;
}

const optionBase =
  'flex flex-col gap-0.5 rounded-2xl border-2 border-b-[5px] px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45';
const optionState = (on: boolean) => (on ? 'border-selected bg-accent-soft' : 'border-line bg-white hover:bg-surface');

/** Mashqni sozlash: bo'lim, qiyinlik, rejim, savollar soni. Mavjud savollar soni tanlovga qarab ko'rsatiladi. */
export function PracticeSetup({ blocks }: { blocks: SetupBlock[] }) {
  const t = useT();
  const firstWithQuestions = blocks.find((b) => b.counts.all > 0)?.code ?? blocks[0]?.code ?? '';
  const [block, setBlock] = useState(firstWithQuestions);
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>('all');
  const [mode, setMode] = useState<PracticeMode>('practice');
  const [count, setCount] = useState<number>(DEFAULT_PRACTICE_COUNT);
  const [state, action, pending] = useActionState<StartPracticeState, FormData>(startPracticeAction, {});

  const selected = blocks.find((b) => b.code === block);
  const available = selected?.counts[difficulty] ?? 0;
  const diffLabel: Record<PracticeDifficulty, string> = { all: t('practice.diffAll'), L1: t('practice.diffL1'), L2: t('practice.diffL2'), L3: t('practice.diffL3') };
  const modeLabel: Record<PracticeMode, [string, string]> = {
    practice: [t('practice.modePractice'), t('practice.modePracticeHint')],
    timed: [t('practice.modeTimed'), t('practice.modeTimedHint')],
    exam: [t('practice.modeExam'), t('practice.modeExamHint')],
  };
  const errText = state.error
    ? { none: t('practice.errNone'), tooMany: t('practice.errTooMany'), invalid: t('practice.errInvalid'), generic: t('practice.errGeneric') }[state.error]
    : null;

  return (
    <form action={action} className="flex flex-col gap-6 rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-5 shadow-card sm:p-7">
      <input type="hidden" name="block" value={block} />
      <input type="hidden" name="difficulty" value={difficulty} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="count" value={count} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-heading text-[20px] font-semibold text-ink">{t('practice.block')}</legend>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((b) => (
            <button
              key={b.code}
              type="button"
              aria-pressed={block === b.code}
              disabled={b.counts.all === 0}
              onClick={() => setBlock(b.code)}
              className={`${optionBase} ${optionState(block === b.code)}`}
            >
              <span className="text-[16px] leading-5 font-extrabold text-ink">{b.label}</span>
              <span className="text-[13px] font-bold text-muted">{t('practice.available', { n: b.counts.all })}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-heading text-[20px] font-semibold text-ink">{t('practice.difficulty')}</legend>
        <div className="flex flex-wrap gap-2.5">
          {PRACTICE_DIFFICULTIES.map((d) => {
            const n = selected?.counts[d] ?? 0;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={difficulty === d}
                disabled={n === 0}
                onClick={() => setDifficulty(d)}
                className={`${optionBase} min-w-[110px] ${optionState(difficulty === d)}`}
              >
                <span className="text-[16px] font-extrabold text-ink">{diffLabel[d]}</span>
                <span className="text-[13px] font-bold text-muted">{n}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-heading text-[20px] font-semibold text-ink">{t('practice.mode')}</legend>
        <div className="grid gap-2.5 md:grid-cols-3">
          {PRACTICE_MODES.map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`${optionBase} ${optionState(mode === m)}`}>
              <span className="text-[16px] font-extrabold text-ink">{modeLabel[m][0]}</span>
              <span className="text-[13px] leading-4 font-bold text-muted">{modeLabel[m][1]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-heading text-[20px] font-semibold text-ink">{t('practice.count')}</legend>
        <div className="flex flex-wrap gap-2.5">
          {PRACTICE_COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={count === c}
              onClick={() => setCount(c)}
              className={`${optionBase} min-w-[64px] items-center ${optionState(count === c)}`}
            >
              <span className="text-[18px] font-extrabold text-ink">{c}</span>
            </button>
          ))}
        </div>
        {available > 0 && available < count && <p className="text-[14px] font-bold text-brand-ink">{t('practice.notEnough', { n: available })}</p>}
      </fieldset>

      {errText && (
        <p role="alert" className="rounded-2xl bg-[#fdecee] px-4 py-3 text-[16px] font-bold text-danger">
          {errText}
        </p>
      )}

      <Button type="submit" className="w-full sm:w-fit sm:self-end" disabled={pending || available === 0}>
        {t('practice.start')}
      </Button>
    </form>
  );
}
