'use client';

import { useState } from 'react';
import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import type { Y2Payload } from '@/lib/exam/payload';

interface Props {
  payload: Y2Payload;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

/**
 * Moslashtirish (Y-2). Figma B/"Moslash": chapda bandlar, o'ngda variantlar;
 * bandni tanlang (binafsha), keyin variantni bosing (yashil, nishonda juft raqami).
 */
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

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex flex-col gap-3">
        <p className="text-[15px] font-extrabold text-muted">{t('answers.items')}</p>
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
                'flex items-center gap-3 rounded-2xl border-2 border-b-[5px] px-4 py-3.5 text-left transition ' +
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
                (isActive
                  ? 'border-selected bg-accent-soft'
                  : chosen
                    ? 'border-success bg-success-soft'
                    : 'border-line bg-white hover:bg-surface')
              }
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-track text-[14px] font-black text-muted">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 overflow-x-auto text-[19px] font-bold text-ink">
                <Markdown inline>{item.text_md}</Markdown>
              </span>
              {chosen && (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-[14px] font-black text-white">
                  {chosen}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[15px] font-extrabold">
          <span className="text-muted">{t('answers.variants')}</span>
          {active && <span className="text-accent"> · {t('answers.chooseFor', { n: itemNumber.get(active) ?? 0 })}</span>}
        </p>
        {options.map(([letter, text]) => {
          const matchedBy = payload.items.filter((i) => value[i.id] === letter);
          const forActive = !!active && value[active] === letter;
          return (
            <button
              key={letter}
              type="button"
              aria-pressed={forActive}
              onClick={() => pick(letter)}
              className={
                'flex items-center gap-3 rounded-2xl border-2 border-b-[5px] px-4 py-3.5 text-left transition ' +
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
                (matchedBy.length > 0 ? 'border-success bg-success-soft' : 'border-line bg-white hover:bg-surface')
              }
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-track text-[14px] font-black text-muted">
                {letter}
              </span>
              <span className="min-w-0 flex-1 overflow-x-auto text-[17px] font-bold text-ink">
                <Markdown inline>{text}</Markdown>
              </span>
              {matchedBy.map((m) => (
                <span
                  key={m.id}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-[14px] font-black text-white"
                >
                  {itemNumber.get(m.id)}
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
