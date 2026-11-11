'use client';

import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import type { Y1Payload } from '@/lib/exam/payload';
import { letterOf, useShortcut } from './keyboard';

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

  // Klaviatura: A–D tugmalari javob beradi
  useShortcut((e) => {
    const letter = letterOf(e);
    if (letter && (LETTERS as readonly string[]).includes(letter)) {
      e.preventDefault();
      onChange(letter);
    }
  });

  return (
    <div role="radiogroup" aria-label={t('answers.options')} className="grid grid-cols-2 gap-2 sm:gap-3">
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
              'flex items-center gap-2 rounded-2xl border-2 border-b-[4px] px-2.5 py-2.5 text-left text-[16px] font-bold text-ink transition sm:gap-4 sm:border-b-[5px] sm:px-4 sm:py-4 sm:text-[19px] ' +
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-[2px] active:border-b-[3px] ' +
              (active ? 'border-selected bg-accent-soft' : 'border-line bg-white hover:bg-surface')
            }
          >
            <span
              className={
                'flex size-7 shrink-0 items-center justify-center rounded-full text-[14px] font-black sm:size-9 sm:text-[17px] ' +
                (active ? 'bg-selected text-white' : 'bg-track text-muted')
              }
            >
              {letter}
            </span>
            <span className="-my-2 min-w-0 flex-1 overflow-x-auto overflow-y-hidden py-2">
              <Markdown inline>{payload.options[letter]}</Markdown>
            </span>
          </button>
        );
      })}
    </div>
  );
}
