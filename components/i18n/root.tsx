import type { ReactNode } from 'react';
import { getI18n } from '@/lib/i18n/server';
import { I18nProvider } from './provider';

/** Cookie'dagi tilni o'qib, butun ilovaga kontekst beradi (<Suspense> ichida ishlatiladi). */
export async function I18nRoot({ children }: { children: ReactNode }) {
  const { lang, dict } = await getI18n();
  return (
    <I18nProvider lang={lang} dict={dict}>
      {children}
    </I18nProvider>
  );
}
