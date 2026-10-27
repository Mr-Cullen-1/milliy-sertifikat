'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLanguageAction } from '@/app/language-actions';
import { LANGS, LANG_LABELS, type Lang } from '@/lib/i18n/config';
import { useLang, useT } from './provider';

/** Til almashtirgich (4 til). Tanlanganda sahifa yangi til bilan qayta yuklanadi (holat saqlanadi). */
export function LangSwitcher({ className = '' }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  const change = (next: Lang) => {
    if (next === lang) return;
    start(async () => {
      await setLanguageAction(next);
      router.refresh();
    });
  };

  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <span className="sr-only">{t('lang.label')}</span>
      <select
        value={lang}
        disabled={pending}
        onChange={(e) => change(e.target.value as Lang)}
        className="h-10 rounded-xl border-2 border-line bg-white px-2.5 text-[15px] font-extrabold text-ink outline-none focus-visible:border-selected disabled:opacity-60"
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {LANG_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
