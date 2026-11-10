'use client';

import Link from 'next/link';
import { ArtIcon, MascotBadge } from '@/components/art';
import { LangSwitcher } from '@/components/i18n/lang-switcher';
import { useT } from '@/components/i18n/provider';
import { LogoutButton } from '@/components/logout-button';
import { CrownIcon, ProOpenButton } from '@/components/pro/pro-modal';
import { useNavLinks, type NavKey } from './nav-links';

/** Umumiy navbar: mascot logotipi, bo'limlar (faol bo'lim ajratib ko'rsatiladi), til almashtirgich (telefonda bo'limlar pastki panelda: bottom-nav.tsx). */
export function SiteHeader({ minimal = false, active, signedIn = false }: { minimal?: boolean; active?: NavKey; signedIn?: boolean }) {
  const t = useT();
  const [brand, sub] = t('common.appName').split(' · ');

  const links = useNavLinks();

  const pill = (isActive: boolean) =>
    'flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-[15px] font-extrabold transition ' +
    (isActive ? 'border-brand-soft bg-brand-tint text-brand-ink' : 'border-transparent text-muted hover:bg-surface hover:text-ink');

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b-2 border-line bg-white/95 shadow-nav backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={t('common.home')}>
          <MascotBadge size={44} />
          <span className="hidden min-w-0 leading-tight max-md:min-[480px]:block lg:block">
            <span className="block truncate font-heading text-[17px] font-semibold text-ink">{brand}</span>
            {sub && <span className="block truncate text-[13px] font-extrabold text-brand-ink">{sub}</span>}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {!minimal && (
            <nav aria-label={t('nav.menu')} className="hidden items-center gap-1 md:flex">
              {links.map((l) => (
                <Link key={l.key} href={l.href} title={l.label} aria-current={active === l.key ? 'page' : undefined} className={pill(active === l.key)}>
                  <ArtIcon name={l.icon} size={20} />
                  {/* 5 ta bo'lim keng ekranda (xl) matn bilan; kichikroqda faqat faol bo'limning matni qoladi (sig'ish uchun) */}
                  <span className={active === l.key ? '' : 'max-xl:sr-only'}>{l.label}</span>
                </Link>
              ))}
            </nav>
          )}
          <ProOpenButton
            aria-label={t('pro.nav')}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 border-b-4 border-[#3a22a8] bg-linear-to-b from-[#7a5bff] to-accent px-2.5 text-[14px] font-extrabold text-white transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-3.5"
          >
            <CrownIcon size={18} />
            <span className="hidden sm:inline">{t('pro.nav')}</span>
          </ProOpenButton>
          <LangSwitcher />
          {signedIn && <LogoutButton />}
        </div>
      </div>

    </header>
  );
}
