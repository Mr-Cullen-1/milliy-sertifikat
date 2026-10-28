'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArtIcon, MascotBadge } from '@/components/art';
import type { IconName } from '@/components/art-data';
import { LangSwitcher } from '@/components/i18n/lang-switcher';
import { useT } from '@/components/i18n/provider';
import { LogoutButton } from '@/components/logout-button';

type Active = 'exams' | 'history' | 'mistakes' | 'dtm';

/** Umumiy navbar: mascot logotipi, bo'limlar (faol bo'lim ajratib ko'rsatiladi), til almashtirgich, mobil menyu. */
export function SiteHeader({ minimal = false, active, signedIn = false }: { minimal?: boolean; active?: Active; signedIn?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [brand, sub] = t('common.appName').split(' · ');

  const links: { key: Active; href: string; label: string; icon: IconName }[] = [
    { key: 'exams', href: '/exams', label: t('nav.exams'), icon: 'trainer' },
    {
      key: 'history',
      href: '/history',
      label: t('nav.history'),
      icon: 'daily-reset',
    },
    {
      key: 'mistakes',
      href: '/mistakes',
      label: t('nav.mistakes'),
      icon: 'random-questions',
    },
    { key: 'dtm', href: '/dtm', label: t('nav.dtm'), icon: 'coin' },
  ];

  const pill = (isActive: boolean) =>
    'flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-[15px] font-extrabold transition ' +
    (isActive ? 'border-brand-soft bg-brand-tint text-brand-ink' : 'border-transparent text-muted hover:bg-surface hover:text-ink');

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b-2 border-line bg-white/95 shadow-nav backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={t('common.home')}>
          <MascotBadge size={44} />
          <span className="hidden min-w-0 leading-tight min-[480px]:block">
            <span className="block truncate font-heading text-[17px] font-semibold text-ink">{brand}</span>
            {sub && <span className="block truncate text-[13px] font-extrabold text-brand-ink">{sub}</span>}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {!minimal && (
            <nav aria-label={t('nav.menu')} className="hidden items-center gap-1 md:flex">
              {links.map((l) => (
                <Link key={l.key} href={l.href} aria-current={active === l.key ? 'page' : undefined} className={pill(active === l.key)}>
                  <ArtIcon name={l.icon} size={20} />
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
          <LangSwitcher />
          {signedIn && <LogoutButton />}
          {!minimal && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={t('nav.menu')}
              className="flex size-11 items-center justify-center rounded-xl border-2 border-b-4 border-line-strong bg-white text-ink md:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          )}
        </div>
      </div>

      {!minimal && open && (
        <nav id="mobile-menu" aria-label={t('nav.menu')} className="border-t-2 border-line bg-white px-4 py-3 md:hidden">
          <ul className="mx-auto grid max-w-[1280px] gap-2 sm:grid-cols-2">
            {links.map((l) => (
              <li key={l.key}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={active === l.key ? 'page' : undefined}
                  className={pill(active === l.key) + ' w-full border-line bg-surface py-3 text-[17px]'}
                >
                  <ArtIcon name={l.icon} size={26} />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
