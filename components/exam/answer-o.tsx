'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import { sanitizeOpenInput } from '@/lib/exam/answer-state';
import { backspaceAt, insertAt, type InputEdit } from '@/lib/exam/open-input';
import type { OPayload } from '@/lib/exam/payload';

interface Props {
  payload: OPayload;
  value: { a?: string; b?: string };
  onChange: (next: { a?: string; b?: string }) => void;
}

// Sensorli ekranda (telefon/planshet) tizim klaviaturasi o'rniga ekran tugmalari: 0–9, vergul, kasr chizig'i, minus.
const subscribeCoarse = (cb: () => void) => {
  const mq = window.matchMedia('(pointer: coarse)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const isCoarse = () => window.matchMedia('(pointer: coarse)').matches;

const KEYS: { label: string; char: string; span?: string }[] = [
  { label: '7', char: '7' },
  { label: '8', char: '8' },
  { label: '9', char: '9' },
  { label: '⌫', char: '' },
  { label: '4', char: '4' },
  { label: '5', char: '5' },
  { label: '6', char: '6' },
  { label: '−', char: '-' },
  { label: '1', char: '1' },
  { label: '2', char: '2' },
  { label: '3', char: '3' },
  { label: '/', char: '/' },
  { label: '0', char: '0', span: 'col-span-2' },
  { label: ',', char: ',', span: 'col-span-2' },
];

/**
 * Ochiq javob (O): a va/yoki b bandi; faqat son, kasr (3/4), minus, vergul yoki nuqta.
 * Ikki band yonma-yon bir xil kartalarda; javob formati qoidasi ikkalasiga tegishli ekani ustida, kartalar bilan birga ko'rsatiladi.
 * Ixcham: har qanday ekranda scrollsiz sig'adi (FitZoom). Sensorli ekranda band ostida ekran klaviaturasi (fokusdagi bandga yozadi).
 */
export function AnswerO({ payload, value, onChange }: Props) {
  const t = useT();
  const parts = (['a', 'b'] as const).flatMap((key) => {
    const part = payload.parts[key];
    return part ? [{ key, part }] : [];
  });
  const coarse = useSyncExternalStore(subscribeCoarse, isCoarse, () => false);
  const inputs = useRef<Partial<Record<'a' | 'b', HTMLInputElement | null>>>({});
  const [focused, setFocused] = useState<'a' | 'b'>(parts[0]?.key ?? 'a');

  const press = (edit: (text: string, start: number, end: number) => InputEdit) => {
    const key = parts.some((p) => p.key === focused) ? focused : parts[0]?.key;
    if (!key) return;
    const el = inputs.current[key];
    const current = value[key] ?? '';
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? start;
    const next = edit(current, start, end);
    const clean = sanitizeOpenInput(next.text);
    onChange({ ...value, [key]: clean });
    const caret = Math.min(next.caret, clean.length);
    requestAnimationFrame(() => {
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-1.5 text-[12px] leading-4 font-bold text-accent sm:px-3.5 sm:py-2 sm:text-[15px] sm:leading-normal">
        <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-black text-white">
          i
        </span>
        {t('answers.openRule')}
      </p>

      <div className={`grid gap-2 sm:gap-3 ${parts.length > 1 ? 'grid-cols-2 md:gap-4' : 'md:max-w-[560px]'}`}>
        {parts.map(({ key, part }) => (
          <div key={key} className="flex min-w-0 flex-col gap-1.5 rounded-2xl border-2 border-b-[4px] border-line bg-surface p-2.5 sm:gap-2 sm:border-b-[5px] sm:p-3.5">
            <label htmlFor={`open-${key}`} className="flex flex-col gap-0.5 text-[15px] leading-5 font-bold text-ink sm:gap-1 sm:text-[18px] sm:leading-6">
              {parts.length > 1 && <span className="text-[12px] font-extrabold text-accent sm:text-[14px]">{t('answers.part', { part: key })}</span>}
              <Markdown>{part.prompt_md}</Markdown>
            </label>
            <input
              id={`open-${key}`}
              ref={(el) => {
                inputs.current[key] = el;
              }}
              type="text"
              inputMode={coarse ? 'none' : 'text'}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={t('answers.placeholder')}
              value={value[key] ?? ''}
              onFocus={() => setFocused(key)}
              onChange={(e) => onChange({ ...value, [key]: sanitizeOpenInput(e.target.value) })}
              className="w-full min-w-0 rounded-xl border-2 border-b-[4px] border-line bg-white px-2.5 py-1.5 text-[18px] font-black sm:rounded-2xl sm:border-b-[5px] sm:px-4 sm:py-2.5 sm:text-[21px] text-ink outline-none placeholder:font-semibold placeholder:text-faint focus:border-selected"
            />
            {part.hint && <p className="text-[12px] leading-4 font-semibold text-muted sm:text-[14px] sm:leading-5">{part.hint}</p>}
          </div>
        ))}
      </div>

      {coarse && (
        // Ekran klaviaturasi javob bloki ichida (kartaga sig'adi; blok sig'masa butun blok bir tekis kichrayadi, sahifa aylanmaydi)
        <div role="group" aria-label={t('answers.keypadAria')} className="mx-auto grid w-full max-w-[420px] grid-cols-4 gap-1 sm:gap-1.5">
          {KEYS.map((k) => {
            const backspace = k.char === '';
            return (
              <button
                key={k.label}
                type="button"
                // Fokus maydonda qoladi (ekran klaviaturasi tizim klaviaturasini ochmaydi, kursor yo'qolmaydi)
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => press(backspace ? backspaceAt : (text, s, e) => insertAt(text, s, e, k.char))}
                aria-label={backspace ? t('answers.backspace') : undefined}
                className={`${k.span ?? ''} h-10 rounded-xl border-2 border-b-4 border-line-strong bg-white text-[20px] font-extrabold text-ink transition active:translate-y-px active:border-b-2 active:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-11 sm:text-[22px] lg:h-10 lg:text-[20px]`}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
