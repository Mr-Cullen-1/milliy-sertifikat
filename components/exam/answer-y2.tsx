'use client';

import { useState } from 'react';
import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import type { Y2Payload } from '@/lib/exam/payload';
import { letterOf, useShortcut } from './keyboard';

interface Props {
  payload: Y2Payload;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

/**
 * Moslashtirish (Y-2). Figma B/"Moslash": chapda bandlar, o'ngda variantlar;
 * bandni tanlang (binafsha), keyin variantni bosing. Har juftlik o'z rangida (yashil emas: yashil "to'g'ri" ma'nosini beradi),
 * band va variant bir xil rangda ko'rinadi. Joy tejash uchun ixcham: javoblar scrollsiz sig'adi.
 */
const PAIRS = [
  { box: 'border-[#38bdf8] bg-[#e8f6fe]', dot: 'bg-[#0ea5e9]' },
  { box: 'border-[#f472b6] bg-[#fdeaf4]', dot: 'bg-[#ec4899]' },
  { box: 'border-[#f5b301] bg-[#fff6d9]', dot: 'bg-[#d99a06]' },
  { box: 'border-[#fb923c] bg-[#ffefe2]', dot: 'bg-[#f97316]' },
  { box: 'border-[#c084fc] bg-[#f6ecff]', dot: 'bg-[#a855f7]' },
  { box: 'border-[#94a3b8] bg-[#eef1f5]', dot: 'bg-[#64748b]' },
] as const;

export function AnswerY2({ payload, value, onChange }: Props) {
  const t = useT();
  const [active, setActive] = useState<string | null>(payload.items.find((i) => !value[i.id])?.id ?? payload.items[0]?.id ?? null);
  const options = Object.entries(payload.options) as [string, string][];
  const itemNumber = new Map(payload.items.map((item, i) => [item.id, i + 1]));

  const pick = (letter: string) => {
    if (!active) return;
    const next = { ...value, [active]: letter };
    onChange(next);
    // Keyingi tanlanmagan bandga o'tamiz.
    const following = payload.items.find((i) => i.id !== active && !next[i.id]);
    if (following) setActive(following.id);
  };

  // Klaviatura: variant harfi (A–F) faol bandga javob beradi
  useShortcut((e) => {
    const letter = letterOf(e);
    if (letter && letter in payload.options) {
      e.preventDefault();
      pick(letter);
    }
  });

  const letters = options.map(([letter]) => letter);

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-5 lg:gap-6">
      <p className="-mb-1 rounded-xl bg-accent-soft px-3 py-1.5 text-[12px] leading-4 font-bold text-accent sm:px-3.5 sm:py-2 sm:text-[14px] sm:leading-5 md:col-span-2">
        {t('answers.hintY2', { from: letters[0] ?? 'A', to: letters[letters.length - 1] ?? 'F' })}
      </p>
      <div className="flex flex-col gap-1.5 sm:gap-2.5">
        <p className="text-[13px] font-extrabold text-muted sm:text-[15px]">{t('answers.items')}</p>
        {payload.items.map((item, i) => {
          const chosen = value[item.id];
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(item.id)}
              className={
                'flex items-center gap-2 rounded-2xl border-2 border-b-[4px] px-3 py-1.5 text-left transition sm:gap-3 sm:border-b-[5px] sm:px-4 sm:py-2.5 ' +
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
                (chosen ? PAIRS[i % PAIRS.length].box : isActive ? 'border-selected bg-accent-soft' : 'border-line bg-white hover:bg-surface') +
                (isActive ? ' ring-[3px] ring-selected/40' : '')
              }
            >
              <span
                className={
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-black sm:size-7 sm:text-[14px] ' +
                  (chosen ? `${PAIRS[i % PAIRS.length].dot} text-white` : 'bg-track text-muted')
                }
              >
                {i + 1}
              </span>
              <span className="-my-2 min-w-0 flex-1 overflow-x-auto overflow-y-hidden py-2 text-[16px] font-bold text-ink sm:text-[18px]">
                <Markdown inline>{item.text_md}</Markdown>
              </span>
              {chosen && (
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white sm:size-7 sm:text-[14px] ${PAIRS[i % PAIRS.length].dot}`}>
                  {chosen}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5 sm:gap-2.5">
        <p className="text-[13px] font-extrabold sm:text-[15px]">
          <span className="text-muted">{t('answers.variants')}</span>
          {active && <span className="text-accent"> · {t('answers.chooseFor', { n: itemNumber.get(active) ?? 0 })}</span>}
        </p>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 md:grid-cols-2">
          {options.map(([letter, text]) => {
            const matchedBy = payload.items.filter((i) => value[i.id] === letter);
            const firstIdx = matchedBy.length > 0 ? payload.items.findIndex((i) => i.id === matchedBy[0].id) : -1;
            const forActive = !!active && value[active] === letter;
            return (
              <button
                key={letter}
                type="button"
                aria-pressed={forActive}
                onClick={() => pick(letter)}
                className={
                  'flex items-center gap-1.5 rounded-2xl border-2 border-b-[4px] px-2 py-1.5 text-left transition sm:gap-3 sm:border-b-[5px] sm:px-4 sm:py-2.5 ' +
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
                  (firstIdx >= 0 ? PAIRS[firstIdx % PAIRS.length].box : 'border-line bg-white hover:bg-surface')
                }
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-track text-[13px] font-black text-muted sm:size-7 sm:text-[14px]">{letter}</span>
                <span className="-my-2 min-w-0 flex-1 overflow-x-auto overflow-y-hidden py-2 text-[15px] font-bold text-ink sm:text-[17px]">
                  <Markdown inline>{text}</Markdown>
                </span>
                {matchedBy.map((m) => (
                  <span
                    key={m.id}
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white sm:size-7 sm:text-[14px] ${PAIRS[(itemNumber.get(m.id) ?? 1) - 1 >= 0 ? ((itemNumber.get(m.id) ?? 1) - 1) % PAIRS.length : 0].dot}`}
                  >
                    {itemNumber.get(m.id)}
                  </span>
                ))}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
