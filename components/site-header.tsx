'use client';

import Link from 'next/link';
import { LangSwitcher } from '@/components/i18n/lang-switcher';
import { useT } from '@/components/i18n/provider';

/** Imtihondan tashqari barcha sahifalar uchun umumiy sarlavha: nom, bo'limlar, til almashtirgich. */
export function SiteHeader({ minimal = false, active }: { minimal?: boolean; active?: 'exams' | 'history' | 'mistakes' | 'dtm' }) {
  const t = useT();
  const links = [
    { key: 'exams', href: '/exams', label: t('nav.exams') },
    { key: 'history', href: '/history', label: t('nav.history') },
    { key: 'mistakes', href: '/mistakes', label: t('nav.mistakes') },
    { key: 'dtm', href: '/dtm', label: t('nav.dtm') },
  ] as const;

  return (
    <header className="shrink-0 border-b-2 border-line bg-white">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
        <Link href="/" className="font-heading text-[18px] font-semibold text-ink">
          {t('common.appName')}
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {!minimal && (
            <nav aria-label="Menu" className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {links.map((l) => (
                <Link
                  key={l.key}
                  href={l.href}
                  aria-current={active === l.key ? 'page' : undefined}
                  className={'text-[16px] font-extrabold ' + (active === l.key ? 'text-brand-ink' : 'text-muted hover:text-ink')}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
          <LangSwitcher />
        </div>
      </div>
    </header>
  );
}
