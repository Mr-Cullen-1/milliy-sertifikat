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
 * Ixcham: katta ekranda scrollsiz sig'adi. Sensorli ekranda pastda ekran klaviaturasi (fokusdagi bandga yozadi).
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
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-3.5 py-2 text-[15px] font-bold text-accent">
        <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-black text-white">
          i
        </span>
        {t('answers.openRule')}
      </p>

      <div className={`grid gap-3 ${parts.length > 1 ? 'md:grid-cols-2 md:gap-4' : 'md:max-w-[560px]'}`}>
        {parts.map(({ key, part }) => (
          <div key={key} className="flex flex-col gap-2 rounded-2xl border-2 border-b-[5px] border-line bg-surface p-3.5">
            <label htmlFor={`open-${key}`} className="flex flex-col gap-1 text-[18px] leading-6 font-bold text-ink">
              {parts.length > 1 && <span className="text-[14px] font-extrabold text-accent">{t('answers.part', { part: key })}</span>}
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
              className="w-full scroll-mb-[240px] rounded-2xl border-2 border-b-[5px] border-line bg-white px-4 py-2.5 text-[21px] font-black text-ink outline-none placeholder:font-semibold placeholder:text-faint focus:border-selected"
            />
            {part.hint && <p className="text-[14px] leading-5 font-semibold text-muted">{part.hint}</p>}
          </div>
        ))}
      </div>

      {coarse && (
        <>
          {/* Telefonda klaviatura pastki panel ustida doim ko'rinib turadi (scroll kerak emas); ostidagi bo'sh joy kontentni uning ustiga chiqarish uchun */}
          <div aria-hidden className="h-[216px] lg:hidden" />
          <div
            role="group"
            aria-label={t('answers.keypadAria')}
            className="fixed inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom))] z-10 border-t-2 border-line bg-white px-3 py-2 shadow-[0_-6px_16px_-10px_rgba(38,24,110,0.25)] lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
          >
            <div className="mx-auto grid w-full max-w-[420px] grid-cols-4 gap-1.5 lg:gap-2">
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
                    className={`${k.span ?? ''} h-11 rounded-xl border-2 border-b-4 border-line-strong bg-white text-[22px] font-extrabold text-ink transition active:translate-y-px active:border-b-2 active:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:h-12`}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
