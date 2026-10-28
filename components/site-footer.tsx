'use client';

import Link from 'next/link';
import { Art, ArtIcon, MascotBadge } from '@/components/art';
import { useT } from '@/components/i18n/provider';
import { LANGS, LANG_LABELS } from '@/lib/i18n/config';

/**
 * Footer. compact: bitta qator (viewportga sig'adigan sahifalar uchun); aks holda to'liq: brend, bo'limlar, ma'lumot.
 * Mascot to'liq footer chegarasida "mo'ralab" turadi.
 */
export function SiteFooter({ year, compact = false }: { year: number; compact?: boolean }) {
  const t = useT();
  const [brand, sub] = t('common.appName').split(' · ');

  if (compact) {
    return (
      <footer className="shrink-0 border-t-2 border-line bg-white">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 text-[14px] font-bold text-muted sm:px-6">
          <span className="flex items-center gap-2">
            <MascotBadge size={26} />
            {t('footer.rights', { year })}
          </span>
          <span className="hidden text-center md:inline">{t('footer.disclaimer')}</span>
          <Link href="/privacy" className="font-extrabold text-accent underline underline-offset-4">
            {t('nav.privacy')}
          </Link>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative mt-10 shrink-0 border-t-2 border-line bg-white">
      <Art name="mascot-waving" width={118} className="absolute -top-[88px] right-6 hidden md:block" />
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="flex max-w-[560px] flex-col gap-3">
          <Link href="/" className="flex w-fit items-center gap-3">
            <MascotBadge size={48} />
            <span className="leading-tight">
              <span className="block font-heading text-[18px] font-semibold text-ink">{brand}</span>
              {sub && <span className="block text-[13px] font-extrabold text-brand-ink">{sub}</span>}
            </span>
          </Link>
          <p className="text-[15px] leading-6 font-semibold text-muted">{t('footer.tagline')}</p>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <p className="flex w-fit items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-[14px] leading-5 font-bold text-brand-ink">
            <ArtIcon name="point" size={20} />
            {t('footer.disclaimer')}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px] font-bold text-muted md:justify-end">
            <Link href="/privacy" className="font-extrabold text-accent underline underline-offset-4">
              {t('nav.privacy')}
            </Link>
            <span>{LANGS.map((l) => LANG_LABELS[l]).join(' · ')}</span>
          </div>
        </div>
      </div>

      <div className="border-t-2 border-line bg-surface">
        <p className="mx-auto w-full max-w-[1280px] px-4 py-3 text-[14px] font-bold text-muted sm:px-6">{t('footer.rights', { year })}</p>
      </div>
    </footer>
  );
}
