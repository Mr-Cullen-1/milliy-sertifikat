'use client';

import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import { sanitizeOpenInput } from '@/lib/exam/answer-state';
import type { OPayload } from '@/lib/exam/payload';

interface Props {
  payload: OPayload;
  value: { a?: string; b?: string };
  onChange: (next: { a?: string; b?: string }) => void;
}

/**
 * Ochiq javob (O): a va/yoki b bandi; faqat son, kasr (3/4), minus, vergul yoki nuqta.
 * Ikki band yonma-yon bir xil kartalarda; javob formati qoidasi ikkalasiga tegishli ekani ustida, kartalar bilan birga ko'rsatiladi.
 * Ixcham: scrollsiz sig'adi.
 */
export function AnswerO({ payload, value, onChange }: Props) {
  const t = useT();
  const parts = (['a', 'b'] as const).flatMap((key) => {
    const part = payload.parts[key];
    return part ? [{ key, part }] : [];
  });

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
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={t('answers.placeholder')}
              value={value[key] ?? ''}
              onChange={(e) => onChange({ ...value, [key]: sanitizeOpenInput(e.target.value) })}
              className="w-full rounded-2xl border-2 border-b-[5px] border-line bg-white px-4 py-2.5 text-[21px] font-black text-ink outline-none placeholder:font-semibold placeholder:text-faint focus:border-selected"
            />
            {part.hint && <p className="text-[14px] leading-5 font-semibold text-muted">{part.hint}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
