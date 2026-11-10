'use client';

import Link from 'next/link';
import { ArtIcon } from '@/components/art';
import { useT } from '@/components/i18n/provider';
import { useNavLinks, type NavKey } from './nav-links';

/**
 * Telefon uchun pastki navigatsiya paneli (faqat md dan kichik ekranlarda): Imtihonlar, Mashq, Natijalarim, Xatolar daftari, DTM.
 * Imtihon ekranida ko'rsatilmaydi (u PageShell dan foydalanmaydi). Pastki chiziq (safe-area) hisobga olingan.
 */
export function BottomNav({ active }: { active?: NavKey }) {
  const t = useT();
  const links = useNavLinks();
  return (
    <nav
      aria-label={t('nav.menu')}
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_16px_-10px_rgba(38,24,110,0.25)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-[640px] grid-cols-5">
        {links.map((l) => {
          const isActive = active === l.key;
          return (
            <li key={l.key}>
              <Link
                href={l.href}
                aria-current={isActive ? 'page' : undefined}
                className={
                  'flex h-16 flex-col items-center justify-center gap-0.5 px-1 text-center text-[11px] leading-[13px] font-extrabold transition ' +
                  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ' +
                  (isActive ? 'text-brand-ink' : 'text-muted active:bg-surface')
                }
              >
                <span className={'flex h-8 w-12 items-center justify-center rounded-full transition ' + (isActive ? 'bg-brand-tint' : '')}>
                  <ArtIcon name={l.icon} size={24} />
                </span>
                <span className="line-clamp-2 max-w-full">{l.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
