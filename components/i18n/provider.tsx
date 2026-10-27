'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { Lang } from '@/lib/i18n/config';
import type { Dict } from '@/lib/i18n/dictionaries';
import { makeT } from '@/lib/i18n/translate';

interface Ctx {
  lang: Lang;
  dict: Dict;
}

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ lang, dict, children }: Ctx & { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = lang === 'kaa' ? 'kk-Latn' : lang;
  }, [lang]);
  const value = useMemo(() => ({ lang, dict }), [lang, dict]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

function useCtx(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('I18nProvider topilmadi');
  return ctx;
}

export function useT() {
  const { dict } = useCtx();
  return useMemo(() => makeT(dict), [dict]);
}

export const useLang = (): Lang => useCtx().lang;
