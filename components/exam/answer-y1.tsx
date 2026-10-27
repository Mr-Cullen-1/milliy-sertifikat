'use client';

import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import type { Y1Payload } from '@/lib/exam/payload';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

interface Props {
  payload: Y1Payload;
  value: string | undefined;
  onChange: (letter: string) => void;
}

/** Yopiq test (Y-1): bitta to'g'ri javob. Figma B: Choice kartalari. */
export function AnswerY1({ payload, value, onChange }: Props) {
  const t = useT();
  const selected = value?.toUpperCase();
  return (
    <div role="radiogroup" aria-label={t('answers.options')} className="grid gap-3 sm:grid-cols-2">
      {LETTERS.map((letter) => {
        const active = selected === letter;
        return (
          <button
            key={letter}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(letter)}
            className={
              'flex items-center gap-4 rounded-2xl border-2 border-b-[5px] px-4 py-4 text-left text-[19px] font-bold text-ink transition ' +
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-[2px] active:border-b-[3px] ' +
              (active ? 'border-selected bg-accent-soft' : 'border-line bg-white hover:bg-surface')
            }
          >
            <span
              className={
                'flex size-9 shrink-0 items-center justify-center rounded-full text-[17px] font-black ' +
                (active ? 'bg-selected text-white' : 'bg-track text-muted')
              }
            >
              {letter}
            </span>
            <span className="min-w-0 flex-1 overflow-x-auto">
              <Markdown inline>{payload.options[letter]}</Markdown>
            </span>
          </button>
        );
      })}
    </div>
  );
}
